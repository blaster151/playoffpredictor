/**
 * Stage B: Localized Matching Checks
 * Fast graph tests for over-constraints at the week level
 */

import { ScheduleState, FeasibilityResult, TeamId, Week, LegalPairing } from '@/types';
import { makePairKey } from '@/types';

export function checkStageB(state: ScheduleState, lookAheadWeeks = 2): FeasibilityResult[] {
  const results: FeasibilityResult[] = [];
  
  // Get current week and look ahead
  const currentWeek = getCurrentWeek(state);
  const weeksToCheck: Week[] = [];
  
  for (let w = currentWeek; w <= Math.min(currentWeek + lookAheadWeeks, state.rules.totalWeeks); w++) {
    weeksToCheck.push(w);
  }

  for (const week of weeksToCheck) {
    const weekCheck = checkWeekPairing(state, week);
    if (weekCheck) results.push(weekCheck);
  }

  return results;
}

function getCurrentWeek(state: ScheduleState): Week {
  // Find first week with unfilled slots
  for (let w = 1; w <= state.rules.totalWeeks; w++) {
    const weekState = state.weeks.get(w);
    if (weekState && weekState.slots.filled < weekState.slots.total) {
      return w;
    }
  }
  return state.rules.totalWeeks;
}

function checkWeekPairing(state: ScheduleState, week: Week): FeasibilityResult | null {
  const weekState = state.weeks.get(week);
  if (!weekState) return null;

  const unfilledSlots = weekState.slots.total - weekState.slots.filled;
  if (unfilledSlots === 0) return null; // Week is full

  // Get teams available in this week
  const availableTeams = getAvailableTeams(state, week);
  
  // Get legal pairings for this week
  const legalPairings = getLegalPairingsForWeek(state, week, availableTeams);

  // Check if we can fill all slots
  // Each game needs 2 teams, so we need at least unfilledSlots * 2 team-slots
  // But more importantly, we need enough valid pairings

  if (legalPairings.length < unfilledSlots) {
    return {
      level: 'UNSAT',
      stage: 'B',
      message: `Week ${week} doesn't have enough legal pairings to fill all slots`,
      details: {
        needed: unfilledSlots,
        capacity: legalPairings.length,
        affectedWeeks: [week],
        constraint: 'WEEK_PAIRING',
      },
    };
  }

  // Warning if tight
  if (legalPairings.length < unfilledSlots * 1.2) {
    return {
      level: 'WARNING',
      stage: 'B',
      message: `Week ${week} is tight on legal pairings`,
      details: {
        needed: unfilledSlots,
        capacity: legalPairings.length,
        affectedWeeks: [week],
        constraint: 'WEEK_PAIRING',
      },
    };
  }

  return null;
}

function getAvailableTeams(state: ScheduleState, week: Week): Set<TeamId> {
  const available = new Set<TeamId>();
  
  for (const [teamId, teamState] of state.teams.entries()) {
    // Team is available if not busy in this week
    if (!teamState.busy.has(week)) {
      available.add(teamId);
    }
  }
  
  return available;
}

function getLegalPairingsForWeek(
  state: ScheduleState,
  week: Week,
  availableTeams: Set<TeamId>
): LegalPairing[] {
  const pairings: LegalPairing[] = [];
  const teams = Array.from(availableTeams);

  // Check all possible pairs
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const team1 = teams[i];
      const team2 = teams[j];
      
      const pairing = checkPairingLegality(state, team1, team2, week);
      if (pairing) {
        pairings.push(pairing);
      }
    }
  }

  return pairings;
}

function checkPairingLegality(
  state: ScheduleState,
  team1: TeamId,
  team2: TeamId,
  week: Week
): LegalPairing | null {
  const teamState1 = state.teams.get(team1);
  const teamState2 = state.teams.get(team2);
  
  if (!teamState1 || !teamState2) return null;

  // Check if they still need to play each other
  const pairKey = makePairKey(team1, team2);
  const pairNeed = state.pairNeed.get(pairKey);
  
  if (!pairNeed || pairNeed.count === 0) return null; // Don't need to play

  // Check rematch spacing
  const lastMet1 = teamState1.lastMet.get(team2);
  const lastMet2 = teamState2.lastMet.get(team1);
  const lastMet = lastMet1 || lastMet2;
  
  if (lastMet && week - lastMet < state.rules.minRematchGap) {
    return null; // Too soon for rematch
  }

  // Check if either team can host (home game constraints)
  const canBeHome1 = canTeamHost(state, team1, week);
  const canBeHome2 = canTeamHost(state, team2, week);

  if (!canBeHome1 && !canBeHome2) {
    return null; // Neither can host
  }

  return {
    team1,
    team2,
    category: pairNeed.type,
    canBeHome1,
    canBeHome2,
    legalWeeks: new Set([week]),
  };
}

function canTeamHost(state: ScheduleState, teamId: TeamId, week: Week): boolean {
  const teamState = state.teams.get(teamId);
  if (!teamState) return false;

  // Check if team has home games remaining
  if (teamState.remain.home === 0) return false;

  // Check home streak constraint
  if (teamState.streaks.home >= state.rules.maxConsecutiveHome) {
    return false;
  }

  return true;
}

