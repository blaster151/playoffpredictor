// Test script for the NFL schedule generator
const { 
  generateMatchups, 
  createScheduleConfig, 
  validateMatchups,
  getIntraConferenceRotation,
  getInterConferenceRotation 
} = require('../src/utils/scheduleGenerator.ts');

// Mock teams data for testing
const mockTeams = [
  // AFC North
  { id: 'ravens', name: 'Ravens', abbreviation: 'BAL', conference: 'AFC', division: 'North' },
  { id: 'browns', name: 'Browns', abbreviation: 'CLE', conference: 'AFC', division: 'North' },
  { id: 'bengals', name: 'Bengals', abbreviation: 'CIN', conference: 'AFC', division: 'North' },
  { id: 'steelers', name: 'Steelers', abbreviation: 'PIT', conference: 'AFC', division: 'North' },
  
  // AFC South
  { id: 'texans', name: 'Texans', abbreviation: 'HOU', conference: 'AFC', division: 'South' },
  { id: 'colts', name: 'Colts', abbreviation: 'IND', conference: 'AFC', division: 'South' },
  { id: 'jaguars', name: 'Jaguars', abbreviation: 'JAX', conference: 'AFC', division: 'South' },
  { id: 'titans', name: 'Titans', abbreviation: 'TEN', conference: 'AFC', division: 'South' },
  
  // AFC East
  { id: 'bills', name: 'Bills', abbreviation: 'BUF', conference: 'AFC', division: 'East' },
  { id: 'dolphins', name: 'Dolphins', abbreviation: 'MIA', conference: 'AFC', division: 'East' },
  { id: 'jets', name: 'Jets', abbreviation: 'NYJ', conference: 'AFC', division: 'East' },
  { id: 'patriots', name: 'Patriots', abbreviation: 'NE', conference: 'AFC', division: 'East' },
  
  // AFC West
  { id: 'chiefs', name: 'Chiefs', abbreviation: 'KC', conference: 'AFC', division: 'West' },
  { id: 'raiders', name: 'Raiders', abbreviation: 'LV', conference: 'AFC', division: 'West' },
  { id: 'chargers', name: 'Chargers', abbreviation: 'LAC', conference: 'AFC', division: 'West' },
  { id: 'broncos', name: 'Broncos', abbreviation: 'DEN', conference: 'AFC', division: 'West' },

  // NFC North
  { id: 'bears', name: 'Bears', abbreviation: 'CHI', conference: 'NFC', division: 'North' },
  { id: 'lions', name: 'Lions', abbreviation: 'DET', conference: 'NFC', division: 'North' },
  { id: 'packers', name: 'Packers', abbreviation: 'GB', conference: 'NFC', division: 'North' },
  { id: 'vikings', name: 'Vikings', abbreviation: 'MIN', conference: 'NFC', division: 'North' },
  
  // NFC South
  { id: 'falcons', name: 'Falcons', abbreviation: 'ATL', conference: 'NFC', division: 'South' },
  { id: 'panthers', name: 'Panthers', abbreviation: 'CAR', conference: 'NFC', division: 'South' },
  { id: 'saints', name: 'Saints', abbreviation: 'NO', conference: 'NFC', division: 'South' },
  { id: 'buccaneers', name: 'Buccaneers', abbreviation: 'TB', conference: 'NFC', division: 'South' },
  
  // NFC East
  { id: 'cowboys', name: 'Cowboys', abbreviation: 'DAL', conference: 'NFC', division: 'East' },
  { id: 'eagles', name: 'Eagles', abbreviation: 'PHI', conference: 'NFC', division: 'East' },
  { id: 'giants', name: 'Giants', abbreviation: 'NYG', conference: 'NFC', division: 'East' },
  { id: 'commanders', name: 'Commanders', abbreviation: 'WAS', conference: 'NFC', division: 'East' },
  
  // NFC West
  { id: 'cardinals', name: 'Cardinals', abbreviation: 'ARI', conference: 'NFC', division: 'West' },
  { id: 'rams', name: 'Rams', abbreviation: 'LAR', conference: 'NFC', division: 'West' },
  { id: '49ers', name: '49ers', abbreviation: 'SF', conference: 'NFC', division: 'West' },
  { id: 'seahawks', name: 'Seahawks', abbreviation: 'SEA', conference: 'NFC', division: 'West' },
];

// Mock prior year standings (random for testing)
const mockPriorYearStandings = {};
mockTeams.forEach((team, index) => {
  // Assign random division ranks (1-4) for testing
  const divisionRank = (index % 4) + 1;
  mockPriorYearStandings[team.id] = divisionRank;
});

function testScheduleGenerator() {
  console.log('🧪 Testing NFL Schedule Generator...\n');

  try {
    // Test rotation functions
    console.log('📋 Testing rotation functions...');
    
    const intraRotation = getIntraConferenceRotation(2025, ['North', 'South', 'East', 'West']);
    console.log('Intra-conference rotation for 2025:', intraRotation);
    
    const interRotation = getInterConferenceRotation(2025);
    console.log('Inter-conference rotation for 2025:', interRotation);

    // Create schedule config
    console.log('\n⚙️ Creating schedule config...');
    const config = createScheduleConfig(mockTeams, 2025, mockPriorYearStandings);
    console.log('Divisions:', Object.keys(config.divisions));
    console.log('Conferences:', Object.keys(config.conferences));

    // Generate matchups
    console.log('\n🏈 Generating matchups...');
    const matchups = generateMatchups(config);
    console.log(`Generated ${matchups.length} matchups`);

    // Show sample matchups
    console.log('\n📅 Sample matchups:');
    matchups.slice(0, 10).forEach((matchup, index) => {
      const homeTeam = mockTeams.find(t => t.id === matchup.home);
      const awayTeam = mockTeams.find(t => t.id === matchup.away);
      console.log(`${index + 1}. ${awayTeam?.abbreviation} @ ${homeTeam?.abbreviation}`);
    });

    // Validate matchups
    console.log('\n✅ Validating matchups...');
    const validation = validateMatchups(matchups, mockTeams);
    
    if (validation.isValid) {
      console.log('✅ All matchups are valid!');
    } else {
      console.log('❌ Validation errors:');
      validation.errors.forEach(error => console.log(`  - ${error}`));
    }

    // Show statistics
    console.log('\n📊 Schedule statistics:');
    console.log(`Total games: ${validation.stats.totalGames}`);
    console.log(`Expected games: ${mockTeams.length * 17 / 2} (each team plays 17 games)`);
    
    // Show games per team
    console.log('\nGames per team:');
    Object.entries(validation.stats.gamesPerTeam).forEach(([teamId, games]) => {
      const team = mockTeams.find(t => t.id === teamId);
      console.log(`  ${team?.abbreviation}: ${games} games`);
    });

    // Show home/away distribution
    console.log('\nHome/Away distribution:');
    Object.entries(validation.stats.homeGames).forEach(([teamId, homeGames]) => {
      const team = mockTeams.find(t => t.id === teamId);
      const awayGames = validation.stats.awayGames[teamId];
      console.log(`  ${team?.abbreviation}: ${homeGames} home, ${awayGames} away`);
    });

  } catch (error) {
    console.error('❌ Error testing schedule generator:', error);
  }
}

// Run the test
testScheduleGenerator(); 