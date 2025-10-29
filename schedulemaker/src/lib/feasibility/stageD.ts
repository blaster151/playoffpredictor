/**
 * Stage D: "Pairings Reserve" Heuristic
 * Rolling forecast for divisions and teams
 */

import { ScheduleState, FeasibilityResult, DivisionId, TeamId } from '@/types';
import { DIVISIONS } from '@/data/teams';
import { makePairKey } from '@/types';

export function checkStageD(state: ScheduleState): FeasibilityResult[] {
  const results: FeasibilityResult[] = [];

  // Check division reserves
  for (const divisionId of Object.keys(DIVISIONS) as DivisionId[]) {
    const divCheck = checkDivisionReserve(state, divisionId);
    if (divCheck) results.push(divCheck);
  }

  // Check per-team reserves
  for (const teamId of state.teams.keys()) {
    const teamCheck = checkTeamReserve(state, teamId);
    if (teamCheck) results.push(teamCheck);
  }

  return results;
}

function checkDivisionReserve(state: ScheduleState, division: DivisionId): FeasibilityResult | null {
  const teams = DIVISIONS[division];
  if (!teams) return null;

  // Count unplaced division pairings
  let unplacedPairings = 0;
  const affectedPairs: [TeamId, TeamId][] = [];

  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const team1 = teams[i];
      const team2 = teams[j];
      const pairKey = makePairKey(team1, team2);
      const pairNeed = state.pairNeed.get(pairKey);

      if (pairNeed && pairNeed.count > 0 && pairNeed.type === 'DIV') {
        unplacedPairings += pairNeed.count;
        affectedPairs.push([team1, team2]);
      }
    }
  }

  if (unplacedPairings === 0) return null;

  // Count legal week windows for these pairings
  const legalWindows = countLegalWindowsForDivision(state, division, affectedPairs);

  if (unplacedPairings > legalWindows) {
    return {
      level: 'UNSAT',
      stage: 'D',
      message: `Division ${division} needs ${unplacedPairings} games but only ${legalWindows} legal windows remain`,
      details: {
        needed: unplacedPairings,
        capacity: legalWindows,
        constraint: 'DIVISION_RESERVE',
      },
    };
  }

  if (unplacedPairings > legalWindows * 0.8) {
    return {
      level: 'WARNING',
      stage: 'D',
      message: `Division ${division} is tight on legal windows (${unplacedPairings} games, ${legalWindows} windows)`,
      details: {
        needed: unplacedPairings,
        capacity: legalWindows,
        constraint: 'DIVISION_RESERVE',
      },
    };
  }

  return null;
}

function countLegalWindowsForDivision(
  state: ScheduleState,
  division: DivisionId,
  pairs: [TeamId, TeamId][]
): number {
  let totalWindows = 0;

  for (const [team1, team2] of pairs) {
    const teamState1 = state.teams.get(team1);
    const teamState2 = state.teams.get(team2);
    if (!teamState1 || !teamState2) continue;

    // Find weeks where both teams are available
    const lastMet1 = teamState1.lastMet.get(team2);
    const lastMet2 = teamState2.lastMet.get(team1);
    const lastMet = lastMet1 || lastMet2;

    for (let week = 1; week <= state.rules.totalWeeks; week++) {
      // Both must be available
      if (teamState1.busy.has(week) || teamState2.busy.has(week)) continue;

      // Respect rematch spacing
      if (lastMet && week - lastMet < state.rules.minRematchGap) continue;

      totalWindows++;
    }
  }

  return totalWindows;
}

function checkTeamReserve(state: ScheduleState, teamId: TeamId): FeasibilityResult | null {
  const teamState = state.teams.get(teamId);
  if (!teamState) return null;

  const remainingGames = teamState.remain.total;
  if (remainingGames === 0) return null;

  // Count weeks where team is available
  let availableWeeks = 0;
  for (let week = 1; week <= state.rules.totalWeeks; week++) {
    if (!teamState.busy.has(week)) {
      availableWeeks++;
    }
  }

  // Also need to check if they have legal opponents for those weeks
  // Simplified: just check availability
  if (remainingGames > availableWeeks) {
    return {
      level: 'UNSAT',
      stage: 'D',
      message: `Team ${teamId} needs ${remainingGames} games but only ${availableWeeks} weeks available`,
      details: {
        needed: remainingGames,
        capacity: availableWeeks,
        affectedTeams: [teamId],
        constraint: 'TEAM_RESERVE',
      },
    };
  }

  return null;
}

