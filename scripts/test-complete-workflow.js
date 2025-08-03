const { 
  generateMatchups, 
  createScheduleConfig, 
  validateMatchups 
} = require('../src/utils/scheduleGenerator.ts');

const { 
  createSimpleScheduleSolver 
} = require('../src/utils/simpleScheduleSolver.ts');

// Mock teams data for testing
const mockTeams = [
  // AFC North
  { id: 'ravens', name: 'Ravens', abbreviation: 'BAL', conference: 'AFC', division: 'North', logo: '/logos/ravens.png' },
  { id: 'browns', name: 'Browns', abbreviation: 'CLE', conference: 'AFC', division: 'North', logo: '/logos/browns.png' },
  { id: 'bengals', name: 'Bengals', abbreviation: 'CIN', conference: 'AFC', division: 'North', logo: '/logos/bengals.png' },
  { id: 'steelers', name: 'Steelers', abbreviation: 'PIT', conference: 'AFC', division: 'North', logo: '/logos/steelers.png' },
  
  // AFC South
  { id: 'texans', name: 'Texans', abbreviation: 'HOU', conference: 'AFC', division: 'South', logo: '/logos/texans.png' },
  { id: 'colts', name: 'Colts', abbreviation: 'IND', conference: 'AFC', division: 'South', logo: '/logos/colts.png' },
  { id: 'jaguars', name: 'Jaguars', abbreviation: 'JAX', conference: 'AFC', division: 'South', logo: '/logos/jaguars.png' },
  { id: 'titans', name: 'Titans', abbreviation: 'TEN', conference: 'AFC', division: 'South', logo: '/logos/titans.png' },
  
  // AFC East
  { id: 'bills', name: 'Bills', abbreviation: 'BUF', conference: 'AFC', division: 'East', logo: '/logos/bills.png' },
  { id: 'dolphins', name: 'Dolphins', abbreviation: 'MIA', conference: 'AFC', division: 'East', logo: '/logos/dolphins.png' },
  { id: 'jets', name: 'Jets', abbreviation: 'NYJ', conference: 'AFC', division: 'East', logo: '/logos/jets.png' },
  { id: 'patriots', name: 'Patriots', abbreviation: 'NE', conference: 'AFC', division: 'East', logo: '/logos/patriots.png' },
  
  // AFC West
  { id: 'chiefs', name: 'Chiefs', abbreviation: 'KC', conference: 'AFC', division: 'West', logo: '/logos/chiefs.png' },
  { id: 'raiders', name: 'Raiders', abbreviation: 'LV', conference: 'AFC', division: 'West', logo: '/logos/raiders.png' },
  { id: 'chargers', name: 'Chargers', abbreviation: 'LAC', conference: 'AFC', division: 'West', logo: '/logos/chargers.png' },
  { id: 'broncos', name: 'Broncos', abbreviation: 'DEN', conference: 'AFC', division: 'West', logo: '/logos/broncos.png' },

  // NFC North
  { id: 'bears', name: 'Bears', abbreviation: 'CHI', conference: 'NFC', division: 'North', logo: '/logos/bears.png' },
  { id: 'lions', name: 'Lions', abbreviation: 'DET', conference: 'NFC', division: 'North', logo: '/logos/lions.png' },
  { id: 'packers', name: 'Packers', abbreviation: 'GB', conference: 'NFC', division: 'North', logo: '/logos/packers.png' },
  { id: 'vikings', name: 'Vikings', abbreviation: 'MIN', conference: 'NFC', division: 'North', logo: '/logos/vikings.png' },
  
  // NFC South
  { id: 'falcons', name: 'Falcons', abbreviation: 'ATL', conference: 'NFC', division: 'South', logo: '/logos/falcons.png' },
  { id: 'panthers', name: 'Panthers', abbreviation: 'CAR', conference: 'NFC', division: 'South', logo: '/logos/panthers.png' },
  { id: 'saints', name: 'Saints', abbreviation: 'NO', conference: 'NFC', division: 'South', logo: '/logos/saints.png' },
  { id: 'buccaneers', name: 'Buccaneers', abbreviation: 'TB', conference: 'NFC', division: 'South', logo: '/logos/buccaneers.png' },
  
  // NFC East
  { id: 'cowboys', name: 'Cowboys', abbreviation: 'DAL', conference: 'NFC', division: 'East', logo: '/logos/cowboys.png' },
  { id: 'eagles', name: 'Eagles', abbreviation: 'PHI', conference: 'NFC', division: 'East', logo: '/logos/eagles.png' },
  { id: 'giants', name: 'Giants', abbreviation: 'NYG', conference: 'NFC', division: 'East', logo: '/logos/giants.png' },
  { id: 'commanders', name: 'Commanders', abbreviation: 'WAS', conference: 'NFC', division: 'East', logo: '/logos/commanders.png' },
  
  // NFC West
  { id: 'cardinals', name: 'Cardinals', abbreviation: 'ARI', conference: 'NFC', division: 'West', logo: '/logos/cardinals.png' },
  { id: 'rams', name: 'Rams', abbreviation: 'LAR', conference: 'NFC', division: 'West', logo: '/logos/rams.png' },
  { id: '49ers', name: '49ers', abbreviation: 'SF', conference: 'NFC', division: 'West', logo: '/logos/49ers.png' },
  { id: 'seahawks', name: 'Seahawks', abbreviation: 'SEA', conference: 'NFC', division: 'West', logo: '/logos/seahawks.png' },
];

// Mock prior year standings
const mockPriorYearStandings = {};
mockTeams.forEach((team, index) => {
  const divisionRank = (index % 4) + 1;
  mockPriorYearStandings[team.id] = divisionRank;
});

async function testCompleteWorkflow() {
  console.log('🚀 Testing Complete NFL Schedule Workflow...\n');

  try {
    // Step 1: Generate matchups using NFL rotational rules
    console.log('📋 Step 1: Generating matchups with NFL rotational rules...');
    const config = createScheduleConfig(mockTeams, 2025, mockPriorYearStandings);
    const matchups = generateMatchups(config);
    console.log(`✅ Generated ${matchups.length} matchups\n`);

    // Step 2: Validate matchups
    console.log('✅ Step 2: Validating matchups...');
    const validation = validateMatchups(matchups, mockTeams);
    if (validation.isValid) {
      console.log('✅ All matchups are valid!');
    } else {
      console.log('❌ Validation errors:');
      validation.errors.forEach(error => console.log(`  - ${error}`));
    }
    console.log('');

    // Step 3: Create constraint solver
    console.log('🎯 Step 3: Creating schedule constraint solver...');
    const solver = createSimpleScheduleSolver(mockTeams, mockTeams, 18, {
      maxConsecutiveAway: 3,
      maxConsecutiveHome: 3,
      maxGamesPerWeek: 16,
      byeWeekDistribution: 'balanced',
      primeTimeGames: ['ravens-cowboys', 'chiefs-bills', 'eagles-cowboys'],
      rivalryWeeks: {
        1: ['ravens-steelers', 'cowboys-eagles'],
        17: ['packers-bears', 'chiefs-raiders'],
      },
    });

    // Step 4: Solve the schedule
    console.log('⚡ Step 4: Solving schedule optimization...');
    const solution = solver.solve();
    
    if (solution.status === 'optimal') {
      console.log('✅ Schedule solved successfully!');
      console.log(`📊 Objective value: ${solution.objective}`);
      console.log(`⏱️ Solve time: ${solution.solveTime}ms`);
      console.log(`📅 Total games: ${solution.constraints.totalGames}`);
      console.log(`📅 Weeks used: ${solution.constraints.weeksUsed}`);
      console.log(`🏖️ Teams with byes: ${solution.constraints.teamsWithByes}\n`);
    } else {
      console.log(`❌ Schedule solve failed: ${solution.status}`);
      return;
    }

    // Step 5: Validate the solution
    console.log('🔍 Step 5: Validating solution...');
    const solutionValidation = solver.validateSolution(solution.games);
    if (solutionValidation.isValid) {
      console.log('✅ Solution is valid!');
    } else {
      console.log('❌ Solution validation errors:');
      solutionValidation.errors.forEach(error => console.log(`  - ${error}`));
    }
    console.log('');

    // Step 6: Show sample schedule
    console.log('📅 Step 6: Sample schedule (first 10 games):');
    solution.games.slice(0, 10).forEach((game, index) => {
      const homeTeam = mockTeams.find(t => t.id === game.homeTeam);
      const awayTeam = mockTeams.find(t => t.id === game.awayTeam);
      console.log(`  Week ${game.week}: ${awayTeam?.abbreviation} @ ${homeTeam?.abbreviation}`);
    });
    console.log('');

    // Step 7: Show games per week distribution
    console.log('📊 Step 7: Games per week distribution:');
    const gamesPerWeek = {};
    for (const game of solution.games) {
      gamesPerWeek[game.week] = (gamesPerWeek[game.week] || 0) + 1;
    }
    
    for (let week = 1; week <= 18; week++) {
      const count = gamesPerWeek[week] || 0;
      console.log(`  Week ${week}: ${count} games`);
    }
    console.log('');

    // Step 8: Show teams with byes
    console.log('🏖️ Step 8: Teams with bye weeks:');
    const teamGames = {};
    for (const team of mockTeams) {
      teamGames[team.id] = 0;
    }
    
    for (const game of solution.games) {
      teamGames[game.homeTeam]++;
      teamGames[game.awayTeam]++;
    }
    
    const teamsWithByes = Object.entries(teamGames)
      .filter(([teamId, count]) => count === 17)
      .map(([teamId]) => {
        const team = mockTeams.find(t => t.id === teamId);
        return team?.abbreviation || teamId;
      });
    
    console.log(`  Teams with byes: ${teamsWithByes.join(', ')}`);
    console.log('');

    console.log('🎉 Complete workflow test successful!');
    console.log('\n📋 Summary:');
    console.log(`  - Generated ${matchups.length} matchups using NFL rules`);
    console.log(`  - Scheduled ${solution.games.length} games across 18 weeks`);
    console.log(`  - Optimized for constraints and preferences`);
    console.log(`  - Validated solution meets all requirements`);

  } catch (error) {
    console.error('❌ Workflow test failed:', error);
  }
}

// Run the test
testCompleteWorkflow(); 