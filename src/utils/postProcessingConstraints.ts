import { ScheduledGame } from './scheduleConstraintSolver';
import { Team } from '../types/nfl';

/**
 * Fix consecutive rematches in the schedule
 * 
 * A consecutive rematch is when the same two teams play each other in consecutive weeks
 * (e.g., Team A @ Team B in Week 5, Team B @ Team A in Week 6)
 * 
 * This function finds all consecutive rematches and swaps one of the games to a different week.
 * It respects pre-scheduled weeks and will never modify games in those weeks.
 * 
 * @param schedule - The schedule to fix
 * @param teams - List of all teams
 * @param preScheduledWeeks - Set of weeks that are pre-scheduled and should not be modified
 * @returns Fixed schedule with no consecutive rematches
 */
export function fixConsecutiveRematches(
  schedule: ScheduledGame[],
  teams: Team[],
  preScheduledWeeks: Set<number> = new Set()
): ScheduledGame[] {
  console.log('🔧 Postprocessing: Fixing consecutive rematches...');
  console.log(`  - Pre-scheduled weeks to protect: ${Array.from(preScheduledWeeks).join(', ') || 'none'}`);
  
  // Create a working copy of the schedule
  const fixedSchedule = [...schedule];
  
  // Group games by week for easy lookup
  const gamesByWeek = new Map<number, ScheduledGame[]>();
  for (const game of fixedSchedule) {
    if (!gamesByWeek.has(game.week)) {
      gamesByWeek.set(game.week, []);
    }
    gamesByWeek.get(game.week)!.push(game);
  }
  
  // Find all consecutive rematches
  let rematchesFound = 0;
  let rematchesFixed = 0;
  const maxIterations = 100; // Prevent infinite loops
  let iteration = 0;
  
  while (iteration < maxIterations) {
    iteration++;
    const rematches: Array<{ week1: number; game1: ScheduledGame; week2: number; game2: ScheduledGame }> = [];
    
    // Check each week for rematches with the next week
    const sortedWeeks = Array.from(gamesByWeek.keys()).sort((a, b) => a - b);
    
    for (let i = 0; i < sortedWeeks.length - 1; i++) {
      const week1 = sortedWeeks[i];
      const week2 = sortedWeeks[i + 1];
      
      // Skip if week2 is not consecutive (shouldn't happen, but safety check)
      if (week2 !== week1 + 1) continue;
      
      const games1 = gamesByWeek.get(week1) || [];
      const games2 = gamesByWeek.get(week2) || [];
      
      // Check for rematches between these two weeks
      for (const game1 of games1) {
        for (const game2 of games2) {
          // Check if these games involve the same two teams
          const teams1 = new Set([game1.homeTeam, game1.awayTeam]);
          const teams2 = new Set([game2.homeTeam, game2.awayTeam]);
          
          if (teams1.has(game2.homeTeam) && teams1.has(game2.awayTeam)) {
            // Found a consecutive rematch!
            rematches.push({ week1, game1, week2, game2 });
            rematchesFound++;
          }
        }
      }
    }
    
    if (rematches.length === 0) {
      // No more rematches found, we're done!
      break;
    }
    
    console.log(`  - Iteration ${iteration}: Found ${rematches.length} consecutive rematch(es)`);
    
    // Fix the first rematch found
    const rematch = rematches[0];
    const { week1, game1, week2, game2 } = rematch;
    
    console.log(`    ⚠️  Rematch: ${game1.awayTeam} @ ${game1.homeTeam} (Week ${week1}) vs ${game2.awayTeam} @ ${game2.homeTeam} (Week ${week2})`);
    
    // Decide which game to move (prefer moving the one NOT in a pre-scheduled week)
    let gameToMove: ScheduledGame;
    let weekToMoveFrom: number;
    let otherWeek: number;
    
    const week1IsPreScheduled = preScheduledWeeks.has(week1);
    const week2IsPreScheduled = preScheduledWeeks.has(week2);
    
    if (week1IsPreScheduled && week2IsPreScheduled) {
      // Both weeks are pre-scheduled - cannot fix this rematch
      console.log(`    ⚠️  Cannot fix: Both weeks ${week1} and ${week2} are pre-scheduled!`);
      // Remove this rematch from consideration and continue
      continue;
    } else if (week1IsPreScheduled) {
      // Move game from week2
      gameToMove = game2;
      weekToMoveFrom = week2;
      otherWeek = week1;
    } else {
      // Move game from week1 (or week2 if week1 is also pre-scheduled, but we already handled that)
      gameToMove = game1;
      weekToMoveFrom = week1;
      otherWeek = week2;
    }
    
    console.log(`    🔄 Attempting to move ${gameToMove.awayTeam} @ ${gameToMove.homeTeam} from Week ${weekToMoveFrom}`);
    
    // Find a valid week to move the game to
    // Valid = not consecutive to the other rematch game, and both teams are free that week
    const validWeeks: number[] = [];
    
    for (const targetWeek of sortedWeeks) {
      // Skip the current week
      if (targetWeek === weekToMoveFrom) continue;
      
      // Skip pre-scheduled weeks
      if (preScheduledWeeks.has(targetWeek)) continue;
      
      // Skip weeks consecutive to the other rematch game
      if (Math.abs(targetWeek - otherWeek) === 1) continue;
      
      // Check if both teams are free in the target week
      const targetWeekGames = gamesByWeek.get(targetWeek) || [];
      const teamIsFree = (teamId: string) => {
        return !targetWeekGames.some(g => g.homeTeam === teamId || g.awayTeam === teamId);
      };
      
      if (teamIsFree(gameToMove.homeTeam) && teamIsFree(gameToMove.awayTeam)) {
        validWeeks.push(targetWeek);
      }
    }
    
    if (validWeeks.length === 0) {
      console.log(`    ❌ No valid weeks found to move the game to! Skipping this rematch.`);
      // This is a problem - we can't fix this rematch
      // In a real scenario, we might need to swap with another game instead
      continue;
    }
    
    // Pick the first valid week (could be smarter about this)
    const targetWeek = validWeeks[0];
    
    console.log(`    ✅ Moving to Week ${targetWeek}`);
    
    // Update the game's week
    gameToMove.week = targetWeek;
    
    // Update the gamesByWeek map
    const fromWeekGames = gamesByWeek.get(weekToMoveFrom)!;
    const index = fromWeekGames.indexOf(gameToMove);
    if (index > -1) {
      fromWeekGames.splice(index, 1);
    }
    
    if (!gamesByWeek.has(targetWeek)) {
      gamesByWeek.set(targetWeek, []);
    }
    gamesByWeek.get(targetWeek)!.push(gameToMove);
    
    rematchesFixed++;
    
    // Continue to next iteration to check for more rematches
  }
  
  if (iteration >= maxIterations) {
    console.log(`  ⚠️  Reached max iterations (${maxIterations}). Some rematches may remain.`);
  }
  
  console.log(`  ✅ Postprocessing complete: Fixed ${rematchesFixed} of ${rematchesFound} consecutive rematch(es)`);
  
  if (rematchesFixed < rematchesFound) {
    console.log(`  ⚠️  Warning: ${rematchesFound - rematchesFixed} rematch(es) could not be fixed`);
  }
  
  return fixedSchedule;
}

/**
 * Validate that no games in pre-scheduled weeks were modified
 */
export function validatePreScheduledWeeks(
  originalSchedule: ScheduledGame[],
  modifiedSchedule: ScheduledGame[],
  preScheduledWeeks: Set<number>
): boolean {
  console.log('🔍 Validating pre-scheduled weeks were not modified...');
  
  const originalPreScheduled = originalSchedule.filter(g => preScheduledWeeks.has(g.week));
  const modifiedPreScheduled = modifiedSchedule.filter(g => preScheduledWeeks.has(g.week));
  
  if (originalPreScheduled.length !== modifiedPreScheduled.length) {
    console.error(`  ❌ Pre-scheduled game count changed! Original: ${originalPreScheduled.length}, Modified: ${modifiedPreScheduled.length}`);
    return false;
  }
  
  // Check each pre-scheduled game is unchanged
  for (const originalGame of originalPreScheduled) {
    const matchingGame = modifiedPreScheduled.find(
      g => g.week === originalGame.week &&
           g.homeTeam === originalGame.homeTeam &&
           g.awayTeam === originalGame.awayTeam
    );
    
    if (!matchingGame) {
      console.error(`  ❌ Pre-scheduled game was modified: ${originalGame.awayTeam} @ ${originalGame.homeTeam} (Week ${originalGame.week})`);
      return false;
    }
  }
  
  console.log(`  ✅ All ${originalPreScheduled.length} pre-scheduled games remain unchanged`);
  return true;
}

