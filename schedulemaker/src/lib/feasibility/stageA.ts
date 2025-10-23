/**
 * Stage A: Cheap Necessary Conditions O(teams + slots)
 * Run instantly on each drop - these are fast bounds checks
 */

import { ScheduleState, FeasibilityResult, GameCategory } from '@/types';

export function checkStageA(state: ScheduleState): FeasibilityResult[] {
  const results: FeasibilityResult[] = [];

  // 1. Total capacity bounds
  const capacityCheck = checkCapacityBounds(state);
  if (capacityCheck) results.push(capacityCheck);

  // 2. Category/Type bounds (DIV, INTRA, INTER)
  const categoryChecks = checkCategoryBounds(state);
  results.push(...categoryChecks);

  // 3. Bye feasibility
  const byeCheck = checkByeFeasibility(state);
  if (byeCheck) results.push(byeCheck);

  // 4. Home/Away parity
  const parityCheck = checkHomeAwayParity(state);
  if (parityCheck) results.push(parityCheck);

  // 5. Prime-time coverage (if applicable)
  const primeTimeCheck = checkPrimeTimeCoverage(state);
  if (primeTimeCheck) results.push(primeTimeCheck);

  return results;
}

function checkCapacityBounds(state: ScheduleState): FeasibilityResult | null {
  // Total remaining games = Σ_T remain.total / 2
  let gamesNeeded = 0;
  for (const teamState of state.teams.values()) {
    gamesNeeded += teamState.remain.total;
  }
  gamesNeeded = gamesNeeded / 2; // Each game involves 2 teams

  // Total remaining game slots = Σ_w slots[w].games
  let slotsAvailable = 0;
  for (const weekState of state.weeks.values()) {
    slotsAvailable += (weekState.slots.total - weekState.slots.filled);
  }

  if (gamesNeeded > slotsAvailable) {
    return {
      level: 'UNSAT',
      stage: 'A',
      message: 'Not enough game slots remaining to fit all games',
      details: {
        needed: gamesNeeded,
        capacity: slotsAvailable,
        constraint: 'TOTAL_CAPACITY',
      },
    };
  }

  // Warning if very tight
  if (gamesNeeded > slotsAvailable * 0.95) {
    return {
      level: 'WARNING',
      stage: 'A',
      message: 'Very tight on game slots - only a few slots remain',
      details: {
        needed: gamesNeeded,
        capacity: slotsAvailable,
        constraint: 'TOTAL_CAPACITY',
      },
    };
  }

  return null;
}

function checkCategoryBounds(state: ScheduleState): FeasibilityResult[] {
  const results: FeasibilityResult[] = [];
  const categories: GameCategory[] = ['DIV', 'INTRA', 'INTER'];

  for (const category of categories) {
    let needCategory = 0;
    for (const teamState of state.teams.values()) {
      const key = category.toLowerCase() as 'div' | 'intra' | 'inter';
      needCategory += teamState.remain[key];
    }
    needCategory = needCategory / 2; // Each game involves 2 teams

    // For now, assume all slots can host any category
    // In a more sophisticated version, weeks might have typed capacities
    let capCategory = 0;
    for (const weekState of state.weeks.values()) {
      capCategory += (weekState.slots.total - weekState.slots.filled);
    }

    if (needCategory > capCategory) {
      results.push({
        level: 'UNSAT',
        stage: 'A',
        message: `Not enough capacity for ${category} games`,
        details: {
          needed: needCategory,
          capacity: capCategory,
          constraint: `${category}_CAPACITY`,
        },
      });
    }
  }

  return results;
}

function checkByeFeasibility(state: ScheduleState): FeasibilityResult | null {
  // Teams needing a bye
  const teamsNeedingBye = Array.from(state.teams.values())
    .filter(t => t.remain.bye === 1)
    .map(t => t.id);

  if (teamsNeedingBye.length === 0) return null;

  // Available bye capacity before cutoff
  let byeCapacity = 0;
  for (const weekState of state.weeks.values()) {
    if (weekState.num <= state.rules.byeCutoff) {
      byeCapacity += (weekState.byeCapacity - weekState.byesAssigned);
    }
  }

  if (teamsNeedingBye.length > byeCapacity) {
    return {
      level: 'UNSAT',
      stage: 'A',
      message: 'Not enough bye weeks remaining before cutoff',
      details: {
        needed: teamsNeedingBye.length,
        capacity: byeCapacity,
        affectedTeams: teamsNeedingBye,
        constraint: 'BYE_CAPACITY',
      },
    };
  }

  // Warning if tight
  if (teamsNeedingBye.length > byeCapacity * 0.8) {
    return {
      level: 'WARNING',
      stage: 'A',
      message: `Tight on bye slots: ${teamsNeedingBye.length} teams need byes, ${byeCapacity} slots remain`,
      details: {
        needed: teamsNeedingBye.length,
        capacity: byeCapacity,
        affectedTeams: teamsNeedingBye,
        constraint: 'BYE_CAPACITY',
      },
    };
  }

  return null;
}

function checkHomeAwayParity(state: ScheduleState): FeasibilityResult | null {
  // Sum of all remaining home games
  let needHome = 0;
  for (const teamState of state.teams.values()) {
    needHome += teamState.remain.home;
  }

  // Total hostable slots (all game slots can host)
  let hostableSlots = 0;
  for (const weekState of state.weeks.values()) {
    hostableSlots += weekState.hostableSlots - weekState.slots.filled;
  }

  if (needHome > hostableSlots) {
    return {
      level: 'UNSAT',
      stage: 'A',
      message: 'Not enough slots to satisfy home game requirements',
      details: {
        needed: needHome,
        capacity: hostableSlots,
        constraint: 'HOME_CAPACITY',
      },
    };
  }

  return null;
}

function checkPrimeTimeCoverage(state: ScheduleState): FeasibilityResult | null {
  // This would track teams that still need prime-time appearances
  // For now, simplified version - count remaining night slots

  let remainingNightSlots = 0;
  for (const weekState of state.weeks.values()) {
    remainingNightSlots += weekState.nightSlots;
  }

  // Basic check: ensure there are some night slots left if needed
  // More sophisticated version would track per-team min/max appearances

  if (remainingNightSlots === 0) {
    // Check if any constraint about night games exists
    // For now, just informational
    return null;
  }

  return null;
}

// Utility to sum arrays
function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

