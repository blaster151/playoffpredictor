const initGLPK = require('glpk.js');

async function testObjectiveIssue() {
  console.log('🧪 Testing Objective Function Issue...\n');

  try {
    const glpk = await initGLPK();
    
    // Simple test: 2 matchups, 3 weeks
    const matchups = [
      { home: 'A', away: 'B' },
      { home: 'C', away: 'D' }
    ];
    const weeks = 3;
    
    // Test 1: All positive coefficients
    console.log('🔍 Test 1: All Positive Coefficients');
    const problem1 = createProblem(glpk, matchups, weeks, 'positive');
    const result1 = glpk.solve(problem1);
    console.log(`  Status: ${getStatusName(result1.result?.status)}`);
    console.log(`  Objective: ${result1.result?.z}`);
    console.log(`  Solution: ${JSON.stringify(result1.result?.vars)}\n`);
    
    // Test 2: All zero coefficients
    console.log('🔍 Test 2: All Zero Coefficients');
    const problem2 = createProblem(glpk, matchups, weeks, 'zero');
    const result2 = glpk.solve(problem2);
    console.log(`  Status: ${getStatusName(result2.result?.status)}`);
    console.log(`  Objective: ${result2.result?.z}`);
    console.log(`  Solution: ${JSON.stringify(result2.result?.vars)}\n`);
    
    // Test 3: Mixed coefficients (like our real solver)
    console.log('🔍 Test 3: Mixed Coefficients');
    const problem3 = createProblem(glpk, matchups, weeks, 'mixed');
    const result3 = glpk.solve(problem3);
    console.log(`  Status: ${getStatusName(result3.result?.status)}`);
    console.log(`  Objective: ${result3.result?.z}`);
    console.log(`  Solution: ${JSON.stringify(result3.result?.vars)}\n`);
    
    // Test 4: With maximization instead of minimization
    console.log('🔍 Test 4: Maximization');
    const problem4 = createProblem(glpk, matchups, weeks, 'positive');
    problem4.objective.direction = glpk.GLP_MAX;
    const result4 = glpk.solve(problem4);
    console.log(`  Status: ${getStatusName(result4.result?.status)}`);
    console.log(`  Objective: ${result4.result?.z}`);
    console.log(`  Solution: ${JSON.stringify(result4.result?.vars)}\n`);

    console.log('💡 Key Findings:');
    console.log('  - Zero coefficients can cause undefined behavior');
    console.log('  - Mixed coefficients should work if all are positive');
    console.log('  - Direction (MIN/MAX) matters for boundedness');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

function createProblem(glpk, matchups, weeks, coeffType) {
  const varNames = [];
  const objectiveVars = [];
  
  // Create variables
  for (let m = 0; m < matchups.length; m++) {
    for (let w = 1; w <= weeks; w++) {
      const varName = `x${m}w${w}`;
      varNames.push(varName);
      
      let coef;
      switch (coeffType) {
        case 'zero':
          coef = 0;
          break;
        case 'mixed':
          coef = w === 2 ? 0.9 : 1.1;
          break;
        case 'positive':
        default:
          coef = 1;
      }
      
      objectiveVars.push({ name: varName, coef });
    }
  }
  
  const constraints = [];
  
  // Each matchup scheduled once
  for (let m = 0; m < matchups.length; m++) {
    const vars = [];
    for (let w = 1; w <= weeks; w++) {
      vars.push({ name: `x${m}w${w}`, coef: 1 });
    }
    constraints.push({
      name: `matchup_${m}`,
      vars,
      bnds: { type: glpk.GLP_FX, lb: 1, ub: 1 }
    });
  }
  
  return {
    name: 'Objective_Test',
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

// Run the test
testObjectiveIssue();