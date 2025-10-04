# How to Test Without Primetime Constraints

If the schedule generator is failing or hanging, try disabling primetime constraints temporarily to test if they're causing the issue.

## Quick Fix: Disable Primetime Constraints

Edit `src/utils/scheduleConstraintSolver.ts` line 84-130:

### Option 1: Disable All Primetime Constraints

Change lines 92-127 from:
```typescript
// DEFAULT PRIMETIME CONSTRAINTS (realistic NFL patterns)
primetimeConstraints: {
  mondayNightFootball: {
    enabled: true,  // ← Change to false
    // ...
  },
  thursdayNightFootball: {
    enabled: true,  // ← Change to false
    // ...
  },
  sundayNightFootball: {
    enabled: true,  // ← Change to false
    // ...
  },
  // ...
}
```

To:
```typescript
// DEFAULT PRIMETIME CONSTRAINTS (DISABLED FOR TESTING)
primetimeConstraints: {
  mondayNightFootball: {
    enabled: false,  // ← DISABLED
    // ...
  },
  thursdayNightFootball: {
    enabled: false,  // ← DISABLED
    // ...
  },
  sundayNightFootball: {
    enabled: false,  // ← DISABLED
    // ...
  },
  // ...
}
```

### Option 2: Disable Just in Your Code

When creating the solver, override the constraints:

```typescript
const solver = new ScheduleConstraintSolver(matchups, teams, 18, {
  maxConsecutiveAway: 3,
  maxConsecutiveHome: 3,
  maxGamesPerWeek: 16,
  byeWeekDistribution: 'balanced',
  preventConsecutiveRematches: true,
  // Override primetime constraints
  primetimeConstraints: {
    mondayNightFootball: { enabled: false },
    thursdayNightFootball: { enabled: false },
    sundayNightFootball: { enabled: false },
  }
});
```

## Testing After Change

1. Rebuild the application:
   ```bash
   npm run build
   ```

2. Start the dev server:
   ```bash
   npm run dev
   ```

3. Try to generate a schedule in the UI

4. Check the browser console for:
   - "✅ GLPK found solution with N games"
   - No "❌ GLPK problem is infeasible" errors
   - Solve time under 10 seconds

## What This Tells Us

### If it works without primetime:
- ✅ The bye week constraints are fine
- ⚠️ Primetime constraints are too restrictive
- **Solution:** Use post-processing for primetime games instead of constraints

### If it still fails:
- ⚠️ Other constraints may be incompatible
- Try disabling other constraints one by one:
  1. Set `preventConsecutiveRematches: false`
  2. Comment out `addBalancedWeeklyDistribution()`
  3. Comment out `addInterConferenceConstraints()`

## Post-Processing Alternative (Recommended)

Instead of using constraints for primetime, assign them after scheduling:

```typescript
// 1. Generate base schedule (no primetime constraints)
const solution = await solver.solve();

// 2. Select primetime games from the generated schedule
function assignPrimetimeGames(games: ScheduledGame[]) {
  // For each week, pick interesting matchups for primetime slots
  for (let week = 1; week <= 18; week++) {
    const weekGames = games.filter(g => g.week === week);
    
    // Pick best MNF game (high-profile teams, rivalry, etc.)
    const mnfGame = selectBestMNFGame(weekGames);
    if (mnfGame) mnfGame.primetimeSlot = 'MNF';
    
    // Pick best TNF game
    const tnfGame = selectBestTNFGame(weekGames);
    if (tnfGame) tnfGame.primetimeSlot = 'TNF';
    
    // Pick best SNF game
    const snfGame = selectBestSNFGame(weekGames);
    if (snfGame) snfGame.primetimeSlot = 'SNF';
  }
  
  return games;
}

function selectBestMNFGame(games: ScheduledGame[]) {
  // Prefer: high-profile teams, division rivalries, etc.
  return games.sort((a, b) => {
    const scoreA = getTeamPopularity(a.homeTeam) + getTeamPopularity(a.awayTeam);
    const scoreB = getTeamPopularity(b.homeTeam) + getTeamPopularity(b.awayTeam);
    return scoreB - scoreA;
  })[0];
}
```

This approach:
- ✅ Much faster (no constraint complexity)
- ✅ More flexible (can change primetime selections easily)
- ✅ More realistic (NFL does flex scheduling this way)
- ✅ No feasibility issues

## Further Help

If you're still having issues:
1. Check `CONSTRAINT_SOLVER_INVESTIGATION_REPORT.md` for detailed analysis
2. Look at the browser console logs during schedule generation
3. Check Network tab for any API errors
4. Verify the matchup generation is creating exactly 272 matchups
