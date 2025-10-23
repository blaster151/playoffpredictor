# NFL Schedule Builder - Requirements

## Overview
A manual, user-driven NFL schedule builder that prevents users from painting themselves into scheduling dead-ends through real-time feasibility checking and look-ahead warnings.

## Core Problem
**Local consistency without global consistency**: Users can satisfy constraints incrementally but the system may become globally unsatisfiable because long-term quotas can't be filled anymore.

### Common Dead-End Scenarios

1. **Rematch Spacing Trap**: Division games scheduled early violate spacing rules later (e.g., same teams face each other within 3 weeks in late season)
2. **Bye Week Conflicts**: Teams run out of legal bye weeks (no byes after week 14, max teams per week)
3. **Home/Away Imbalance**: Teams forced into 5 home games in 6 weeks late season
4. **Inter-Conference Quota**: Can't fit required 4 inter-conference games per team
5. **TV/Prime-Time Rules**: Can't satisfy min/max prime-time appearance requirements

## NFL Scheduling Rules

### Per-Team Constraints
- 17 games per team per season
- 6 division games (3 opponents × 2 games each)
- 4 intra-conference (non-division) games
- 4 inter-conference games
- 3 remaining games (varies by formula)
- Roughly balanced home/away (8-9 each)
- No more than 2 consecutive home or away games (soft)
- 1 bye week between weeks 5-14
- Minimum spacing between rematches (e.g., 3+ weeks)

### Per-Week Constraints
- Fixed number of game slots per week
- Maximum teams on bye per week (typically 2-4)
- Limited prime-time slots (SNF, MNF, TNF)
- Stadium/venue availability

### Global Constraints
- Every team appears on prime-time at least once (min/max rules)
- Balanced conference matchups
- Network TV distribution requirements

## Solution Architecture

### Multi-Stage Feasibility Pipeline

#### Stage A: Cheap Necessary Conditions O(teams + slots)
**Run instantly on each drop**

1. **Capacity Bounds**
   - Total remaining games ≤ total remaining slots
   - Check per week window if needed

2. **Type/Quota Bounds**
   - For each category (DIV, INTRA, INTER):
     - Remaining games needed ≤ remaining capacity

3. **Bye Feasibility**
   - Teams needing byes ≤ available bye slots before cutoff

4. **Home/Away Parity**
   - Remaining home games needed ≤ hostable slots

5. **Prime-Time Coverage**
   - Teams needing night games ≤ remaining night slots

**Result**: Hard fail if any bound violated

#### Stage B: Localized Matching Checks
**Fast graph tests for over-constraints**

1. **Week-Level Bipartite Matching**
   - Graph: game slots ↔ legal team pairings
   - Check if max matching covers all slots
   - Look ahead 2-3 weeks

2. **Team-Pairing Matching**
   - Legal pairings (T, T') for week w
   - Respects rematch spacing, quotas, home/away
   - Edge if pairing fits specific slot

**Result**: Flag if insufficient legal pairings exist

#### Stage C: Flow Model (Global Feasibility)
**Run on risky scenarios**

- Min-cost max-flow: Source → Teams → Weeks → Sink
- Teams have demand (remain.total)
- Weeks have capacity (2 × slots)
- Optional: split into Week-Home/Week-Away nodes
- Optional: add category edges (DIV/INTRA/INTER)

**Result**: If max flow < total remaining → infeasible

#### Stage D: Pairings Reserve Heuristic
**Rolling forecast for divisions and teams**

1. **Division Reserve**
   - Count unplaced intra-division pairings
   - Count legal week windows (respecting minGap)
   - If required > available → warn

2. **Team Reserve**
   - Compute legal opponent windows per team
   - If union < remain.total → boxed in

**Result**: Early warnings about tight windows

#### Stage E: Opportunistic SAT Probe
**Background constraint solver**

- Run every N user actions (e.g., 5 drops)
- Or when yellow warning appears
- Trimmed model: next K weeks or all remaining
- If UNSAT → offer auto-rewind or highlight conflict

**Result**: Definitive feasibility with conflict explanation

### Execution Pipeline (On Each Drop)

1. Update indices (O(1))
2. Stage A bounds → fail fast
3. Stage B matching (current + next 1-2 weeks)
4. Stage D reserves for affected divisions/teams
5. Show banner if yellow risk detected
6. Every few actions: Stage C flow in Web Worker
7. On pause (300-500ms debounce): Stage E mini-SAT

## State Management

### Per-Team State
```typescript
{
  remain: {
    total: number;      // total games left
    div: number;        // division games left
    intra: number;      // intra-conference left
    inter: number;      // inter-conference left
    home: number;       // home games left
    away: number;       // away games left
    bye: 0 | 1;         // needs bye?
  },
  busy: Map<week, GameOrBye>;
  lastMet: Map<TeamId, week>;
  run: {
    home: number;       // consecutive home games
    away: number;       // consecutive away games
  }
}
```

### Per-Week State
```typescript
{
  num: number;
  slots: {
    games: number;          // total game slots
    byTimeslot: Slot[];     // SNF, MNF, TNF, etc.
  },
  byeCapacity: number;
  byesAssigned: number;
  nightSlots: number;
  hostableSlots: number;
}
```

### Global State
```typescript
{
  pairNeed: Map<[T1, T2], {
    count: 0 | 1 | 2;
    type: 'DIV' | 'INTRA' | 'INTER';
  }>;
  unplacedByes: Set<TeamId>;
  rules: {
    byeCutoff: 14;
    minRematchGap: number;
    maxConsecutiveHome: 2;
    maxConsecutiveAway: 2;
  }
}
```

## User Interface

### Two Interaction Modes

#### Mode 1: Week-by-Week ("Season Flow")
**Timeline-based, calendar view**

- Shows one week grid at a time
- All matchups for that week visible
- Sidebar with unassigned teams
- Live feedback per week
- "Next Week →" validates before proceeding
- Puzzle-board feel
- Ideal for: Teaching, collaborative play, watching season emerge

**UI Elements:**
- Week header with week number
- Grid of game slots (by timeslot: SNF, MNF, TNF, Sunday 1pm/4pm)
- Drag-and-drop from team pool
- Constraint indicators (byes, home/away, remaining slots)
- Navigation: Previous/Next Week

#### Mode 2: Team-by-Team ("Franchise Planner")
**Team-focused, roster-builder feel**

- Focus on one team's 17-game season
- Fill home/away, division, non-division opponents
- Constraints within team microcosm
- Reciprocal games auto-sync
- Locked games from other teams shown
- Strategic/immersive
- Ideal for: Logic puzzles, commissioner roleplay

**UI Elements:**
- Team selector
- 17-game calendar for selected team
- Opponent pool (filtered by constraints)
- Home/away toggle per game
- Division/conference indicators
- "Already scheduled" locks

### Feedback System

#### Red (Hard Fail)
"After this move the season becomes impossible to complete. [Reason]. Undo or let assistant auto-fix."

#### Yellow (Tight Constraint)
"Feasible but tight: NFC West needs 3 division games with only 2 legal weeks left due to rematch spacing."

#### Green (Helpful Hint)
"Week 12 still needs 2 inter-conference games. Suggesting CIN–SEA, PIT–LAR as legal fits."

#### Interactive Features
- "Why?" popover with exact numbers (needed vs capacity)
- "Show legal slots" button highlights valid moves
- "Auto-fix" to rewind to last safe point
- UNSAT core explanation when solver fails

### Visual Design
- Modern, clean UI
- Drag-and-drop interactions
- Color-coded constraints (green/yellow/red)
- Team logos and colors
- Animated feedback
- Responsive layout

## Technical Requirements

### Stack
- React (TypeScript)
- State management: Context + Reducer (or Zustand/Recoil)
- Styling: Tailwind CSS or styled-components
- Drag-and-drop: react-dnd or dnd-kit
- Graph algorithms: Custom or graphlib
- Flow algorithms: Custom min-cost flow implementation
- Optional SAT solver: Web Worker with lightweight SAT

### Performance Targets
- Stage A: < 1ms (synchronous)
- Stage B: < 5ms (synchronous)
- Stage C: < 20ms (Web Worker)
- Stage E: < 100ms (Web Worker, debounced)
- UI updates: 60fps during drag

### Data Structures
- Efficient incremental updates
- Adjacency maps for team pairings
- Sparse matrices for week/team assignments
- Indexed lookups (no O(n²) per update)

## Features

### Core
- [x] Drag-and-drop game scheduling
- [x] Real-time constraint validation
- [x] Multi-stage feasibility checking
- [x] Undo/redo support
- [x] Auto-save to localStorage

### Advanced
- [ ] Auto-fix suggestions
- [ ] Conflict visualization
- [ ] UNSAT core highlighting
- [ ] Schedule export (CSV, JSON, iCal)
- [ ] Share/load schedules
- [ ] Historical NFL schedules as templates
- [ ] Constraint relaxation mode (what-if scenarios)

### Polish
- [ ] Onboarding tutorial
- [ ] Constraint explanation tooltips
- [ ] Dark mode
- [ ] Keyboard shortcuts
- [ ] Accessibility (ARIA labels, keyboard navigation)

## Success Metrics
- User can complete a legal 18-week schedule
- Dead-ends caught before week 14
- Average time to catch constraint violation: < 10ms
- User satisfaction: intuitive, prevents frustration
- Educational: users learn NFL scheduling complexity

## Future Enhancements
- AI-assisted completion
- Multiple constraint profiles (realistic vs fantasy)
- Multi-season scheduling
- Playoff bracket integration
- Travel distance optimization
- Stadium event conflicts
- Weather considerations

