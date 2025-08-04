import { Team, Game, Week, Season } from '../types/nfl';

export const teams: Team[] = [
  // AFC Teams
  { id: 'ravens', name: 'Ravens', abbreviation: 'BAL', conference: 'AFC', division: 'North', logo: '/logos/ravens.png' },
  { id: 'browns', name: 'Browns', abbreviation: 'CLE', conference: 'AFC', division: 'North', logo: '/logos/browns.png' },
  { id: 'bengals', name: 'Bengals', abbreviation: 'CIN', conference: 'AFC', division: 'North', logo: '/logos/bengals.png' },
  { id: 'steelers', name: 'Steelers', abbreviation: 'PIT', conference: 'AFC', division: 'North', logo: '/logos/steelers.png' },
  
  { id: 'texans', name: 'Texans', abbreviation: 'HOU', conference: 'AFC', division: 'South', logo: '/logos/texans.png' },
  { id: 'colts', name: 'Colts', abbreviation: 'IND', conference: 'AFC', division: 'South', logo: '/logos/colts.png' },
  { id: 'jaguars', name: 'Jaguars', abbreviation: 'JAX', conference: 'AFC', division: 'South', logo: '/logos/jaguars.png' },
  { id: 'titans', name: 'Titans', abbreviation: 'TEN', conference: 'AFC', division: 'South', logo: '/logos/titans.png' },
  
  { id: 'bills', name: 'Bills', abbreviation: 'BUF', conference: 'AFC', division: 'East', logo: '/logos/bills.png' },
  { id: 'dolphins', name: 'Dolphins', abbreviation: 'MIA', conference: 'AFC', division: 'East', logo: '/logos/dolphins.png' },
  { id: 'jets', name: 'Jets', abbreviation: 'NYJ', conference: 'AFC', division: 'East', logo: '/logos/jets.png' },
  { id: 'patriots', name: 'Patriots', abbreviation: 'NE', conference: 'AFC', division: 'East', logo: '/logos/patriots.png' },
  
  { id: 'chiefs', name: 'Chiefs', abbreviation: 'KC', conference: 'AFC', division: 'West', logo: '/logos/chiefs.png' },
  { id: 'raiders', name: 'Raiders', abbreviation: 'LV', conference: 'AFC', division: 'West', logo: '/logos/raiders.png' },
  { id: 'chargers', name: 'Chargers', abbreviation: 'LAC', conference: 'AFC', division: 'West', logo: '/logos/chargers.png' },
  { id: 'broncos', name: 'Broncos', abbreviation: 'DEN', conference: 'AFC', division: 'West', logo: '/logos/broncos.png' },

  // NFC Teams
  { id: 'bears', name: 'Bears', abbreviation: 'CHI', conference: 'NFC', division: 'North', logo: '/logos/bears.png' },
  { id: 'lions', name: 'Lions', abbreviation: 'DET', conference: 'NFC', division: 'North', logo: '/logos/lions.png' },
  { id: 'packers', name: 'Packers', abbreviation: 'GB', conference: 'NFC', division: 'North', logo: '/logos/packers.png' },
  { id: 'vikings', name: 'Vikings', abbreviation: 'MIN', conference: 'NFC', division: 'North', logo: '/logos/vikings.png' },
  
  { id: 'falcons', name: 'Falcons', abbreviation: 'ATL', conference: 'NFC', division: 'South', logo: '/logos/falcons.png' },
  { id: 'panthers', name: 'Panthers', abbreviation: 'CAR', conference: 'NFC', division: 'South', logo: '/logos/panthers.png' },
  { id: 'saints', name: 'Saints', abbreviation: 'NO', conference: 'NFC', division: 'South', logo: '/logos/saints.png' },
  { id: 'buccaneers', name: 'Buccaneers', abbreviation: 'TB', conference: 'NFC', division: 'South', logo: '/logos/buccaneers.png' },
  
  { id: 'cowboys', name: 'Cowboys', abbreviation: 'DAL', conference: 'NFC', division: 'East', logo: '/logos/cowboys.png' },
  { id: 'eagles', name: 'Eagles', abbreviation: 'PHI', conference: 'NFC', division: 'East', logo: '/logos/eagles.png' },
  { id: 'giants', name: 'Giants', abbreviation: 'NYG', conference: 'NFC', division: 'East', logo: '/logos/giants.png' },
  { id: 'commanders', name: 'Commanders', abbreviation: 'WAS', conference: 'NFC', division: 'East', logo: '/logos/commanders.png' },
  
  { id: 'cardinals', name: 'Cardinals', abbreviation: 'ARI', conference: 'NFC', division: 'West', logo: '/logos/cardinals.png' },
  { id: 'rams', name: 'Rams', abbreviation: 'LAR', conference: 'NFC', division: 'West', logo: '/logos/rams.png' },
  { id: '49ers', name: '49ers', abbreviation: 'SF', conference: 'NFC', division: 'West', logo: '/logos/49ers.png' },
  { id: 'seahawks', name: 'Seahawks', abbreviation: 'SEA', conference: 'NFC', division: 'West', logo: '/logos/seahawks.png' },
];

export const week1Games: Game[] = [
  // AFC Games
  { id: '1', week: 1, awayTeam: 'ravens', homeTeam: 'bengals', day: 'Thu', date: '2025-09-04', isPlayed: false },
  { id: '2', week: 1, awayTeam: 'browns', homeTeam: 'steelers', day: 'Sun', date: '2025-09-07', isPlayed: false },
  { id: '3', week: 1, awayTeam: 'texans', homeTeam: 'colts', day: 'Sun', date: '2025-09-07', isPlayed: false },
  { id: '4', week: 1, awayTeam: 'jaguars', homeTeam: 'titans', day: 'Sun', date: '2025-09-07', isPlayed: false },
  { id: '5', week: 1, awayTeam: 'bills', homeTeam: 'dolphins', day: 'Sun', date: '2025-09-07', isPlayed: false },
  { id: '6', week: 1, awayTeam: 'jets', homeTeam: 'patriots', day: 'Sun', date: '2025-09-07', isPlayed: false },
  { id: '7', week: 1, awayTeam: 'chiefs', homeTeam: 'raiders', day: 'Sun', date: '2025-09-07', isPlayed: false },
  { id: '8', week: 1, awayTeam: 'chargers', homeTeam: 'broncos', day: 'Sun', date: '2025-09-07', isPlayed: false },
  
  // NFC Games
  { id: '9', week: 1, awayTeam: 'bears', homeTeam: 'lions', day: 'Sun', date: '2025-09-07', isPlayed: false },
  { id: '10', week: 1, awayTeam: 'packers', homeTeam: 'vikings', day: 'Sun', date: '2025-09-07', isPlayed: false },
  { id: '11', week: 1, awayTeam: 'falcons', homeTeam: 'panthers', day: 'Sun', date: '2025-09-07', isPlayed: false },
  { id: '12', week: 1, awayTeam: 'saints', homeTeam: 'buccaneers', day: 'Sun', date: '2025-09-07', isPlayed: false },
  { id: '13', week: 1, awayTeam: 'cowboys', homeTeam: 'eagles', day: 'Sun', date: '2025-09-07', isPlayed: false },
  { id: '14', week: 1, awayTeam: 'giants', homeTeam: 'commanders', day: 'Sun', date: '2025-09-07', isPlayed: false },
  { id: '15', week: 1, awayTeam: 'cardinals', homeTeam: 'rams', day: 'Sun', date: '2025-09-07', isPlayed: false },
  { id: '16', week: 1, awayTeam: '49ers', homeTeam: 'seahawks', day: 'Mon', date: '2025-09-08', isPlayed: false },
];

export const week1: Week = {
  number: 1,
  startDate: '2025-09-04',
  endDate: '2025-09-08',
  games: week1Games,
};

export const season2025: Season = {
  year: '2025-2026',
  weeks: [week1],
  teams,
};

export const getTeamById = (id: string): Team | undefined => {
  return teams.find(team => team.id === id);
};

export const getTeamByAbbreviation = (abbreviation: string): Team | undefined => {
  return teams.find(team => team.abbreviation === abbreviation);
}; 