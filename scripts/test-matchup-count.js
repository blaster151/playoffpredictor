const initGLPK = require('glpk.js');

async function testMatchupCount() {
  console.log('🧪 Testing Impact of Matchup Count on Solver...\n');

  try {
    const glpk = await initGLPK();
    
    // Test with different matchup counts
    const testCases = [
      { teams: 32, matchups: 272, desc: 'Correct (272 = 32*17/2)' },
      { teams: 32, matchups: 244, desc: 'Too few (missing 28)' },
      { teams: 32, matchups: 300, desc: 'Too many (extra 28)' },
      { teams: 32, matchups: 256, desc: 'Close (16 games per team)' }
    ];
    
    for (const testCase of testCases) {
      console.log(`🔍 Test: ${testCase.desc}`);
      console.log(`  Teams: ${testCase.teams}, Matchups: ${testCase.matchups}`);
      
      // Generate test data
      const { teams, matchups } = generateTestData(testCase.teams, testCase.matchups);
      
      // Create and solve problem
      const problem = createSimplifiedProblem(glpk, teams, matchups);
      const result = glpk.solve(problem);
      
      console.log(`  Status: ${getStatusName(result.result?.status)}`);
      console.log(`  Games scheduled: ${countGames(result.result?.vars)}`);
      
      // Check feasibility
      const totalGamesNeeded = teams.length * 17;
      const totalGamesProvided = matchups.length * 2; // Each matchup = 2 team games
      console.log(`  Games needed: ${totalGamesNeeded}, Games provided: ${totalGamesProvided}`);
      console.log(`  Feasible: ${totalGamesProvided >= totalGamesNeeded ? 'YES' : 'NO'}\n`);
    }
    
    console.log('💡 Key Finding:');
    console.log('  If matchups < 272, the 17-game constraint becomes infeasible!');
    console.log('  This could cause the unbounded status.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

function generateTestData(numTeams, numMatchups) {
  const teams = [];
  for (let i = 0; i < numTeams; i++) {
    teams.push({ id: `T${i}`, name: `Team ${i}` });
  }
  
  const matchups = [];
  let m = 0;
  
  // Generate matchups in round-robin fashion
  for (let i = 0; i < numTeams && m < numMatchups; i++) {
    for (let j = i + 1; j < numTeams && m < numMatchups; j++) {
      matchups.push({ home: teams[i].id, away: teams[j].id });
      m++;
    }
  }
  
  return { teams, matchups };
}

function createSimplifiedProblem(glpk, teams, matchups) {
  const numWeeks = 18;
  const varNames = [];
  const objectiveVars = [];
  
  // Create variables
  for (let m = 0; m < matchups.length; m++) {
    for (let w = 1; w <= numWeeks; w++) {
      const varName = `x${m}w${w}`;
      varNames.push(varName);
      objectiveVars.push({ name: varName, coef: 1 });
    }
  }
  
  const constraints = [];
  
  // 1. Each matchup scheduled once
  for (let m = 0; m < matchups.length; m++) {
    const vars = [];
    for (let w = 1; w <= numWeeks; w++) {
      vars.push({ name: `x${m}w${w}`, coef: 1 });
    }
    constraints.push({
      name: `matchup_${m}`,
      vars,
      bnds: { type: glpk.GLP_FX, lb: 1, ub: 1 }
    });
  }
  
  // 2. Each team plays exactly 17 games
  for (let t = 0; t < teams.length; t++) {
    const vars = [];
    for (let m = 0; m < matchups.length; m++) {
      if (matchups[m].home === teams[t].id || matchups[m].away === teams[t].id) {
        for (let w = 1; w <= numWeeks; w++) {
          vars.push({ name: `x${m}w${w}`, coef: 1 });
        }
      }
    }
    
    if (vars.length > 0) {
      // Key: If not enough matchups, this constraint is infeasible!
      constraints.push({
        name: `games_${t}`,
        vars,
        bnds: { type: glpk.GLP_FX, lb: 17, ub: 17 }
      });
    }
  }
  
  return {
    name: 'Matchup_Count_Test',
    objective: {
      direction: glpk.GLP_MIN,
      name: 'obj',
      vars: objectiveVars
    },
    subjectTo: constraints,
    binaries: varNames
  };
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

function countGames(vars) {
  if (!vars) return 0;
  return Object.values(vars).filter(v => v > 0.5).length;
}

// Run the test
testMatchupCount();