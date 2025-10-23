import { Team, ConferenceId, DivisionId } from '@/types';

// NFL Teams (2024 structure)
export const NFL_TEAMS: Team[] = [
  // AFC East
  { id: 'BUF', name: 'Buffalo Bills', abbreviation: 'BUF', conference: 'AFC', division: 'AFC_EAST', colors: { primary: '#00338D', secondary: '#C60C30' } },
  { id: 'MIA', name: 'Miami Dolphins', abbreviation: 'MIA', conference: 'AFC', division: 'AFC_EAST', colors: { primary: '#008E97', secondary: '#FC4C02' } },
  { id: 'NE', name: 'New England Patriots', abbreviation: 'NE', conference: 'AFC', division: 'AFC_EAST', colors: { primary: '#002244', secondary: '#C60C30' } },
  { id: 'NYJ', name: 'New York Jets', abbreviation: 'NYJ', conference: 'AFC', division: 'AFC_EAST', colors: { primary: '#125740', secondary: '#FFFFFF' } },

  // AFC North
  { id: 'BAL', name: 'Baltimore Ravens', abbreviation: 'BAL', conference: 'AFC', division: 'AFC_NORTH', colors: { primary: '#241773', secondary: '#000000' } },
  { id: 'CIN', name: 'Cincinnati Bengals', abbreviation: 'CIN', conference: 'AFC', division: 'AFC_NORTH', colors: { primary: '#FB4F14', secondary: '#000000' } },
  { id: 'CLE', name: 'Cleveland Browns', abbreviation: 'CLE', conference: 'AFC', division: 'AFC_NORTH', colors: { primary: '#311D00', secondary: '#FF3C00' } },
  { id: 'PIT', name: 'Pittsburgh Steelers', abbreviation: 'PIT', conference: 'AFC', division: 'AFC_NORTH', colors: { primary: '#FFB612', secondary: '#101820' } },

  // AFC South
  { id: 'HOU', name: 'Houston Texans', abbreviation: 'HOU', conference: 'AFC', division: 'AFC_SOUTH', colors: { primary: '#03202F', secondary: '#A71930' } },
  { id: 'IND', name: 'Indianapolis Colts', abbreviation: 'IND', conference: 'AFC', division: 'AFC_SOUTH', colors: { primary: '#002C5F', secondary: '#A2AAAD' } },
  { id: 'JAX', name: 'Jacksonville Jaguars', abbreviation: 'JAX', conference: 'AFC', division: 'AFC_SOUTH', colors: { primary: '#006778', secondary: '#D7A22A' } },
  { id: 'TEN', name: 'Tennessee Titans', abbreviation: 'TEN', conference: 'AFC', division: 'AFC_SOUTH', colors: { primary: '#0C2340', secondary: '#4B92DB' } },

  // AFC West
  { id: 'DEN', name: 'Denver Broncos', abbreviation: 'DEN', conference: 'AFC', division: 'AFC_WEST', colors: { primary: '#FB4F14', secondary: '#002244' } },
  { id: 'KC', name: 'Kansas City Chiefs', abbreviation: 'KC', conference: 'AFC', division: 'AFC_WEST', colors: { primary: '#E31837', secondary: '#FFB81C' } },
  { id: 'LV', name: 'Las Vegas Raiders', abbreviation: 'LV', conference: 'AFC', division: 'AFC_WEST', colors: { primary: '#000000', secondary: '#A5ACAF' } },
  { id: 'LAC', name: 'Los Angeles Chargers', abbreviation: 'LAC', conference: 'AFC', division: 'AFC_WEST', colors: { primary: '#0080C6', secondary: '#FFC20E' } },

  // NFC East
  { id: 'DAL', name: 'Dallas Cowboys', abbreviation: 'DAL', conference: 'NFC', division: 'NFC_EAST', colors: { primary: '#041E42', secondary: '#869397' } },
  { id: 'NYG', name: 'New York Giants', abbreviation: 'NYG', conference: 'NFC', division: 'NFC_EAST', colors: { primary: '#0B2265', secondary: '#A71930' } },
  { id: 'PHI', name: 'Philadelphia Eagles', abbreviation: 'PHI', conference: 'NFC', division: 'NFC_EAST', colors: { primary: '#004C54', secondary: '#A5ACAF' } },
  { id: 'WAS', name: 'Washington Commanders', abbreviation: 'WAS', conference: 'NFC', division: 'NFC_EAST', colors: { primary: '#5A1414', secondary: '#FFB612' } },

  // NFC North
  { id: 'CHI', name: 'Chicago Bears', abbreviation: 'CHI', conference: 'NFC', division: 'NFC_NORTH', colors: { primary: '#0B162A', secondary: '#C83803' } },
  { id: 'DET', name: 'Detroit Lions', abbreviation: 'DET', conference: 'NFC', division: 'NFC_NORTH', colors: { primary: '#0076B6', secondary: '#B0B7BC' } },
  { id: 'GB', name: 'Green Bay Packers', abbreviation: 'GB', conference: 'NFC', division: 'NFC_NORTH', colors: { primary: '#203731', secondary: '#FFB612' } },
  { id: 'MIN', name: 'Minnesota Vikings', abbreviation: 'MIN', conference: 'NFC', division: 'NFC_NORTH', colors: { primary: '#4F2683', secondary: '#FFC62F' } },

  // NFC South
  { id: 'ATL', name: 'Atlanta Falcons', abbreviation: 'ATL', conference: 'NFC', division: 'NFC_SOUTH', colors: { primary: '#A71930', secondary: '#000000' } },
  { id: 'CAR', name: 'Carolina Panthers', abbreviation: 'CAR', conference: 'NFC', division: 'NFC_SOUTH', colors: { primary: '#0085CA', secondary: '#101820' } },
  { id: 'NO', name: 'New Orleans Saints', abbreviation: 'NO', conference: 'NFC', division: 'NFC_SOUTH', colors: { primary: '#D3BC8D', secondary: '#101820' } },
  { id: 'TB', name: 'Tampa Bay Buccaneers', abbreviation: 'TB', conference: 'NFC', division: 'NFC_SOUTH', colors: { primary: '#D50A0A', secondary: '#FF7900' } },

  // NFC West
  { id: 'ARI', name: 'Arizona Cardinals', abbreviation: 'ARI', conference: 'NFC', division: 'NFC_WEST', colors: { primary: '#97233F', secondary: '#000000' } },
  { id: 'LAR', name: 'Los Angeles Rams', abbreviation: 'LAR', conference: 'NFC', division: 'NFC_WEST', colors: { primary: '#003594', secondary: '#FFA300' } },
  { id: 'SF', name: 'San Francisco 49ers', abbreviation: 'SF', conference: 'NFC', division: 'NFC_WEST', colors: { primary: '#AA0000', secondary: '#B3995D' } },
  { id: 'SEA', name: 'Seattle Seahawks', abbreviation: 'SEA', conference: 'NFC', division: 'NFC_WEST', colors: { primary: '#002244', secondary: '#69BE28' } },
];

export const TEAMS_BY_ID = new Map(NFL_TEAMS.map(t => [t.id, t]));

export const DIVISIONS: Record<DivisionId, TeamId[]> = {
  AFC_EAST: ['BUF', 'MIA', 'NE', 'NYJ'],
  AFC_NORTH: ['BAL', 'CIN', 'CLE', 'PIT'],
  AFC_SOUTH: ['HOU', 'IND', 'JAX', 'TEN'],
  AFC_WEST: ['DEN', 'KC', 'LV', 'LAC'],
  NFC_EAST: ['DAL', 'NYG', 'PHI', 'WAS'],
  NFC_NORTH: ['CHI', 'DET', 'GB', 'MIN'],
  NFC_SOUTH: ['ATL', 'CAR', 'NO', 'TB'],
  NFC_WEST: ['ARI', 'LAR', 'SF', 'SEA'],
};

export const CONFERENCES: Record<ConferenceId, DivisionId[]> = {
  AFC: ['AFC_EAST', 'AFC_NORTH', 'AFC_SOUTH', 'AFC_WEST'],
  NFC: ['NFC_EAST', 'NFC_NORTH', 'NFC_SOUTH', 'NFC_WEST'],
};

export function getTeamsByDivision(division: DivisionId): Team[] {
  return DIVISIONS[division].map(id => TEAMS_BY_ID.get(id)!);
}

export function getTeamsByConference(conference: ConferenceId): Team[] {
  return NFL_TEAMS.filter(t => t.conference === conference);
}

export function getDivisionOpponents(teamId: TeamId): TeamId[] {
  const team = TEAMS_BY_ID.get(teamId);
  if (!team) return [];
  return DIVISIONS[team.division].filter(id => id !== teamId);
}

export function getConferenceOpponents(teamId: TeamId, includeDivision = false): TeamId[] {
  const team = TEAMS_BY_ID.get(teamId);
  if (!team) return [];
  const conferenceTeams = getTeamsByConference(team.conference).map(t => t.id);
  if (includeDivision) return conferenceTeams.filter(id => id !== teamId);
  return conferenceTeams.filter(id => {
    const otherTeam = TEAMS_BY_ID.get(id);
    return id !== teamId && otherTeam?.division !== team.division;
  });
}

export function getInterConferenceOpponents(teamId: TeamId): TeamId[] {
  const team = TEAMS_BY_ID.get(teamId);
  if (!team) return [];
  const opposingConference = team.conference === 'AFC' ? 'NFC' : 'AFC';
  return getTeamsByConference(opposingConference).map(t => t.id);
}

