# NFL Schedule Builder

A manual, user-driven NFL schedule builder with real-time feasibility checking to prevent scheduling dead-ends.

## Features

### 🎯 Two Build Modes

1. **Week-by-Week ("Season Flow")**
   - Timeline-based calendar view
   - Schedule all games for one week before moving to the next
   - Watch the season emerge naturally
   - Perfect for understanding the season flow

2. **Team-by-Team ("Franchise Planner")**
   - Focus on one team's 17-game season at a time
   - Fill home/away games with automatic reciprocal scheduling
   - Strategic planning for individual franchises
   - Great for roster-style building

### 🚦 Real-Time Constraint Validation

Multi-stage feasibility pipeline catches dead-ends early:

- **Stage A**: Cheap bounds checks (< 1ms)
  - Total capacity
  - Category quotas (DIV/INTRA/INTER)
  - Bye week feasibility
  - Home/away parity
  
- **Stage B**: Week-level matching (< 5ms)
  - Bipartite matching for legal pairings
  - Over-constraint detection
  
- **Stage D**: Division/team reserves
  - Rolling forecast for tight windows
  - Early warnings about spacing conflicts

### 🎨 Modern UI

- Drag-and-drop game scheduling
- Color-coded constraint feedback (🔴 Red = Fail, 🟡 Yellow = Tight, 🟢 Green = Good)
- Team logos and colors
- Undo/redo support
- Real-time feasibility updates

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

Visit `http://localhost:5173` to start building schedules!

## Architecture

### Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development
- **Zustand** for state management
- **Tailwind CSS** for styling
- **dnd-kit** for drag-and-drop (future)

### Project Structure

```
src/
├── components/          # UI components
│   ├── WeekByWeekView.tsx
│   ├── TeamByTeamView.tsx
│   ├── FeasibilityPanel.tsx
│   └── TeamCard.tsx
├── lib/
│   ├── feasibility/     # Constraint checking stages
│   │   ├── stageA.ts    # Cheap bounds
│   │   ├── stageB.ts    # Matching checks
│   │   ├── stageD.ts    # Reserve heuristics
│   │   └── index.ts     # Orchestrator
│   └── state/           # State management
│       ├── initialization.ts
│       └── actions.ts
├── store/               # Zustand store
├── data/                # NFL teams data
└── types/               # TypeScript definitions
```

## How It Works

### The Dead-End Problem

Traditional schedule builders let you satisfy constraints locally but can paint you into a corner:

- **Rematch spacing trap**: Division games too close together late in season
- **Bye week conflicts**: Teams run out of legal bye weeks
- **Home/away imbalance**: Forced into 5 home games in 6 weeks
- **Inter-conference quota**: Can't fit required cross-conference games

### The Solution

Multi-stage feasibility checking runs on every action:

1. **Quick checks** (Stage A) catch capacity violations instantly
2. **Matching algorithms** (Stage B) detect over-constrained weeks
3. **Heuristics** (Stage D) forecast tight division windows
4. **Optional SAT solver** (Stage E - future) proves definitive feasibility

### Visual Feedback

- 🔴 **Red (UNSAT)**: "After this move, season is impossible to complete"
- 🟡 **Yellow (WARNING)**: "Feasible but tight - only 2 legal windows remain"
- 🟢 **Green (SAT)**: "All constraints satisfied"

Each warning includes:
- What's wrong
- Numbers (needed vs. capacity)
- Affected teams/weeks
- Which constraint stage detected it

## NFL Scheduling Rules

The app enforces realistic NFL constraints:

### Per-Team
- 17 games per season
- 6 division games (3 opponents × 2)
- 4 intra-conference games
- 4 inter-conference games
- ~8-9 home/away split
- Max 2 consecutive home/away games
- 1 bye week (weeks 5-14)
- Minimum rematch spacing

### Per-Week
- 16 games per week (32 teams / 2)
- Max 6 teams on bye
- Limited prime-time slots
- Stadium availability

## Roadmap

- [ ] Drag-and-drop interface
- [ ] Auto-fix suggestions
- [ ] UNSAT core visualization
- [ ] Schedule export (CSV/JSON/iCal)
- [ ] Historical NFL schedule templates
- [ ] Stage C (flow model)
- [ ] Stage E (SAT solver)
- [ ] Constraint relaxation mode
- [ ] Dark mode

## Development

```bash
# Run linter
npm run lint

# Type check
npx tsc --noEmit

# Build
npm run build

# Preview production build
npm run preview
```

## Contributing

This is a prototype demonstrating advanced constraint satisfaction for scheduling. Contributions welcome!

## License

MIT

## Acknowledgments

Built to solve the "local consistency without global consistency" problem in manual schedule building. Inspired by constraint satisfaction problems (CSP) and backtracking algorithms used in professional sports league scheduling.

