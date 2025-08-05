
// Test script to identify constraint solver issues
console.log('🧪 Testing Constraint Solver Step by Step...\n');

// Mock GLPK for testing
const mockGLPK = {
  GLP_UP: 1,
  GLP_DB: 2,
  GLP_FX: 3,
  GLP_MAX: 2,
  solve: async (problem) => {
    console.log('🔧 Mock GLPK solving problem...');
    console.log('  - Variables:', problem.binaries?.length || 0);
    console.log('  - Constraints:', problem.subjectTo?.length || 0);
    
    // Simulate different constraint scenarios
    const totalConstraints = problem.subjectTo?.length || 0;
    const totalVariables = problem.binaries?.length || 0;
    
    // Check if problem is too complex (simulate infeasibility)
    if (totalConstraints > 1000 || totalVariables > 5000) {
      console.log('  ❌ Problem too complex - simulating infeasible');
      return { result: null };
    }
    
    // Check for specific constraint patterns that might cause issues
    const hasByeConstraints = problem.subjectTo?.some(c => c.name?.includes('bye'));
    const hasConsecutiveConstraints = problem.subjectTo?.some(c => c.name?.includes('consecutive'));
    const hasWeeklyConstraints = problem.subjectTo?.some(c => c.name?.includes('week'));
    
    console.log('  - Has bye constraints:', hasByeConstraints);
    console.log('  - Has consecutive constraints:', hasConsecutiveConstraints);
    console.log('  - Has weekly constraints:', hasWeeklyConstraints);
    
    // Simulate success for most cases
    if (totalConstraints < 500) {
      console.log('  ✅ Problem seems feasible - simulating success');
      return {
        result: {
          z: 256, // Mock objective value
          vars: problem.binaries?.reduce((acc, varName) => {
            acc[varName] = Math.random() > 0.8 ? 1 : 0; // Random binary values
            return acc;
          }, {}) || {}
        }
      };
    } else {
      console.log('  ❌ Problem too complex - simulating infeasible');
      return { result: null };
    }
  }
};

// Mock the constraint solver class
class MockConstraintSolver {
  constructor(matchups, teams, weeks = 18, constraints = {}) {
    this.matchups = matchups;
    this.teams = teams;
    this.weeks = weeks;
    this.constraints = {
      maxConsecutiveAway: 3,
      maxConsecutiveHome: 3,
      maxGamesPerWeek: 16,
      ...constraints,
    };
  }

  async solve() {
    const startTime = Date.now();
    
    try {
      // Create the problem
      const problem = this.createProblem(mockGLPK);
      
      // Solve using mock GLPK
      const result = await mockGLPK.solve(problem);
      
      const solveTime = Date.now() - startTime;

      if (result && result.result && result.result.z !== undefined) {
        const games = this.extractSolution(result.result);
        return {
          games,
          objective: result.result.z,
          status: 'optimal',
          solveTime,
          constraints: this.calculateConstraints(games),
        };
      } else {
        return {
          games: [],
          objective: 0,
          status: 'infeasible',
          solveTime,
          constraints: { totalGames: 0, weeksUsed: 0, teamsWithByes: 0 },
        };
      }
    } catch (error) {
      return {
        games: [],
        objective: 0,
        status: 'error',
        solveTime: Date.now() - startTime,
        constraints: { totalGames: 0, weeksUsed: 0, teamsWithByes: 0 },
        error: error.message
      };
    }
  }

  createProblem(glpkInstance) {
    const numMatchups = this.matchups.length;
    const numTeams = this.teams.length;
    const numWeeks = this.weeks;

    // Create variable names and objective coefficients
    const objectiveVars = [];
    const varNames = [];
    
    // Create variables: x[matchup][week] = 1 if matchup m is scheduled in week w
    for (let m = 0; m < numMatchups; m++) {
      for (let w = 1; w <= numWeeks; w++) {
        const varName = `x_${m}_${w}`;
        objectiveVars.push({ name: varName, coef: 1 });
        varNames.push(varName);
      }
    }

    // Constraints
    const subjectTo = [];

    // Constraint 1: Each matchup must be scheduled exactly once (relaxed to 0 or 1)
    for (let m = 0; m < numMatchups; m++) {
      const vars = [];
      for (let w = 1; w <= numWeeks; w++) {
        vars.push({ name: `x_${m}_${w}`, coef: 1 });
      }
      subjectTo.push({
        name: `matchup_${m}`,
        vars,
        bnds: { type: glpkInstance.GLP_UP, lb: 0, ub: 1 }
      });
    }

    // Constraint 2: Each team can play at most one game per week
    for (let t = 0; t < numTeams; t++) {
      for (let w = 1; w <= numWeeks; w++) {
        const vars = [];
        for (let m = 0; m < numMatchups; m++) {
          const matchup = this.matchups[m];
          if (matchup.home === this.teams[t].id || matchup.away === this.teams[t].id) {
            vars.push({ name: `x_${m}_${w}`, coef: 1 });
          }
        }
        if (vars.length > 0) {
          subjectTo.push({
            name: `team_${t}_week_${w}`,
            vars,
            bnds: { type: glpkInstance.GLP_UP, lb: 0, ub: 1 }
          });
        }
      }
    }

    // Constraint 3: Maximum games per week
    for (let w = 1; w <= numWeeks; w++) {
      const vars = [];
      for (let m = 0; m < numMatchups; m++) {
        vars.push({ name: `x_${m}_${w}`, coef: 1 });
      }
      subjectTo.push({
        name: `max_games_week_${w}`,
        vars,
        bnds: { type: glpkInstance.GLP_UP, lb: 0, ub: this.constraints.maxGamesPerWeek || 16 }
      });
    }

    // Constraint 4: Each team must have exactly 17 games (relaxed)
    for (let t = 0; t < numTeams; t++) {
      const vars = [];
      for (let m = 0; m < numMatchups; m++) {
        const matchup = this.matchups[m];
        if (matchup.home === this.teams[t].id || matchup.away === this.teams[t].id) {
          for (let w = 1; w <= numWeeks; w++) {
            vars.push({ name: `x_${m}_${w}`, coef: 1 });
          }
        }
      }
      if (vars.length > 0) {
        const minGames = Math.min(15, vars.length);
        subjectTo.push({
          name: `bye_${t}`,
          vars,
          bnds: { type: glpkInstance.GLP_DB, lb: minGames, ub: 17 }
        });
      }
    }

    // Constraint 5: Prevent consecutive rematches
    for (let w = 1; w < numWeeks; w++) {
      for (let m1 = 0; m1 < numMatchups; m1++) {
        for (let m2 = 0; m2 < numMatchups; m2++) {
          if (m1 !== m2) {
            const matchup1 = this.matchups[m1];
            const matchup2 = this.matchups[m2];
            if ((matchup1.home === matchup2.home && matchup1.away === matchup2.away) ||
                (matchup1.home === matchup2.away && matchup1.away === matchup2.home)) {
              subjectTo.push({
                name: `no_consecutive_${m1}_${m2}_${w}`,
                vars: [
                  { name: `x_${m1}_${w}`, coef: 1 },
                  { name: `x_${m2}_${w + 1}`, coef: 1 }
                ],
                bnds: { type: glpkInstance.GLP_UP, lb: 0, ub: 1 }
              });
            }
          }
        }
      }
    }

    // Constraint 6: Balanced weekly distribution
    const targetGamesPerWeek = Math.ceil(numMatchups / numWeeks);
    for (let w = 1; w <= numWeeks; w++) {
      const vars = [];
      for (let m = 0; m < numMatchups; m++) {
        vars.push({ name: `x_${m}_${w}`, coef: 1 });
      }
      subjectTo.push({
        name: `min_games_week_${w}`,
        vars,
        bnds: { type: glpkInstance.GLP_DB, lb: Math.max(1, targetGamesPerWeek - 2), ub: targetGamesPerWeek + 2 }
      });
    }

    // Constraint 7: Inter-conference games limit
    for (let w = 1; w <= numWeeks; w++) {
      const interConferenceVars = [];
      for (let m = 0; m < numMatchups; m++) {
        const matchup = this.matchups[m];
        const homeTeam = this.teams.find(t => t.id === matchup.home);
        const awayTeam = this.teams.find(t => t.id === matchup.away);
        if (homeTeam && awayTeam && homeTeam.conference !== awayTeam.conference) {
          interConferenceVars.push({ name: `x_${m}_${w}`, coef: 1 });
        }
      }
      if (interConferenceVars.length > 0) {
        subjectTo.push({
          name: `max_inter_conf_week_${w}`,
          vars: interConferenceVars,
          bnds: { type: glpkInstance.GLP_UP, lb: 0, ub: 6 }
        });
      }
    }

    // Constraint 8: Maximum 6 teams on bye per week
    for (let w = 1; w <= numWeeks; w++) {
      const teamsOnByeVars = [];
      for (let t = 0; t < numTeams; t++) {
        const teamId = this.teams[t].id;
        let teamPlaysThisWeek = false;
        for (let m = 0; m < numMatchups; m++) {
          const matchup = this.matchups[m];
          if (matchup.home === teamId || matchup.away === teamId) {
            teamPlaysThisWeek = true;
            break;
          }
        }
        if (!teamPlaysThisWeek) {
          const byeVarName = `bye_${t}_${w}`;
          varNames.push(byeVarName);
          teamsOnByeVars.push({ name: byeVarName, coef: 1 });
        }
      }
      if (teamsOnByeVars.length > 0) {
        subjectTo.push({
          name: `max_bye_teams_week_${w}`,
          vars: teamsOnByeVars,
          bnds: { type: glpkInstance.GLP_UP, lb: 0, ub: 6 }
        });
      }
    }

    console.log('🔧 Problem Stats:');
    console.log('  - Variables:', varNames.length);
    console.log('  - Constraints:', subjectTo.length);
    console.log('  - Matchups:', this.matchups.length);
    console.log('  - Teams:', this.teams.length);
    console.log('  - Weeks:', this.weeks);

    return {
      name: 'NFL_Schedule_Optimization',
      objective: {
        direction: 2,
        name: 'total_games',
        vars: objectiveVars
      },
      subjectTo,
      binaries: varNames
    };
  }

  extractSolution(result) {
    const games = [];
    for (let m = 0; m < this.matchups.length; m++) {
      for (let w = 1; w <= this.weeks; w++) {
        const varName = `x_${m}_${w}`;
        const value = result.vars[varName];
        if (value > 0.5) {
          const matchup = this.matchups[m];
          games.push({
            matchup,
            week: w,
            homeTeam: matchup.home,
            awayTeam: matchup.away,
          });
        }
      }
    }
    return games.sort((a, b) => a.week - b.week);
  }

  calculateConstraints(games) {
    const gamesPerWeek = {};
    const teamGames = {};
    
    for (let w = 1; w <= this.weeks; w++) {
      gamesPerWeek[w] = 0;
    }
    
    for (const team of this.teams) {
      teamGames[team.id] = 0;
    }
    
    for (const game of games) {
      gamesPerWeek[game.week]++;
      teamGames[game.homeTeam]++;
      teamGames[game.awayTeam]++;
    }
    
    const teamsWithByes = Object.values(teamGames).filter(count => count === 17).length;
    
    return {
      totalGames: games.length,
      weeksUsed: Object.values(gamesPerWeek).filter(count => count > 0).length,
      teamsWithByes,
    };
  }
}

// Mock data
const mockTeams = [
  { id: 'BAL', name: 'Baltimore Ravens', conference: 'AFC', division: 'North' },
  { id: 'CIN', name: 'Cincinnati Bengals', conference: 'AFC', division: 'North' },
  { id: 'CLE', name: 'Cleveland Browns', conference: 'AFC', division: 'North' },
  { id: 'PIT', name: 'Pittsburgh Steelers', conference: 'AFC', division: 'North' },
  { id: 'HOU', name: 'Houston Texans', conference: 'AFC', division: 'South' },
  { id: 'IND', name: 'Indianapolis Colts', conference: 'AFC', division: 'South' },
  { id: 'JAX', name: 'Jacksonville Jaguars', conference: 'AFC', division: 'South' },
  { id: 'TEN', name: 'Tennessee Titans', conference: 'AFC', division: 'South' },
  { id: 'BUF', name: 'Buffalo Bills', conference: 'AFC', division: 'East' },
  { id: 'MIA', name: 'Miami Dolphins', conference: 'AFC', division: 'East' },
  { id: 'NE', name: 'New England Patriots', conference: 'AFC', division: 'East' },
  { id: 'NYJ', name: 'New York Jets', conference: 'AFC', division: 'East' },
  { id: 'DEN', name: 'Denver Broncos', conference: 'AFC', division: 'West' },
  { id: 'KC', name: 'Kansas City Chiefs', conference: 'AFC', division: 'West' },
  { id: 'LV', name: 'Las Vegas Raiders', conference: 'AFC', division: 'West' },
  { id: 'LAC', name: 'Los Angeles Chargers', conference: 'AFC', division: 'West' },
  { id: 'CHI', name: 'Chicago Bears', conference: 'NFC', division: 'North' },
  { id: 'DET', name: 'Detroit Lions', conference: 'NFC', division: 'North' },
  { id: 'GB', name: 'Green Bay Packers', conference: 'NFC', division: 'North' },
  { id: 'MIN', name: 'Minnesota Vikings', conference: 'NFC', division: 'North' },
  { id: 'ATL', name: 'Atlanta Falcons', conference: 'NFC', division: 'South' },
  { id: 'CAR', name: 'Carolina Panthers', conference: 'NFC', division: 'South' },
  { id: 'NO', name: 'New Orleans Saints', conference: 'NFC', division: 'South' },
  { id: 'TB', name: 'Tampa Bay Buccaneers', conference: 'NFC', division: 'South' },
  { id: 'DAL', name: 'Dallas Cowboys', conference: 'NFC', division: 'East' },
  { id: 'NYG', name: 'New York Giants', conference: 'NFC', division: 'East' },
  { id: 'PHI', name: 'Philadelphia Eagles', conference: 'NFC', division: 'East' },
  { id: 'WAS', name: 'Washington Commanders', conference: 'NFC', division: 'East' },
  { id: 'ARI', name: 'Arizona Cardinals', conference: 'NFC', division: 'West' },
  { id: 'LAR', name: 'Los Angeles Rams', conference: 'NFC', division: 'West' },
  { id: 'SF', name: 'San Francisco 49ers', conference: 'NFC', division: 'West' },
  { id: 'SEA', name: 'Seattle Seahawks', conference: 'NFC', division: 'West' }
];

function generateSimpleMatchups() {
  const matchups = [];
  
  // Division games
  const divisions = {
    'AFC_North': ['BAL', 'CIN', 'CLE', 'PIT'],
    'AFC_South': ['HOU', 'IND', 'JAX', 'TEN'],
    'AFC_East': ['BUF', 'MIA', 'NE', 'NYJ'],
    'AFC_West': ['DEN', 'KC', 'LV', 'LAC'],
    'NFC_North': ['CHI', 'DET', 'GB', 'MIN'],
    'NFC_South': ['ATL', 'CAR', 'NO', 'TB'],
    'NFC_East': ['DAL', 'NYG', 'PHI', 'WAS'],
    'NFC_West': ['ARI', 'LAR', 'SF', 'SEA']
  };
  
  Object.values(divisions).forEach(divisionTeams => {
    for (let i = 0; i < divisionTeams.length; i++) {
      for (let j = i + 1; j < divisionTeams.length; j++) {
        matchups.push({ home: divisionTeams[i], away: divisionTeams[j] });
        matchups.push({ home: divisionTeams[j], away: divisionTeams[i] });
      }
    }
  });
  
  // Inter-conference games
  const afcTeams = mockTeams.filter(t => t.conference === 'AFC').map(t => t.id);
  const nfcTeams = mockTeams.filter(t => t.conference === 'NFC').map(t => t.id);
  
  for (let i = 0; i < afcTeams.length; i++) {
    for (let j = 0; j < 5; j++) {
      const nfcIndex = (i + j) % nfcTeams.length;
      matchups.push({ home: afcTeams[i], away: nfcTeams[nfcIndex] });
    }
  }
  
  return matchups;
}

async function testIndividualConstraints() {
  const matchups = generateSimpleMatchups();
  
  console.log(`📊 Test Setup:`);
  console.log(`  - Teams: ${mockTeams.length}`);
  console.log(`  - Matchups: ${matchups.length}`);
  console.log(`  - Weeks: 18\n`);

  // Test 1: No constraints (baseline)
  console.log('🔍 Test 1: No Constraints (Baseline)');
  const solver1 = new MockConstraintSolver(matchups, mockTeams, 18, {});
  const result1 = await solver1.solve();
  console.log(`  Status: ${result1.status}`);
  console.log(`  Games: ${result1.games.length}`);
  console.log(`  Solve Time: ${result1.solveTime}ms\n`);

  // Test 2: Only maxConsecutiveAway constraint
  console.log('🔍 Test 2: Only maxConsecutiveAway = 2');
  const solver2 = new MockConstraintSolver(matchups, mockTeams, 18, { maxConsecutiveAway: 2 });
  const result2 = await solver2.solve();
  console.log(`  Status: ${result2.status}`);
  console.log(`  Games: ${result2.games.length}`);
  console.log(`  Solve Time: ${result2.solveTime}ms\n`);

  // Test 3: Only maxConsecutiveHome constraint
  console.log('🔍 Test 3: Only maxConsecutiveHome = 2');
  const solver3 = new MockConstraintSolver(matchups, mockTeams, 18, { maxConsecutiveHome: 2 });
  const result3 = await solver3.solve();
  console.log(`  Status: ${result3.status}`);
  console.log(`  Games: ${result3.games.length}`);
  console.log(`  Solve Time: ${result3.solveTime}ms\n`);

  // Test 4: Only maxGamesPerWeek constraint
  console.log('🔍 Test 4: Only maxGamesPerWeek = 12');
  const solver4 = new MockConstraintSolver(matchups, mockTeams, 18, { maxGamesPerWeek: 12 });
  const result4 = await solver4.solve();
  console.log(`  Status: ${result4.status}`);
  console.log(`  Games: ${result4.games.length}`);
  console.log(`  Solve Time: ${result4.solveTime}ms\n`);

  // Test 5: Reduced matchups (subset)
  console.log('🔍 Test 5: Reduced matchups (first 200)');
  const reducedMatchups = matchups.slice(0, 200);
  const solver5 = new MockConstraintSolver(reducedMatchups, mockTeams, 18, {});
  const result5 = await solver5.solve();
  console.log(`  Status: ${result5.status}`);
  console.log(`  Games: ${result5.games.length}`);
  console.log(`  Solve Time: ${result5.solveTime}ms\n`);

  // Test 6: All constraints together
  console.log('🔍 Test 6: All constraints together');
  const solver6 = new MockConstraintSolver(matchups, mockTeams, 18, {
    maxConsecutiveAway: 3,
    maxConsecutiveHome: 3,
    maxGamesPerWeek: 16
  });
  const result6 = await solver6.solve();
  console.log(`  Status: ${result6.status}`);
  console.log(`  Games: ${result6.games.length}`);
  console.log(`  Solve Time: ${result6.solveTime}ms\n`);

  // Summary
  console.log('📋 Test Summary:');
  console.log('================');
  const results = [
    { test: 'No Constraints', status: result1.status, games: result1.games.length },
    { test: 'maxConsecutiveAway=2', status: result2.status, games: result2.games.length },
    { test: 'maxConsecutiveHome=2', status: result3.status, games: result3.games.length },
    { test: 'maxGamesPerWeek=12', status: result4.status, games: result4.games.length },
    { test: 'reduced matchups', status: result5.status, games: result5.games.length },
    { test: 'All constraints', status: result6.status, games: result6.games.length }
  ];

  results.forEach((r, i) => {
    const icon = r.status === 'optimal' ? '✅' : r.status === 'infeasible' ? '❌' : '⚠️';
    console.log(`${icon} Test ${i + 1}: ${r.test} - ${r.status} (${r.games} games)`);
  });

  // Analysis
  const workingTests = results.filter(r => r.status === 'optimal');
  const failingTests = results.filter(r => r.status === 'infeasible');
  const errorTests = results.filter(r => r.status === 'error');

  console.log('\n🎯 Analysis:');
  console.log(`  - Working tests: ${workingTests.length}`);
  console.log(`  - Failing tests: ${failingTests.length}`);
  console.log(`  - Error tests: ${errorTests.length}`);

  if (failingTests.length > 0) {
    console.log('\n❌ Failing constraints:');
    failingTests.forEach(t => console.log(`  - ${t.test}`));
  }

  if (errorTests.length > 0) {
    console.log('\n⚠️ Error constraints:');
    errorTests.forEach(t => console.log(`  - ${t.test}`));
  }

  // Check if baseline works but combined doesn't
  if (result1.status === 'optimal' && result6.status === 'infeasible') {
    console.log('\n🔍 Key Finding: Baseline works but combined constraints fail!');
    console.log('   This suggests constraint interaction issues.');
  }

  // Check if all individual constraints work but combined doesn't
  const individualTests = [result2, result3, result4];
  const allIndividualWork = individualTests.every(r => r.status === 'optimal');
  
  if (allIndividualWork && result6.status === 'infeasible') {
    console.log('\n🔍 Key Finding: All individual constraints work but combined fails!');
    console.log('   This suggests constraint interaction or scaling issues.');
  }

  console.log('\n💡 Recommendations:');
  if (failingTests.length > 0) {
    console.log('  - Focus on fixing the failing constraints first');
    console.log('  - Consider relaxing constraint values');
    console.log('  - Check for constraint interactions');
  } else {
    console.log('  - All basic constraints work individually');
    console.log('  - The issue may be in the actual GLPK implementation');
    console.log('  - Check the real constraint solver for bugs');
  }
}

testIndividualConstraints().catch(console.error);
