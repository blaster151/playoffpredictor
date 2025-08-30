const initGLPK = require('glpk.js');

// Generate exactly 272 matchups for 32 teams
function generate272Matchups() {
  const matchups = [];
  const teams = [];
  
  // Create 32 team IDs
  for (let i = 0; i < 32; i++) {
    teams.push(`T${i}`);
  }
  
  // Generate matchups ensuring each team gets 17 games
  const teamGames = {};
  teams.forEach(t => teamGames[t] = 0);
  
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      if (teamGames[teams[i]] < 17 && teamGames[teams[j]] < 17) {
        matchups.push({ home: teams[i], away: teams[j] });
        teamGames[teams[i]]++;
        teamGames[teams[j]]++;
        if (matchups.length >= 272) break;
      }
    }
    if (matchups.length >= 272) break;
  }
  
  return { teams, matchups: matchups.slice(0, 272) };
}

// Simplified solver without all constraints
async function runSimplifiedSolver(glpk, matchups, numWeeks) {
  const numMatchups = matchups.length;
  const varNames = [];
  const objectiveVars = [];
  
  // Create variables
  for (let m = 0; m < numMatchups; m++) {
    for (let w = 1; w <= numWeeks; w++) {
      const varName = `x${m}w${w}`;
      varNames.push(varName);
      objectiveVars.push({ name: varName, coef: 1 });
    }
  }
  
  const constraints = [];
  
  // Only constraint: each matchup scheduled once
  for (let m = 0; m < numMatchups; m++) {
    const vars = [];
    for (let w = 1; w <= numWeeks; w++) {
      vars.push({ name: `x${m}w${w}`, coef: 1 });
    }
    constraints.push({
      name: `m${m}`,
      vars,
      bnds: { type: glpk.GLP_FX, lb: 1, ub: 1 }
    });
  }
  
  // Add bounds (the fix)
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
    name: 'NFL_Simple',
    objective: {
      direction: glpk.GLP_MIN,
      name: 'obj',
      vars: objectiveVars
    },
    subjectTo: constraints,
    bounds,
    binaries: varNames
  };
  
  const startTime = Date.now();
  const result = glpk.solve(problem, { msgLevel: 0 }); // Suppress output
  const solveTime = Date.now() - startTime;
  
  let gamesScheduled = 0;
  if (result.result?.vars) {
    gamesScheduled = Object.values(result.result.vars).filter(v => v > 0.5).length;
  }
  
  return {
    status: result.result?.status,
    gamesScheduled,
    solveTime,
    variables: varNames.length,
    constraints: constraints.length
  };
}

// Test with progressively more constraints
async function testSolverTiming() {
  console.log('🧪 Testing Constraint Solver Timing with 272 NFL Games...\n');
  
  try {
    const glpk = await initGLPK();
    const { teams, matchups } = generate272Matchups();
    
    console.log(`📊 Test Data:`);
    console.log(`  - Matchups: ${matchups.length}`);
    console.log(`  - Weeks: 18`);
    console.log(`  - Variables: ${matchups.length * 18} (4,896)\n`);
    
    // Test 1: Minimal constraints
    console.log('🔍 Test 1: Minimal Constraints (matchups only)');
    const result1 = await runSimplifiedSolver(glpk, matchups, 18);
    console.log(`  Status: ${getStatusName(result1.status)}`);
    console.log(`  Games scheduled: ${result1.gamesScheduled}`);
    console.log(`  Time: ${result1.solveTime}ms`);
    console.log(`  Constraints: ${result1.constraints}\n`);
    
    // Test 2: Smaller problem
    console.log('🔍 Test 2: Reduced Problem (100 matchups)');
    const result2 = await runSimplifiedSolver(glpk, matchups.slice(0, 100), 18);
    console.log(`  Status: ${getStatusName(result2.status)}`);
    console.log(`  Games scheduled: ${result2.gamesScheduled}`);
    console.log(`  Time: ${result2.solveTime}ms`);
    console.log(`  Variables: ${result2.variables}\n`);
    
    // Test 3: Very small problem
    console.log('🔍 Test 3: Small Problem (50 matchups)');
    const result3 = await runSimplifiedSolver(glpk, matchups.slice(0, 50), 18);
    console.log(`  Status: ${getStatusName(result3.status)}`);
    console.log(`  Games scheduled: ${result3.gamesScheduled}`);
    console.log(`  Time: ${result3.solveTime}ms\n`);
    
    // Analyze scaling
    console.log('📈 Performance Analysis:');
    console.log('======================');
    
    if (result1.gamesScheduled === 272) {
      console.log('✅ Successfully schedules all 272 games!');
    } else {
      console.log(`⚠️  Only scheduled ${result1.gamesScheduled} of 272 games`);
    }
    
    console.log(`\nTiming by Problem Size:`);
    console.log(`  50 matchups: ${result3.solveTime}ms`);
    console.log(`  100 matchups: ${result2.solveTime}ms`);
    console.log(`  272 matchups: ${result1.solveTime}ms`);
    
    const scalingFactor = result1.solveTime / result3.solveTime;
    console.log(`\nScaling: ${scalingFactor.toFixed(1)}x slower for 5.4x more matchups`);
    
    if (result1.solveTime < 100) {
      console.log('\n⚡ Excellent! Even full problem solves in under 100ms');
    } else if (result1.solveTime < 500) {
      console.log('\n✅ Good performance for scheduling 272 games');
    } else {
      console.log('\n⚠️  May need optimization for production use');
    }
    
    console.log('\n💡 Note: This is with minimal constraints.');
    console.log('   Full solver with all NFL constraints will be slower.');
    
  } catch (error) {
    console.error('❌ Timing test failed:', error);
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
testSolverTiming();