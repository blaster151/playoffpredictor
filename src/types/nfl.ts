export interface Team {
  id: string;
  name: string;
  abbreviation: string;
  conference: 'AFC' | 'NFC';
  division: 'North' | 'South' | 'East' | 'West';
  logo: string;
}

export interface Game {
  id: string;
  week: number;
  awayTeam: string;
  homeTeam: string;
  awayScore?: number;
  homeScore?: number;
  day: string;
  date: string;
  isPlayed: boolean;
  venue?: string; // Optional venue information for international games
}

export interface TeamRecord {
  wins: number;
  losses: number;
  ties: number;
  divisionWins: number;
  divisionLosses: number;
  divisionTies: number;
  conferenceWins: number;
  conferenceLosses: number;
  conferenceTies: number;
  pointsFor: number;
  pointsAgainst: number;
}

export interface TeamStanding {
  team: Team;
  record: TeamRecord;
  gamesPlayed: number;
  gamesRemaining: number;
  playoffSeed?: number;
  playoffStatus: 'in' | 'out' | 'bubble';
}

export interface Week {
  number: number;
  startDate: string;
  endDate: string;
  games: Game[];
}

export interface Season {
  year: string;
  weeks: Week[];
  teams: Team[];
}

export interface Prediction {
  id: string;
  name: string;
  week: number;
  games: Game[];
  createdAt: Date;
} 