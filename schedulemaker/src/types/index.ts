// Core domain types for NFL Schedule Builder

export type TeamId = string; // e.g., "KC", "BUF", "SF"
export type Week = number; // 1-18
export type DivisionId = string; // e.g., "AFC_NORTH", "NFC_WEST"
export type ConferenceId = 'AFC' | 'NFC';

export type GameCategory = 'DIV' | 'INTRA' | 'INTER';

export interface Team {
  id: TeamId;
  name: string;
  abbreviation: string;
  conference: ConferenceId;
  division: DivisionId;
  colors: {
    primary: string;
    secondary: string;
  };
}

export interface Game {
  id: string;
  week: Week;
  homeTeam: TeamId;
  awayTeam: TeamId;
  category: GameCategory;
  timeslot: Timeslot;
}

export type Timeslot = 
  | 'SUN_1PM'
  | 'SUN_4PM'
  | 'SUN_NIGHT'  // SNF
  | 'MON_NIGHT'  // MNF
  | 'THU_NIGHT'  // TNF
  | 'SAT_EARLY'
  | 'SAT_LATE';

export interface Bye {
  teamId: TeamId;
  week: Week;
}

// ===== Per-Team State =====

export interface TeamRemaining {
  total: number;      // total games left
  div: number;        // division games left
  intra: number;      // intra-conference left
  inter: number;      // inter-conference left
  home: number;       // home games left
  away: number;       // away games left
  bye: 0 | 1;         // needs bye?
}

export interface TeamStreaks {
  home: number;       // consecutive home games
  away: number;       // consecutive away games
}

export interface TeamState {
  id: TeamId;
  remain: TeamRemaining;
  busy: Map<Week, Game | Bye>; // which weeks are occupied
  lastMet: Map<TeamId, Week>;  // last week faced each opponent
  streaks: TeamStreaks;
}

// ===== Per-Week State =====

export interface WeekSlots {
  total: number;
  byTimeslot: Map<Timeslot, number>; // capacity per timeslot
  filled: number;
}

export interface WeekState {
  num: Week;
  slots: WeekSlots;
  byeCapacity: number;
  byesAssigned: number;
  nightSlots: number;      // SNF, MNF, TNF combined
  hostableSlots: number;   // total slots that can host games
  games: Game[];
  byes: Bye[];
}

// ===== Global State =====

export interface PairNeed {
  count: 0 | 1 | 2;
  type: GameCategory;
}

export interface ScheduleRules {
  totalWeeks: number;
  gamesPerTeam: number;
  byeStart: Week;
  byeCutoff: Week;
  minRematchGap: number;        // weeks between rematches
  maxConsecutiveHome: number;
  maxConsecutiveAway: number;
  maxByesPerWeek: number;
  minPrimeTimeAppearances: number;
  maxPrimeTimeAppearances: number;
}

export interface ScheduleState {
  teams: Map<TeamId, TeamState>;
  weeks: Map<Week, WeekState>;
  pairNeed: Map<string, PairNeed>; // key: "TEAM1:TEAM2" (sorted)
  unplacedByes: Set<TeamId>;
  rules: ScheduleRules;
  games: Game[];
  byes: Bye[];
}

// ===== Feasibility Types =====

export type FeasibilityLevel = 'SAT' | 'UNSAT' | 'WARNING';

export interface FeasibilityResult {
  level: FeasibilityLevel;
  stage: 'A' | 'B' | 'C' | 'D' | 'E';
  message: string;
  details?: {
    needed?: number;
    capacity?: number;
    affectedTeams?: TeamId[];
    affectedWeeks?: Week[];
    constraint?: string;
  };
}

// ===== UI Mode =====

export type UIMode = 'week-by-week' | 'team-by-team';

export interface AppState {
  mode: UIMode;
  currentWeek: Week;
  currentTeam: TeamId | null;
  schedule: ScheduleState;
  feasibility: FeasibilityResult[];
  history: ScheduleState[]; // for undo
  historyIndex: number;
}

// ===== Actions =====

export type ScheduleAction =
  | { type: 'PLACE_GAME'; game: Game }
  | { type: 'REMOVE_GAME'; gameId: string }
  | { type: 'ASSIGN_BYE'; bye: Bye }
  | { type: 'REMOVE_BYE'; teamId: TeamId; week: Week }
  | { type: 'SET_WEEK'; week: Week }
  | { type: 'SET_TEAM'; teamId: TeamId | null }
  | { type: 'SET_MODE'; mode: UIMode }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'RESET' };

// ===== Helper Types =====

export interface LegalPairing {
  team1: TeamId;
  team2: TeamId;
  category: GameCategory;
  canBeHome1: boolean; // can team1 host?
  canBeHome2: boolean; // can team2 host?
  legalWeeks: Set<Week>;
}

export interface SlotCapacity {
  week: Week;
  timeslot: Timeslot;
  available: number;
}

// Utility type for pair keys
export function makePairKey(t1: TeamId, t2: TeamId): string {
  return t1 < t2 ? `${t1}:${t2}` : `${t2}:${t1}`;
}

