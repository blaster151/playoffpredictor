# All Constraints in GLPK Solver - Analysis for Postprocessing

## Current Constraint Count Summary
Based on 256 matchups, 32 teams, 17 weeks (excluding Week 1 pre-scheduled):

| Category | Constraint Method | # Constraints | Complexity | Postprocessing? |
|----------|------------------|---------------|------------|----------------|
| **STEP 1: EQUALITY CONSTRAINTS** | | | | |
| 1 | `addMatchupConstraints` | 256 | Low | ❌ CRITICAL - Must stay |
| 2 | `addTeamGameConstraints` | 32 | Low | ❌ CRITICAL - Must stay |
| **STEP 2: TIGHT BOUNDS** | | | | |
| 3 | `addByeWeekConstraints` | 17 | Low | ⚠️ Could relax to inequality |
| **STEP 3: SIMPLE INEQUALITIES** | | | | |
| 4 | `addTeamWeekConstraints` | 32 × 17 = 544 | Medium | ⚠️ Could remove if no multi-games |
| 5 | `addMaxGamesPerWeekConstraints` | 17 | Low | ⚠️ Could relax |
| 6 | `addInterConferenceConstraints` | 17 | Low | ✅ **GOOD CANDIDATE** |
| **STEP 4: COMPLEX/EXPENSIVE CONSTRAINTS** | | | | |
| 7 | `addConsecutiveConstraints` | ~8,704 | **VERY HIGH** | ✅ **BEST CANDIDATE** |
| 8 | `addSelfMatchupPrevention` | ~0 (rare) | Low | ❌ Keep (simple check) |
| 9 | `addMaxByeTeamsConstraint` | ~512 | High | ✅ **GOOD CANDIDATE** |
| 10 | `addBalancedWeeklyDistribution` | 17 | Low | ✅ **GOOD CANDIDATE** |
| **STEP 5: PRIMETIME** | | | | |
| 11 | Primetime constraints | 0 (disabled) | N/A | ✅ Already in postprocessing |

**TOTAL ESTIMATED CONSTRAINTS: ~10,116**

---

## Detailed Constraint Analysis

### 1. ✅ KEEP: `addMatchupConstraints` (256 constraints)
**Purpose:** Each matchup must be scheduled exactly once  
**Formula:** For each matchup m: `Σ(x_m_w for w=1..18) = 1`  
**Why Keep:** Core constraint - without this, games could be scheduled multiple times or not at all  
**Complexity:** O(matchups × weeks) = 256 × 18 = 4,608 variables per constraint  

---

### 2. ✅ KEEP: `addTeamGameConstraints` (32 constraints)
**Purpose:** Each team plays exactly 17 games total (minus pre-scheduled)  
**Formula:** For each team t: `Σ(x_m_w where team is in matchup m) = 17 - preScheduledGames`  
**Why Keep:** Core constraint - ensures proper season length  
**Complexity:** O(teams × matchups × weeks) = 32 × 256 × 18 = large, but essential  

---

### 3. ⚠️ COULD RELAX: `addByeWeekConstraints` (17 constraints)
**Purpose:** 
- Weeks 1-4 & 15-18: Exactly 16 games (no byes)
- Weeks 5-14: 13-16 games (up to 6 teams on bye)

**Formula:**
```typescript
if (w <= 4 || w >= 15) {
  Σ(x_m_w) = 16  // Exactly 16 games
} else {
  13 ≤ Σ(x_m_w) ≤ 16  // 13-16 games
}
```

**Why It Matters:** NFL rule - no byes in early/late season  
**Postprocessing Alternative:** Remove and check after solving, adjust if needed  
**Recommendation:** ⚠️ Keep for now - NFL-required constraint, relatively cheap  

---

### 4. ⚠️ COULD REMOVE: `addTeamWeekConstraints` (544 constraints)
**Purpose:** Each team plays at most 1 game per week  
**Formula:** For each team t, week w: `Σ(x_m_w where team t in matchup m) ≤ 1`  
**Why It Matters:** Prevents teams from playing multiple games in one week  
**Postprocessing Alternative:** This is already enforced by the matchup constraints - if each matchup is scheduled exactly once and each team has exactly 17 games, it's impossible for a team to play twice in one week  
**Recommendation:** ✅ **REMOVE THIS** - Redundant constraint, costs 544 constraints with no benefit  

---

### 5. ⚠️ COULD RELAX: `addMaxGamesPerWeekConstraints` (17 constraints)
**Purpose:** Max 18 games per week (current setting)  
**Formula:** For each week w: `Σ(x_m_w) ≤ 18`  
**Why It Matters:** Prevents overloading a single week  
**Postprocessing Alternative:** Remove limit entirely, let solver distribute naturally  
**Recommendation:** ⚠️ Could increase to 20 or remove entirely - not critical  

---

### 6. ✅ **REMOVE TO POSTPROCESSING**: `addInterConferenceConstraints` (17 constraints)
**Purpose:** Limit inter-conference games to max 6 per week  
**Formula:** For each week w: `Σ(x_m_w where m is inter-conference) ≤ 6`  
**Why It Matters:** Balanced distribution of inter-conference games  
**Postprocessing Alternative:** Check after solving, swap games between weeks if needed  
**Recommendation:** ✅ **REMOVE** - Nice-to-have, not critical for valid schedule  
**Savings:** 17 constraints  

---

### 7. ✅ **REMOVE TO POSTPROCESSING**: `addConsecutiveConstraints` (~8,704 constraints!)
**Purpose:** Prevent consecutive rematches (e.g., Team A @ Team B in Week 5, Team B @ Team A in Week 6)  
**Formula:** For each reverse pair (m1, m2), each week w:
```typescript
x_m1_w + x_m2_(w+1) ≤ 1  // m1 this week blocks m2 next week
x_m2_w + x_m1_(w+1) ≤ 1  // m2 this week blocks m1 next week
```

**Why It's Expensive:**
- ~128 reverse pairs (half of 256 matchups)
- 17 weeks × 2 directions = 34 constraints per pair
- 128 × 34 = **4,352 constraints**
- With full season: 128 × 68 = **8,704 constraints**

**Postprocessing Alternative:** 
1. Solve without this constraint
2. Find consecutive rematches in solution
3. Swap one game with a non-consecutive week

**Recommendation:** ✅ **REMOVE THIS FIRST** - Massive constraint count, easy postprocessing  
**Savings:** ~8,704 constraints!  

---

### 8. ✅ KEEP: `addSelfMatchupPrevention` (~0 constraints)
**Purpose:** Prevent team from playing itself  
**Formula:** For self-matchups (rare): `x_m_w = 0 for all w`  
**Why Keep:** Should never happen in matchup generation, but good safety check  
**Complexity:** Near-zero (only applies if matchup generation is broken)  

---

### 9. ✅ **REMOVE TO POSTPROCESSING**: `addMaxByeTeamsConstraint` (~512 constraints)
**Purpose:** Maximum 6 teams on bye per week (NFL rule)  
**Formula:** For weeks 5-14, introduce bye variables:
```typescript
bye_t_w + Σ(x_m_w where t in m) = 1  // Team plays OR has bye
Σ(bye_t_w for all teams) ≤ 6  // Max 6 byes per week
```

**Why It's Expensive:**
- Creates 32 new variables per week × 10 weeks = 320 new variables
- Creates 32 linking constraints per week × 10 weeks = 320 constraints
- Creates 10 max-bye constraints
- **Total: 330 constraints + 320 variables**

**Postprocessing Alternative:**
1. Remove this constraint
2. After solving, count bye teams per week
3. If any week has >6 byes, swap games to/from that week

**Recommendation:** ✅ **REMOVE** - Complex constraint, relatively easy postprocessing  
**Savings:** ~512 constraints + 320 variables  

---

### 10. ✅ **REMOVE TO POSTPROCESSING**: `addBalancedWeeklyDistribution` (17 constraints)
**Purpose:** Each week should have ~15 games (with flexibility ±3)  
**Formula:** For each week w: `12 ≤ Σ(x_m_w) ≤ 18`  
**Why It Matters:** Prevents all games clustering in a few weeks  
**Postprocessing Alternative:** Check distribution after solving, swap games if too unbalanced  
**Recommendation:** ✅ **REMOVE** - Nice-to-have, not critical  
**Savings:** 17 constraints  

---

## 🎯 **Recommended Constraint Removal Priority**

### Priority 1: REMOVE IMMEDIATELY (Massive Impact)
```
✅ addConsecutiveConstraints (~8,704 constraints)
   - Move to postprocessing: Find consecutive rematches, swap weeks
   - Expected speedup: 5-10x faster
```

### Priority 2: REMOVE NEXT (Significant Impact)  
```
✅ addMaxByeTeamsConstraint (~512 constraints + 320 variables)
   - Move to postprocessing: Count byes per week, swap games if >6
   - Expected speedup: 2x faster
```

### Priority 3: REMOVE FOR POLISH (Minor Impact)
```
✅ addInterConferenceConstraints (17 constraints)
✅ addBalancedWeeklyDistribution (17 constraints)
✅ addTeamWeekConstraints (544 constraints - actually redundant!)
   - Move to postprocessing or remove entirely
   - Expected speedup: 10-20% faster
```

---

## 🚀 **Implementation Plan**

### Phase 1: Remove `addConsecutiveConstraints`
**File:** `src/utils/scheduleConstraintSolver.ts`  
**Lines to comment out:** 283 (in `createProblem`)  
**New file needed:** `src/utils/postProcessingConstraints.ts`

**Postprocessing function:**
```typescript
export function fixConsecutiveRematches(schedule: ScheduledGame[]): ScheduledGame[] {
  // Find all consecutive rematch pairs
  // For each pair, swap one game to a non-consecutive week
  // Return fixed schedule
}
```

### Phase 2: Remove `addMaxByeTeamsConstraint`
**Lines to comment out:** 285 (in `createProblem`)  

**Postprocessing function:**
```typescript
export function fixByeWeekDistribution(schedule: ScheduledGame[], teams: Team[]): ScheduledGame[] {
  // Count byes per week
  // If any week has >6 byes, move games to/from that week
  // Return fixed schedule
}
```

### Phase 3: Remove Other Constraints
**Lines to comment out:** 280, 286 (in `createProblem`)  

---

## Expected Performance After Removals

| Phase | Constraints Removed | Expected Solve Time | Success Rate |
|-------|---------------------|---------------------|--------------|
| Current | 0 | ∞ (never finishes) | 0% |
| Phase 1 | ~8,704 | 10-30 seconds | 90% |
| Phase 2 | ~9,216 | 5-10 seconds | 95% |
| Phase 3 | ~9,794 | 2-5 seconds | 99% |

---

## Files to Modify

1. **src/utils/scheduleConstraintSolver.ts** - Comment out constraint methods
2. **src/utils/postProcessingConstraints.ts** - NEW - Implement postprocessing fixes
3. **src/pages/index.tsx** - Call postprocessing after solver succeeds

Would you like me to implement Phase 1 (remove consecutive constraints) first?

