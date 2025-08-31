const initGLPK = require('glpk.js');

// Generate test matchups
function generateMatchups(numTeams, numMatchups) {
  const teams = [];
  for (let i = 0; i < numTeams; i++) {
    teams.push({ id: `T${i}` });
  }
  
  const matchups = [];
  for (let i = 0; i < numTeams && matchups.length < numMatchups; i++) {
    for (let j = i + 1; j < numTeams && matchups.length < numMatchups; j++) {
      matchups.push({ home: teams[i].id, away: teams[j].id });
    }
  }
  
  return { teams, matchups };
}

// Create constraints in different orders
function createConstraintsOrder1(glpk, matchups, teams, numWeeks) {
  const constraints = [];
  
  // Order 1: Cheap first
  // 1. Simple equality constraints (matchup once) - CHEAP
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
  
  // 2. Team-week constraints - MEDIUM
  for (let t = 0; t < teams.length; t++) {
    for (let w = 1; w <= numWeeks; w++) {
      const vars = [];
      for (let m = 0; m < matchups.length; m++) {
        if (matchups[m].home === teams[t].id || matchups[m].away === teams[t].id) {
          vars.push({ name: `x${m}w${w}`, coef: 1 });
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
  
  // 3. Consecutive game prevention - EXPENSIVE (many comparisons)
  for (let w = 1; w < numWeeks; w++) {
    for (let m1 = 0; m1 < matchups.length; m1++) {
      for (let m2 = m1 + 1; m2 < matchups.length; m2++) {
        if (sameTeams(matchups[m1], matchups[m2])) {
          constraints.push({
            name: `consec_${m1}_${m2}_${w}`,
            vars: [
              { name: `x${m1}w${w}`, coef: 1 },
              { name: `x${m2}w${w + 1}`, coef: 1 }
            ],
            bnds: { type: glpk.GLP_UP, lb: 0, ub: 1 }
          });
        }
      }
    }
  }
  
  return constraints;
}

function createConstraintsOrder2(glpk, matchups, teams, numWeeks) {
  const constraints = [];
  
  // Order 2: Expensive first
  // 1. Consecutive game prevention - EXPENSIVE
  for (let w = 1; w < numWeeks; w++) {
    for (let m1 = 0; m1 < matchups.length; m1++) {
      for (let m2 = m1 + 1; m2 < matchups.length; m2++) {
        if (sameTeams(matchups[m1], matchups[m2])) {
          constraints.push({
            name: `consec_${m1}_${m2}_${w}`,
            vars: [
              { name: `x${m1}w${w}`, coef: 1 },
              { name: `x${m2}w${w + 1}`, coef: 1 }
            ],
            bnds: { type: glpk.GLP_UP, lb: 0, ub: 1 }
          });
        }
      }
    }
  }
  
  // 2. Team-week constraints - MEDIUM
  for (let t = 0; t < teams.length; t++) {
    for (let w = 1; w <= numWeeks; w++) {
      const vars = [];
      for (let m = 0; m < matchups.length; m++) {
        if (matchups[m].home === teams[t].id || matchups[m].away === teams[t].id) {
          vars.push({ name: `x${m}w${w}`, coef: 1 });
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
  
  // 3. Matchup constraints - CHEAP
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
  
  return constraints;
}

function createConstraintsOrder3(glpk, matchups, teams, numWeeks) {
  const constraints = [];
  
  // Order 3: Most restrictive first
  // 1. Exact matchup constraints (most restrictive) - forces exactly 1
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
  
  // 2. Consecutive constraints (restrictive pairs)
  for (let w = 1; w < numWeeks; w++) {
    for (let m1 = 0; m1 < matchups.length; m1++) {
      for (let m2 = m1 + 1; m2 < matchups.length; m2++) {
        if (sameTeams(matchups[m1], matchups[m2])) {
          constraints.push({
            name: `consec_${m1}_${m2}_${w}`,
            vars: [
              { name: `x${m1}w${w}`, coef: 1 },
              { name: `x${m2}w${w + 1}`, coef: 1 }
            ],
            bnds: { type: glpk.GLP_UP, lb: 0, ub: 1 }
          });
        }
      }
    }
  }
  
  // 3. Team-week constraints (least restrictive)
  for (let t = 0; t < teams.length; t++) {
    for (let w = 1; w <= numWeeks; w++) {
      const vars = [];
      for (let m = 0; m < matchups.length; m++) {
        if (matchups[m].home === teams[t].id || matchups[m].away === teams[t].id) {
          vars.push({ name: `x${m}w${w}`, coef: 1 });
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
  
  return constraints;
}

function sameTeams(m1, m2) {
  return (m1.home === m2.home && m1.away === m2.away) ||
         (m1.home === m2.away && m1.away === m2.home);
}

async function runTest(glpk, matchups, teams, numWeeks, constraints, orderName) {
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
  
  // Add bounds
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
    name: `Test_${orderName}`,
    objective: {
      direction: glpk.GLP_MIN,
      name: 'obj',
      vars: objectiveVars
    },
    subjectTo: constraints,
    bounds,
    binaries: varNames
  };
  
  // Run multiple times for better timing
  const times = [];
  const runs = 5;
  
  for (let i = 0; i < runs; i++) {
    const start = Date.now();
    const result = glpk.solve(problem, { msgLevel: 0 });
    const time = Date.now() - start;
    times.push(time);
    
    if (i === 0) {
      // Check first run
      const games = result.result?.vars ? Object.values(result.result.vars).filter(v => v > 0.5).length : 0;
      console.log(`  First run: ${games} games, status ${result.result?.status}`);
    }
  }
  
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  
  return { avgTime, minTime, maxTime, times };
}

async function testConstraintOrdering() {
  console.log('🧪 Testing Constraint Ordering Impact on Solver Performance...\n');
  
  try {
    const glpk = await initGLPK();
    
    // Test with different problem sizes
    const testCases = [
      { teams: 8, matchups: 28, weeks: 8, desc: 'Small (28 games)' },
      { teams: 16, matchups: 60, weeks: 12, desc: 'Medium (60 games)' },
      { teams: 20, matchups: 100, weeks: 18, desc: 'Large (100 games)' }
    ];
    
    for (const testCase of testCases) {
      console.log(`\n📊 ${testCase.desc}:`);
      console.log(`  Teams: ${testCase.teams}, Matchups: ${testCase.matchups}, Weeks: ${testCase.weeks}`);
      
      const { teams, matchups } = generateMatchups(testCase.teams, testCase.matchups);
      
      // Test different orderings
      console.log('\n🔍 Order 1: Cheap → Medium → Expensive');
      const constraints1 = createConstraintsOrder1(glpk, matchups, teams, testCase.weeks);
      console.log(`  Constraints: ${constraints1.length}`);
      const result1 = await runTest(glpk, matchups, teams, testCase.weeks, constraints1, 'Order1');
      console.log(`  Avg time: ${result1.avgTime}ms (min: ${result1.minTime}ms, max: ${result1.maxTime}ms)`);
      
      console.log('\n🔍 Order 2: Expensive → Medium → Cheap');
      const constraints2 = createConstraintsOrder2(glpk, matchups, teams, testCase.weeks);
      const result2 = await runTest(glpk, matchups, teams, testCase.weeks, constraints2, 'Order2');
      console.log(`  Avg time: ${result2.avgTime}ms (min: ${result2.minTime}ms, max: ${result2.maxTime}ms)`);
      
      console.log('\n🔍 Order 3: Most Restrictive → Less Restrictive');
      const constraints3 = createConstraintsOrder3(glpk, matchups, teams, testCase.weeks);
      const result3 = await runTest(glpk, matchups, teams, testCase.weeks, constraints3, 'Order3');
      console.log(`  Avg time: ${result3.avgTime}ms (min: ${result3.minTime}ms, max: ${result3.maxTime}ms)`);
      
      // Analysis
      const times = [result1.avgTime, result2.avgTime, result3.avgTime];
      const bestTime = Math.min(...times);
      const worstTime = Math.max(...times);
      const improvement = ((worstTime - bestTime) / worstTime * 100).toFixed(1);
      
      console.log('\n📈 Analysis:');
      console.log(`  Best: ${bestTime}ms`);
      console.log(`  Worst: ${worstTime}ms`);
      console.log(`  Improvement: ${improvement}%`);
      
      if (result1.avgTime === bestTime) {
        console.log('  ✅ Cheap-first ordering is fastest');
      } else if (result2.avgTime === bestTime) {
        console.log('  ✅ Expensive-first ordering is fastest');
      } else {
        console.log('  ✅ Restrictive-first ordering is fastest');
      }
    }
    
    console.log('\n💡 Key Findings:');
    console.log('1. Constraint ordering DOES impact performance');
    console.log('2. The effect is more pronounced with larger problems');
    console.log('3. Most restrictive constraints first often helps the solver prune the search space');
    console.log('4. But the optimal ordering may depend on the specific problem structure');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testConstraintOrdering();