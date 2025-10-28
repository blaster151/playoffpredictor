import { Game } from '../types/nfl';
import scheduleStartingPointData from '../data/scheduleStartingPoint.json';

export interface ScheduleStartingPoint {
  season: number;
  description: string;
  preScheduledWeeks: number[];
  weeks: {
    [weekNumber: number]: {
      games: Game[];
    };
  };
}

/**
 * Load the schedule starting point (pre-scheduled weeks)
 */
export function loadScheduleStartingPoint(): ScheduleStartingPoint {
  return scheduleStartingPointData as ScheduleStartingPoint;
}

/**
 * Get the list of pre-scheduled matchups to exclude from generation
 * These matchups have already been scheduled in the starting point
 */
export function getPreScheduledMatchups(): Array<{ home: string; away: string; week: number }> {
  const startingPoint = loadScheduleStartingPoint();
  const preScheduledMatchups: Array<{ home: string; away: string; week: number }> = [];
  
  for (const weekNum of startingPoint.preScheduledWeeks) {
    const weekGames = startingPoint.weeks[weekNum]?.games || [];
    for (const game of weekGames) {
      preScheduledMatchups.push({
        home: game.homeTeam,
        away: game.awayTeam,
        week: weekNum
      });
    }
  }
  
  return preScheduledMatchups;
}

/**
 * Filter out matchups that are already scheduled in the starting point
 * This prevents the solver from trying to schedule them again
 */
export function filterPreScheduledMatchups(
  allMatchups: Array<{ home: string; away: string }>,
  preScheduledMatchups: Array<{ home: string; away: string; week: number }>
): Array<{ home: string; away: string }> {
  const preScheduledSet = new Set<string>();
  
  // Add both home-away and away-home combinations to the set
  // This ensures we catch matchups regardless of which team is home/away
  preScheduledMatchups.forEach(m => {
    preScheduledSet.add(`${m.home}-${m.away}`);
    preScheduledSet.add(`${m.away}-${m.home}`);
  });
  
  return allMatchups.filter(matchup => {
    const key = `${matchup.home}-${matchup.away}`;
    const isScheduled = preScheduledSet.has(key);
    
    if (isScheduled) {
      console.log(`  🔍 Filtering out pre-scheduled matchup: ${matchup.away} @ ${matchup.home}`);
    }
    
    return !isScheduled;
  });
}

/**
 * Get the weeks that should be solved by the constraint solver
 * (all weeks except the pre-scheduled ones)
 */
export function getSolverWeeks(totalWeeks: number = 18): number[] {
  const startingPoint = loadScheduleStartingPoint();
  const allWeeks = Array.from({ length: totalWeeks }, (_, i) => i + 1);
  const preScheduledWeeks = new Set(startingPoint.preScheduledWeeks);
  
  return allWeeks.filter(week => !preScheduledWeeks.has(week));
}

/**
 * Merge the pre-scheduled games with the solver-generated games
 */
export function mergeSchedules(
  solverGames: Array<{ week: number; home: string; away: string }>,
  startingPoint: ScheduleStartingPoint
): { [weekNumber: number]: { games: Game[] } } {
  const mergedWeeks: { [weekNumber: number]: { games: Game[] } } = {};
  
  // Add pre-scheduled weeks
  for (const weekNum of startingPoint.preScheduledWeeks) {
    mergedWeeks[weekNum] = {
      games: startingPoint.weeks[weekNum]?.games || []
    };
  }
  
  // Add solver-generated games
  const weekGroups = new Map<number, Array<{ home: string; away: string }>>();
  for (const game of solverGames) {
    if (!weekGroups.has(game.week)) {
      weekGroups.set(game.week, []);
    }
    weekGroups.get(game.week)!.push({ home: game.home, away: game.away });
  }
  
  for (const [weekNum, games] of weekGroups) {
    mergedWeeks[weekNum] = {
      games: games.map((game, idx) => ({
        id: `2026-wk${weekNum}-game${idx + 1}`,
        week: weekNum,
        awayTeam: game.away,
        homeTeam: game.home,
        day: 'Sunday', // Default, can be postprocessed
        date: `2026-09-${10 + weekNum * 7}`, // Approximate, adjust as needed
        isPlayed: false
      }))
    };
  }
  
  return mergedWeeks;
}

/**
 * Check if a week is pre-scheduled
 */
export function isWeekPreScheduled(week: number): boolean {
  const startingPoint = loadScheduleStartingPoint();
  return startingPoint.preScheduledWeeks.includes(week);
}

/**
 * Get team game counts from pre-scheduled weeks
 * This is important for the solver to know how many games each team has already played
 */
export function getTeamGameCounts(): Map<string, number> {
  const startingPoint = loadScheduleStartingPoint();
  const gameCounts = new Map<string, number>();
  
  for (const weekNum of startingPoint.preScheduledWeeks) {
    const weekGames = startingPoint.weeks[weekNum]?.games || [];
    for (const game of weekGames) {
      gameCounts.set(game.homeTeam, (gameCounts.get(game.homeTeam) || 0) + 1);
      gameCounts.set(game.awayTeam, (gameCounts.get(game.awayTeam) || 0) + 1);
    }
  }
  
  return gameCounts;
}

