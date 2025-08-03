// NFL Team Colors - Primary and Secondary colors for each team
export const teamColors: { [teamId: string]: { primary: string; secondary: string; text: string } } = {
  // AFC Teams
  'BUF': { primary: '#00338D', secondary: '#C60C30', text: 'white' }, // Bills - Blue & Red
  'MIA': { primary: '#008E97', secondary: '#FC4C02', text: 'white' }, // Dolphins - Teal & Orange
  'NE': { primary: '#002244', secondary: '#C60C30', text: 'white' }, // Patriots - Navy & Red
  'NYJ': { primary: '#003F2D', secondary: '#FFFFFF', text: 'white' }, // Jets - Green & White
  
  'BAL': { primary: '#241773', secondary: '#000000', text: 'white' }, // Ravens - Purple & Black
  'CIN': { primary: '#FB4F14', secondary: '#000000', text: 'white' }, // Bengals - Orange & Black
  'CLE': { primary: '#311D00', secondary: '#FF3C00', text: 'white' }, // Browns - Brown & Orange
  'PIT': { primary: '#FFB612', secondary: '#101820', text: 'black' }, // Steelers - Gold & Black
  
  'HOU': { primary: '#03202F', secondary: '#A71930', text: 'white' }, // Texans - Navy & Red
  'IND': { primary: '#002C5F', secondary: '#A2AAAD', text: 'white' }, // Colts - Blue & Gray
  'JAX': { primary: '#006778', secondary: '#D7A22A', text: 'white' }, // Jaguars - Teal & Gold
  'TEN': { primary: '#0C2340', secondary: '#4B92DB', text: 'white' }, // Titans - Navy & Blue
  
  'DEN': { primary: '#FB4F14', secondary: '#002244', text: 'white' }, // Broncos - Orange & Navy
  'KC': { primary: '#E31837', secondary: '#FFB81C', text: 'white' }, // Chiefs - Red & Gold
  'LV': { primary: '#000000', secondary: '#C4C4C4', text: 'white' }, // Raiders - Black & Silver
  'LAC': { primary: '#0080C6', secondary: '#FFC20E', text: 'white' }, // Chargers - Blue & Gold
  
  // NFC Teams
  'DAL': { primary: '#003594', secondary: '#869397', text: 'white' }, // Cowboys - Blue & Silver
  'NYG': { primary: '#0B2265', secondary: '#A71930', text: 'white' }, // Giants - Blue & Red
  'PHI': { primary: '#004C54', secondary: '#A5ACAF', text: 'white' }, // Eagles - Green & Silver
  'WAS': { primary: '#5A1414', secondary: '#FFB612', text: 'white' }, // Commanders - Burgundy & Gold
  
  'CHI': { primary: '#0B162A', secondary: '#C83803', text: 'white' }, // Bears - Navy & Orange
  'DET': { primary: '#0076B6', secondary: '#B0B7BC', text: 'white' }, // Lions - Blue & Silver
  'GB': { primary: '#203731', secondary: '#FFB612', text: 'white' }, // Packers - Green & Gold
  'MIN': { primary: '#4F2683', secondary: '#FFC62F', text: 'white' }, // Vikings - Purple & Gold
  
  'ATL': { primary: '#A71930', secondary: '#000000', text: 'white' }, // Falcons - Red & Black
  'CAR': { primary: '#0085CA', secondary: '#101820', text: 'white' }, // Panthers - Blue & Black
  'NO': { primary: '#D3BC8D', secondary: '#000000', text: 'black' }, // Saints - Gold & Black
  'TB': { primary: '#D50A0A', secondary: '#34302B', text: 'white' }, // Buccaneers - Red & Pewter
  
  'ARI': { primary: '#97233F', secondary: '#000000', text: 'white' }, // Cardinals - Red & Black
  'LAR': { primary: '#003594', secondary: '#FFA300', text: 'white' }, // Rams - Blue & Gold
  'SF': { primary: '#AA0000', secondary: '#B3995D', text: 'white' }, // 49ers - Red & Gold
  'SEA': { primary: '#002244', secondary: '#69BE28', text: 'white' }, // Seahawks - Navy & Green
};

// Get team colors by team ID
export function getTeamColors(teamId: string) {
  return teamColors[teamId] || { primary: '#6B7280', secondary: '#9CA3AF', text: 'white' };
}

// Get team badge style
export function getTeamBadgeStyle(teamId: string, isWinning: boolean = false) {
  const colors = getTeamColors(teamId);
  
  if (isWinning) {
    return {
      backgroundColor: '#10B981', // Green for winning
      color: 'white',
      border: '2px solid #059669'
    };
  }
  
  return {
    backgroundColor: colors.primary,
    color: colors.text,
    border: `2px solid ${colors.secondary}`
  };
}

// Check if a game is international based on venue
export function isInternationalGame(venue?: string): boolean {
  if (!venue) return false;
  const internationalVenues = ['London', 'Munich', 'Mexico City', 'Toronto', 'Berlin', 'Frankfurt'];
  return internationalVenues.some(internationalVenue => venue.includes(internationalVenue));
}

// Get international game indicator style
export function getInternationalGameStyle(): React.CSSProperties {
  return {
    position: 'absolute',
    top: '-2px',
    right: '-2px',
    width: '12px',
    height: '12px',
    backgroundColor: '#FFD700', // Gold color for international games
    borderRadius: '50%',
    border: '1px solid #B8860B',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '6px',
    color: '#B8860B',
    fontWeight: 'bold',
    zIndex: 10,
  };
} 