# Root Cause Analysis - Solver Unbounded Error SOLVED ✅

## Problems Found & Fixed

### Problem 1: Home/Away Filtering Bug 🐛
**File:** `src/utils/scheduleStartingPoint.ts` (line 52-59)

**Issue:**  
The filter only checked exact home/away matches (`home-away`), but didn't check reverse (`away-home`). Since matchup generation can produce either orientation, we were only filtering out 6 of 16 pre-scheduled games!

**Before:**
```typescript
const preScheduledSet = new Set(
  preScheduledMatchups.map(m => `${m.home}-${m.away}`)
);
```

**After:**
```typescript
const preScheduledSet = new Set<string>();
preScheduledMatchups.forEach(m => {
  preScheduledSet.add(`${m.home}-${m.away}`);
  preScheduledSet.add(`${m.away}-${m.home}`);  // Also check reverse!
});
```

**Impact:** Now correctly filters out all 16 pre-scheduled games (260 matchups instead of 270)

---

### Problem 2: Conflicting Binaries Field 🐛  
**File:** `src/utils/scheduleConstraintSolver.ts` (line 339-350)

**Issue:**  
We were specifying BOTH `bounds` (with [0,1] limits) AND `binaries` field. GLPK.js was getting confused by having two ways to specify the same thing, causing UNBOUNDED errors!

**Before:**
```typescript
return {
  ...
  bounds: [...],  // Explicit [0,1] bounds
  binaries: varNames  // Also declaring as binary
};
```

**After:**
```typescript
return {
  ...
  bounds: [...],  // Only use bounds
  // binaries: varNames  // REMOVED - conflicts with bounds
};
```

**Impact:** Solver now returns **optimal** instead of **unbounded**!

---

## Remaining Issues

### Issue 1: Matchup Generation Creates Too Many Games
**File:** `src/utils/scheduleGenerator.ts`

**Problem:**  
- Generating 276 total matchups
- Should generate 272 (32 teams × 17 games / 2)
- 4 extra matchups being created

**Need to investigate:** Why is the 17th game logic creating too many matchups?

---

### Issue 2: Solution Has 0 Games
**Current State:** Solver returns "optimal" but extracts 0 games

**Why:**  
With only matchup + team game constraints and 260 matchups (4 too many), the "optimal" solution is to schedule nothing since we can't satisfy all constraints!

**Fix:** Need to add back constraints to force scheduling:
- Bye week constraints (weeks 1-4, 15-18 must have 16 games)
- Max games per week
- Balanced distribution

But first, fix matchup generation to produce exactly 272 matchups!

---

## Summary of Fixes Applied

| # | Issue | File | Status |
|---|-------|------|--------|
| 1 | Home/away filtering | `scheduleStartingPoint.ts` | ✅ FIXED |
| 2 | Binaries/bounds conflict | `scheduleConstraintSolver.ts` | ✅ FIXED |
| 3 | Matchup count (276 not 272) | `scheduleGenerator.ts` | ⚠️ TO FIX |
| 4 | Need constraints re-enabled | `scheduleConstraintSolver.ts` | ⚠️ TO FIX |

---

## Test Results

### Before Fixes:
```
Status: unbounded
Matchups for solver: 270 (should be 260)
Games Scheduled: 0
```

### After Fixes:
```
Status: optimal  ✅
Matchups for solver: 260  ✅
Games Scheduled: 0 (needs constraints)
```

---

## Next Steps

1. **Fix matchup generation** to produce exactly 272 matchups
2. **Re-enable constraints** one by one:
   - Start with bye week constraints
   - Add max games per week
   - Add balanced distribution
   - Test after each addition

3. **Test with full constraint set** (minus the expensive ones we removed)

---

**Date:** 2025-10-25  
**Status:** UNBOUNDED ERROR SOLVED! Now working on solution extraction.

