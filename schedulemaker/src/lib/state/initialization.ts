/**
 * State initialization utilities
 * Creates a fresh schedule with all teams, weeks, and constraints
 */

import {
  ScheduleState,
  TeamState,
  WeekState,
  ScheduleRules,
  TeamRemaining,
  TeamStreaks,
  WeekSlots,
  Timeslot,
  TeamId,
  Week,
  PairNeed,
  GameCategory,
} from '@/types';
import { NFL_TEAMS, TEAMS_BY_ID, getDivisionOpponents, getConferenceOpponents, getInterConferenceOpponents } from '@/data/teams';
import { makePairKey } from '@/types';

export const DEFAULT_RULES: ScheduleRules = {
  totalWeeks: 18,
  gamesPerTeam: 17,
  byeStart: 5,
  byeCutoff: 14,
  minRematchGap: 4,
  maxConsecutiveHome: 2,
  maxConsecutiveAway: 2,
  maxByesPerWeek: 6,
  minPrimeTimeAppearances: 1,
  maxPrimeTimeAppearances: 5,
};

export function initializeScheduleState(rules: ScheduleRules = DEFAULT_RULES): ScheduleState {
  const teams = initializeTeams();
  const weeks = initializeWeeks(rules);
  const pairNeed = initializePairNeeds();
  const unplacedByes = new Set(NFL_TEAMS.map(t => t.id));

  return {
    teams,
    weeks,
    pairNeed,
    unplacedByes,
    rules,
    games: [],
    byes: [],
  };
}

function initializeTeams(): Map<TeamId, TeamState> {
  const teams = new Map<TeamId, TeamState>();

  for (const team of NFL_TEAMS) {
    const remain: TeamRemaining = {
      total: 17,
      div: 6,    // 3 opponents × 2 games
      intra: 4,  // 4 non-division conference games
      inter: 4,  // 4 inter-conference games
      home: 8,   // Roughly half (8 or 9)
      away: 9,   // Roughly half
      bye: 1,    // 1 bye week
    };

    const streaks: TeamStreaks = {
      home: 0,
      away: 0,
    };

    teams.set(team.id, {
      id: team.id,
      remain,
      busy: new Map(),
      lastMet: new Map(),
      streaks,
    });
  }

  return teams;
}

function initializeWeeks(rules: ScheduleRules): Map<Week, WeekState> {
  const weeks = new Map<Week, WeekState>();

  // Standard NFL: 16 games per week (32 teams / 2)
  const gamesPerWeek = 16;

  for (let w = 1; w <= rules.totalWeeks; w++) {
    const slots = initializeWeekSlots(gamesPerWeek);
    
    // Bye capacity: weeks 5-14 can have byes
    const byeCapacity = (w >= rules.byeStart && w <= rules.byeCutoff) 
      ? rules.maxByesPerWeek 
      : 0;

    weeks.set(w, {
      num: w,
      slots,
      byeCapacity,
      byesAssigned: 0,
      nightSlots: 3, // SNF, MNF, TNF
      hostableSlots: gamesPerWeek,
      games: [],
      byes: [],
    });
  }

  return weeks;
}

function initializeWeekSlots(totalGames: number): WeekSlots {
  // Standard NFL week distribution
  const byTimeslot = new Map<Timeslot, number>([
    ['THU_NIGHT', 1],
    ['SUN_1PM', 7],
    ['SUN_4PM', 4],
    ['SUN_NIGHT', 1],  // SNF
    ['MON_NIGHT', 1],  // MNF
  ]);

  return {
    total: totalGames,
    byTimeslot,
    filled: 0,
  };
}

function initializePairNeeds(): Map<string, PairNeed> {
  const pairNeed = new Map<string, PairNeed>();

  for (const team of NFL_TEAMS) {
    // Division opponents (2 games each)
    const divOpponents = getDivisionOpponents(team.id);
    for (const opponent of divOpponents) {
      const key = makePairKey(team.id, opponent);
      if (!pairNeed.has(key)) {
        pairNeed.set(key, { count: 2, type: 'DIV' });
      }
    }

    // Intra-conference opponents (1 game each)
    // Note: In real NFL, this is determined by formula (4 games)
    // For now, we'll leave these to be determined
    const intraOpponents = getConferenceOpponents(team.id, false);
    // These will be set based on the NFL rotation formula
    // Simplified: we'd need the specific formula for the year

    // Inter-conference opponents (1 game each, 4 total)
    // Also determined by formula
    const interOpponents = getInterConferenceOpponents(team.id);
    // Also formula-based

    // For the initial prototype, we'll only pre-populate division games
    // The user will manually add other matchups as needed
  }

  return pairNeed;
}

/**
 * Initialize pair needs based on NFL scheduling formula
 * This is a simplified version - real NFL uses complex rotation
 */
export function initializeAllPairNeeds(year: number = 2024): Map<string, PairNeed> {
  const pairNeed = new Map<string, PairNeed>();

  // Division games (always 2 per pair)
  for (const team of NFL_TEAMS) {
    const divOpponents = getDivisionOpponents(team.id);
    for (const opponent of divOpponents) {
      const key = makePairKey(team.id, opponent);
      if (!pairNeed.has(key)) {
        pairNeed.set(key, { count: 2, type: 'DIV' });
      }
    }
  }

  // For now, other matchups would need to be determined by the NFL formula
  // which rotates divisions and considers standings
  // User will build these manually or we can implement the formula later

  return pairNeed;
}

/**
 * Add a pair need (for manual schedule building)
 */
export function addPairNeed(
  pairNeed: Map<string, PairNeed>,
  team1: TeamId,
  team2: TeamId,
  category: GameCategory,
  count: 1 | 2 = 1
): void {
  const key = makePairKey(team1, team2);
  const existing = pairNeed.get(key);

  if (existing) {
    existing.count = Math.min(2, existing.count + count) as 0 | 1 | 2;
  } else {
    pairNeed.set(key, { count, type: category });
  }
}

