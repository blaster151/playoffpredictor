const initGLPK = require('glpk.js');

// Mock NFL teams data (32 teams)
const teams = [
  // AFC East
  { id: 'BUF', name: 'Buffalo Bills', conference: 'AFC', division: 'East' },
  { id: 'MIA', name: 'Miami Dolphins', conference: 'AFC', division: 'East' },
  { id: 'NE', name: 'New England Patriots', conference: 'AFC', division: 'East' },
  { id: 'NYJ', name: 'New York Jets', conference: 'AFC', division: 'East' },
  // AFC North
  { id: 'BAL', name: 'Baltimore Ravens', conference: 'AFC', division: 'North' },
  { id: 'CIN', name: 'Cincinnati Bengals', conference: 'AFC', division: 'North' },
  { id: 'CLE', name: 'Cleveland Browns', conference: 'AFC', division: 'North' },
  { id: 'PIT', name: 'Pittsburgh Steelers', conference: 'AFC', division: 'North' },
  // AFC South
  { id: 'HOU', name: 'Houston Texans', conference: 'AFC', division: 'South' },
  { id: 'IND', name: 'Indianapolis Colts', conference: 'AFC', division: 'South' },
  { id: 'JAX', name: 'Jacksonville Jaguars', conference: 'AFC', division: 'South' },
  { id: 'TEN', name: 'Tennessee Titans', conference: 'AFC', division: 'South' },
  // AFC West
  { id: 'DEN', name: 'Denver Broncos', conference: 'AFC', division: 'West' },
  { id: 'KC', name: 'Kansas City Chiefs', conference: 'AFC', division: 'West' },
  { id: 'LAC', name: 'Los Angeles Chargers', conference: 'AFC', division: 'West' },
  { id: 'LV', name: 'Las Vegas Raiders', conference: 'AFC', division: 'West' },
  // NFC East
  { id: 'DAL', name: 'Dallas Cowboys', conference: 'NFC', division: 'East' },
  { id: 'NYG', name: 'New York Giants', conference: 'NFC', division: 'East' },
  { id: 'PHI', name: 'Philadelphia Eagles', conference: 'NFC', division: 'East' },
  { id: 'WAS', name: 'Washington Commanders', conference: 'NFC', division: 'East' },
  // NFC North
  { id: 'CHI', name: 'Chicago Bears', conference: 'NFC', division: 'North' },
  { id: 'DET', name: 'Detroit Lions', conference: 'NFC', division: 'North' },
  { id: 'GB', name: 'Green Bay Packers', conference: 'NFC', division: 'North' },
  { id: 'MIN', name: 'Minnesota Vikings', conference: 'NFC', division: 'North' },
  // NFC South
  { id: 'ATL', name: 'Atlanta Falcons', conference: 'NFC', division: 'South' },
  { id: 'CAR', name: 'Carolina Panthers', conference: 'NFC', division: 'South' },
  { id: 'NO', name: 'New Orleans Saints', conference: 'NFC', division: 'South' },
  { id: 'TB', name: 'Tampa Bay Buccaneers', conference: 'NFC', division: 'South' },
  // NFC West
  { id: 'ARI', name: 'Arizona Cardinals', conference: 'NFC', division: 'West' },
  { id: 'LAR', name: 'Los Angeles Rams', conference: 'NFC', division: 'West' },
  { id: 'SF', name: 'San Francisco 49ers', conference: 'NFC', division: 'West' },
  { id: 'SEA', name: 'Seattle Seahawks', conference: 'NFC', division: 'West' }
];

// Generate exactly 272 matchups
function generateNFLMatchups() {
  const matchups = [];
  const teamGames = {};
  teams.forEach(t => teamGames[t.id] = 0);
  
  // Add all matchups ensuring each team gets 17 games
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      if (teamGames[teams[i].id] < 17 && teamGames[teams[j].id] < 17) {
        matchups.push({ home: teams[i].id, away: teams[j].id });
        teamGames[teams[i].id]++;
        teamGames[teams[j].id]++;
        
        if (matchups.length >= 272) break;
      }
    }
    if (matchups.length >= 272) break;
  }
  
  // Fill remaining to exactly 272
  while (matchups.length < 272) {
    for (let i = 0; i < teams.length && matchups.length < 272; i++) {
      for (let j = i + 1; j < teams.length && matchups.length < 272; j++) {
        if (teamGames[teams[i].id] < 17 && teamGames[teams[j].id] < 17) {
          const exists = matchups.some(m => 
            (m.home === teams[i].id && m.away === teams[j].id) ||
            (m.home === teams[j].id && m.away === teams[i].id)
          );
          if (!exists) {
            matchups.push({ home: teams[j].id, away: teams[i].id });
            teamGames[teams[i].id]++;
            teamGames[teams[j].id]++;
          }
        }
      }
    }
  }
  
  return matchups.slice(0, 272);
}

// Simulate the full constraint solver
async function runFullSolver(glpk, matchups, teams) {
  const numMatchups = matchups.length;
  const numTeams = teams.length;
  const numWeeks = 18;
  
  const varNames = [];
  const objectiveVars = [];
  
  // Create variables: x[matchup][week]
  for (let m = 0; m < numMatchups; m++) {
    for (let w = 1; w <= numWeeks; w++) {
      const varName = `x_${m}_${w}`;
      varNames.push(varName);
      
      // Smart objective
      let coef = 1;
      if (w <= 3 || w >= 16) coef = 1.1;
      else if (w >= 6 && w <= 12) coef = 0.9;
      
      objectiveVars.push({ name: varName, coef });
    }
  }
  
  const constraints = [];
  
  // 1. Each matchup scheduled exactly once
  for (let m = 0; m < numMatchups; m++) {
    const vars = [];
    for (let w = 1; w <= numWeeks; w++) {
      vars.push({ name: `x_${m}_${w}`, coef: 1 });
    }
    constraints.push({
      name: `matchup_${m}`,
      vars,
      bnds: { type: glpk.GLP_FX, lb: 1, ub: 1 }
    });
  }
  
  // 2. Each team plays at most once per week
  for (let t = 0; t < numTeams; t++) {
    for (let w = 1; w <= numWeeks; w++) {
      const vars = [];
      for (let m = 0; m < numMatchups; m++) {
        if (matchups[m].home === teams[t].id || matchups[m].away === teams[t].id) {
          vars.push({ name: `x_${m}_${w}`, coef: 1 });
        }
      }
      if (vars.length > 0) {
        constraints.push({
          name: `team_${t}_week_${w}`,
          vars,
          bnds: { type: glpk.GLP_UP, lb: 0, ub: 1 }
        });
      }
    }
  }
  
  // 3. Each team plays exactly 17 games
  for (let t = 0; t < numTeams; t++) {
    const vars = [];
    for (let m = 0; m < numMatchups; m++) {
      if (matchups[m].home === teams[t].id || matchups[m].away === teams[t].id) {
        for (let w = 1; w <= numWeeks; w++) {
          vars.push({ name: `x_${m}_${w}`, coef: 1 });
        }
      }
    }
    if (vars.length > 0) {
      constraints.push({
        name: `games_${t}`,
        vars,
        bnds: { type: glpk.GLP_FX, lb: 17, ub: 17 }
      });
    }
  }
  
  // 4. Bye week constraints
  for (let w = 1; w <= numWeeks; w++) {
    const weekVars = [];
    for (let m = 0; m < numMatchups; m++) {
      weekVars.push({ name: `x_${m}_${w}`, coef: 1 });
    }
    
    if (w >= 4 && w <= 14) {
      // Bye weeks allowed
      constraints.push({
        name: `bye_week_${w}`,
        vars: weekVars,
        bnds: { type: glpk.GLP_DB, lb: 13, ub: 16 }
      });
    } else {
      // No bye weeks
      constraints.push({
        name: `no_bye_week_${w}`,
        vars: weekVars,
        bnds: { type: glpk.GLP_FX, lb: 16, ub: 16 }
      });
    }
  }
  
  // 5. Consecutive game prevention
  for (let w = 1; w < numWeeks; w++) {
    for (let m1 = 0; m1 < numMatchups; m1++) {
      for (let m2 = m1 + 1; m2 < numMatchups; m2++) {
        const matchup1 = matchups[m1];
        const matchup2 = matchups[m2];
        
        // Check if same teams
        if ((matchup1.home === matchup2.home && matchup1.away === matchup2.away) ||
            (matchup1.home === matchup2.away && matchup1.away === matchup2.home)) {
          constraints.push({
            name: `no_consecutive_${m1}_${m2}_${w}`,
            vars: [
              { name: `x_${m1}_${w}`, coef: 1 },
              { name: `x_${m2}_${w + 1}`, coef: 1 }
            ],
            bnds: { type: glpk.GLP_UP, lb: 0, ub: 1 }
          });
        }
      }
    }
  }
  
  // Add explicit bounds (THE FIX!)
  const bounds = [];
  for (const varName of varNames) {
    bounds.push({
      name: varName,
      type: glpk.GLP_DB,
      lb: 0,
      ub: 1
    });
  }
  
  const problem = {
    name: 'NFL_Schedule_Full',
    objective: {
      direction: glpk.GLP_MIN,
      name: 'schedule_cost',
      vars: objectiveVars
    },
    subjectTo: constraints,
    bounds,
    binaries: varNames
  };
  
  // Solve with timing
  const startTime = Date.now();
  const result = glpk.solve(problem, { msgLevel: glpk.GLP_MSG_ERR });
  const solveTime = Date.now() - startTime;
  
  // Count scheduled games
  let gamesScheduled = 0;
  if (result.result?.vars) {
    gamesScheduled = Object.values(result.result.vars).filter(v => v > 0.5).length;
  }
  
  return {
    status: result.result?.status,
    gamesScheduled,
    solveTime,
    objective: result.result?.z,
    variables: varNames.length,
    constraints: constraints.length
  };
}

// Performance test
async function testSolverPerformance() {
  console.log('🧪 Testing NFL Constraint Solver Performance...\n');
  
  try {
    const glpk = await initGLPK();
    const matchups = generateNFLMatchups();
    
    console.log(`📊 Test Setup:`);
    console.log(`  - Teams: ${teams.length}`);
    console.log(`  - Matchups: ${matchups.length}`);
    console.log(`  - Weeks: 18`);
    console.log(`  - Expected games: 272\n`);
    
    // Run multiple tests
    const numTests = 5;
    const results = [];
    
    console.log('🏃 Running performance tests...\n');
    
    for (let i = 0; i < numTests; i++) {
      console.log(`Test ${i + 1}/${numTests}...`);
      const result = await runFullSolver(glpk, matchups, teams);
      results.push(result);
      
      console.log(`  Status: ${getStatusName(result.status)}`);
      console.log(`  Games scheduled: ${result.gamesScheduled}`);
      console.log(`  Time: ${result.solveTime}ms`);
      console.log(`  Objective: ${result.objective}\n`);
    }
    
    // Calculate statistics
    const times = results.map(r => r.solveTime);
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    const allGamesScheduled = results.every(r => r.gamesScheduled === 272);
    
    console.log('📈 Performance Summary:');
    console.log('====================');
    console.log(`  Variables: ${results[0].variables.toLocaleString()}`);
    console.log(`  Constraints: ${results[0].constraints.toLocaleString()}`);
    console.log(`  All 272 games scheduled: ${allGamesScheduled ? '✅ YES' : '❌ NO'}`);
    console.log(`\n  Solve Times:`);
    console.log(`    Average: ${avgTime.toFixed(1)}ms`);
    console.log(`    Minimum: ${minTime}ms`);
    console.log(`    Maximum: ${maxTime}ms`);
    console.log(`    Range: ${(maxTime - minTime)}ms`);
    
    if (avgTime < 100) {
      console.log('\n⚡ Excellent performance! Sub-100ms average.');
    } else if (avgTime < 500) {
      console.log('\n✅ Good performance! Sub-500ms average.');
    } else if (avgTime < 1000) {
      console.log('\n⚠️  Acceptable performance. Sub-1s average.');
    } else {
      console.log('\n❌ Poor performance. Over 1s average.');
    }
    
    // Problem size analysis
    console.log('\n📊 Problem Complexity:');
    console.log(`  - Binary variables: ${(272 * 18).toLocaleString()} (matchups × weeks)`);
    console.log(`  - Matchup constraints: 272 (each game scheduled once)`);
    console.log(`  - Team-week constraints: 576 (32 teams × 18 weeks)`);
    console.log(`  - Team-game constraints: 32 (17 games per team)`);
    console.log(`  - Bye week constraints: 18 (one per week)`);
    console.log(`  - Consecutive game constraints: ~${(272 * 17).toLocaleString()}`);
    
  } catch (error) {
    console.error('❌ Performance test failed:', error);
  }
}

function getStatusName(status) {
  const names = {
    1: 'OPTIMAL',
    2: 'FEASIBLE',
    3: 'INFEASIBLE',
    4: 'UNBOUNDED',
    5: 'UNDEFINED'
  };
  return names[status] || 'UNKNOWN';
}

// Run the test
testSolverPerformance();