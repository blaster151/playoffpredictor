/**
 * State update actions
 * Handle placing/removing games and byes, updating all derived state
 */

import { ScheduleState, Game, Bye, TeamId, Week } from '@/types';
import { makePairKey } from '@/types';
import { TEAMS_BY_ID } from '@/data/teams';

/**
 * Place a game in the schedule
 * Updates all relevant state (teams, weeks, pairs, etc.)
 */
export function placeGame(state: ScheduleState, game: Game): void {
  const homeTeam = state.teams.get(game.homeTeam);
  const awayTeam = state.teams.get(game.awayTeam);
  const weekState = state.weeks.get(game.week);

  if (!homeTeam || !awayTeam || !weekState) {
    throw new Error('Invalid game: team or week not found');
  }

  // Update teams' busy status
  homeTeam.busy.set(game.week, game);
  awayTeam.busy.set(game.week, game);

  // Update last met
  homeTeam.lastMet.set(game.awayTeam, game.week);
  awayTeam.lastMet.set(game.homeTeam, game.week);

  // Update remaining counts
  homeTeam.remain.total--;
  homeTeam.remain.home--;
  awayTeam.remain.total--;
  awayTeam.remain.away--;

  // Update category counts
  const categoryKey = game.category.toLowerCase() as 'div' | 'intra' | 'inter';
  homeTeam.remain[categoryKey]--;
  awayTeam.remain[categoryKey]--;

  // Update streaks
  updateStreaks(homeTeam, 'home', game.week);
  updateStreaks(awayTeam, 'away', game.week);

  // Update pair need
  const pairKey = makePairKey(game.homeTeam, game.awayTeam);
  const pairNeed = state.pairNeed.get(pairKey);
  if (pairNeed && pairNeed.count > 0) {
    pairNeed.count = Math.max(0, pairNeed.count - 1) as 0 | 1 | 2;
  }

  // Update week state
  weekState.slots.filled++;
  weekState.games.push(game);

  // Update night slots if applicable
  if (['SUN_NIGHT', 'MON_NIGHT', 'THU_NIGHT'].includes(game.timeslot)) {
    weekState.nightSlots = Math.max(0, weekState.nightSlots - 1);
  }

  // Add to global games list
  state.games.push(game);
}

/**
 * Remove a game from the schedule
 */
export function removeGame(state: ScheduleState, gameId: string): void {
  const game = state.games.find(g => g.id === gameId);
  if (!game) return;

  const homeTeam = state.teams.get(game.homeTeam);
  const awayTeam = state.teams.get(game.awayTeam);
  const weekState = state.weeks.get(game.week);

  if (!homeTeam || !awayTeam || !weekState) return;

  // Revert teams' busy status
  homeTeam.busy.delete(game.week);
  awayTeam.busy.delete(game.week);

  // Note: We don't revert lastMet as there might be another game between them earlier

  // Revert remaining counts
  homeTeam.remain.total++;
  homeTeam.remain.home++;
  awayTeam.remain.total++;
  awayTeam.remain.away++;

  // Revert category counts
  const categoryKey = game.category.toLowerCase() as 'div' | 'intra' | 'inter';
  homeTeam.remain[categoryKey]++;
  awayTeam.remain[categoryKey]++;

  // Revert streaks (needs recalculation)
  recalculateStreaks(state, game.homeTeam);
  recalculateStreaks(state, game.awayTeam);

  // Revert pair need
  const pairKey = makePairKey(game.homeTeam, game.awayTeam);
  const pairNeed = state.pairNeed.get(pairKey);
  if (pairNeed) {
    pairNeed.count = Math.min(2, pairNeed.count + 1) as 0 | 1 | 2;
  }

  // Revert week state
  weekState.slots.filled--;
  weekState.games = weekState.games.filter(g => g.id !== gameId);

  if (['SUN_NIGHT', 'MON_NIGHT', 'THU_NIGHT'].includes(game.timeslot)) {
    weekState.nightSlots++;
  }

  // Remove from global games list
  state.games = state.games.filter(g => g.id !== gameId);
}

/**
 * Assign a bye week to a team
 */
export function assignBye(state: ScheduleState, bye: Bye): void {
  const team = state.teams.get(bye.teamId);
  const weekState = state.weeks.get(bye.week);

  if (!team || !weekState) {
    throw new Error('Invalid bye: team or week not found');
  }

  if (weekState.byesAssigned >= weekState.byeCapacity) {
    throw new Error('Week has reached bye capacity');
  }

  // Update team
  team.busy.set(bye.week, bye);
  team.remain.bye = 0;

  // Update week
  weekState.byesAssigned++;
  weekState.byes.push(bye);

  // Update global state
  state.unplacedByes.delete(bye.teamId);
  state.byes.push(bye);

  // Reset streaks since bye interrupts
  team.streaks.home = 0;
  team.streaks.away = 0;
}

/**
 * Remove a bye assignment
 */
export function removeBye(state: ScheduleState, teamId: TeamId, week: Week): void {
  const team = state.teams.get(teamId);
  const weekState = state.weeks.get(week);

  if (!team || !weekState) return;

  // Update team
  team.busy.delete(week);
  team.remain.bye = 1;

  // Update week
  weekState.byesAssigned--;
  weekState.byes = weekState.byes.filter(b => b.teamId !== teamId);

  // Update global state
  state.unplacedByes.add(teamId);
  state.byes = state.byes.filter(b => !(b.teamId === teamId && b.week === week));

  // Recalculate streaks
  recalculateStreaks(state, teamId);
}

/**
 * Update home/away streaks for a team
 */
function updateStreaks(team: any, type: 'home' | 'away', currentWeek: Week): void {
  if (type === 'home') {
    team.streaks.home++;
    team.streaks.away = 0;
  } else {
    team.streaks.away++;
    team.streaks.home = 0;
  }
}

/**
 * Recalculate streaks for a team by scanning all their games
 */
function recalculateStreaks(state: ScheduleState, teamId: TeamId): void {
  const team = state.teams.get(teamId);
  if (!team) return;

  team.streaks.home = 0;
  team.streaks.away = 0;

  // Find most recent consecutive games
  const sortedWeeks = Array.from(team.busy.keys()).sort((a, b) => b - a);
  
  let currentType: 'home' | 'away' | null = null;
  let currentStreak = 0;

  for (const week of sortedWeeks) {
    const item = team.busy.get(week);
    if (!item || 'teamId' in item) break; // Bye or end

    const game = item as Game;
    const isHome = game.homeTeam === teamId;
    const gameType = isHome ? 'home' : 'away';

    if (currentType === null) {
      currentType = gameType;
      currentStreak = 1;
    } else if (currentType === gameType) {
      currentStreak++;
    } else {
      break; // Streak broken
    }
  }

  if (currentType === 'home') {
    team.streaks.home = currentStreak;
  } else if (currentType === 'away') {
    team.streaks.away = currentStreak;
  }
}

