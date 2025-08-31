const initGLPK = require('glpk.js');

async function testBinaryBounds() {
  console.log('🧪 Testing Binary Variable Bounds...\n');

  try {
    const glpk = await initGLPK();
    
    // Test 1: Binary variables with explicit bounds
    console.log('🔍 Test 1: Binary with Explicit 0-1 Bounds');
    const problem1 = {
      name: 'Binary_Explicit',
      objective: {
        direction: glpk.GLP_MIN,
        name: 'obj',
        vars: [{ name: 'x1', coef: 1 }, { name: 'x2', coef: 1 }]
      },
      subjectTo: [
        {
          name: 'c1',
          vars: [{ name: 'x1', coef: 1 }, { name: 'x2', coef: 1 }],
          bnds: { type: glpk.GLP_FX, lb: 1, ub: 1 }
        }
      ],
      bounds: [
        { name: 'x1', type: glpk.GLP_DB, lb: 0, ub: 1 },
        { name: 'x2', type: glpk.GLP_DB, lb: 0, ub: 1 }
      ],
      binaries: ['x1', 'x2']
    };
    
    const result1 = glpk.solve(problem1);
    console.log(`  Status: ${getStatusName(result1.result?.status)}`);
    console.log(`  Solution: x1=${result1.result?.vars?.x1}, x2=${result1.result?.vars?.x2}\n`);
    
    // Test 2: Binary variables without explicit bounds
    console.log('🔍 Test 2: Binary without Explicit Bounds');
    const problem2 = {
      name: 'Binary_Implicit',
      objective: {
        direction: glpk.GLP_MIN,
        name: 'obj',
        vars: [{ name: 'x1', coef: 1 }, { name: 'x2', coef: 1 }]
      },
      subjectTo: [
        {
          name: 'c1',
          vars: [{ name: 'x1', coef: 1 }, { name: 'x2', coef: 1 }],
          bnds: { type: glpk.GLP_FX, lb: 1, ub: 1 }
        }
      ],
      // No explicit bounds - rely on binaries declaration
      binaries: ['x1', 'x2']
    };
    
    const result2 = glpk.solve(problem2);
    console.log(`  Status: ${getStatusName(result2.result?.status)}`);
    console.log(`  Solution: x1=${result2.result?.vars?.x1}, x2=${result2.result?.vars?.x2}\n`);
    
    // Test 3: The real NFL problem pattern
    console.log('🔍 Test 3: NFL Pattern (2 matchups, 3 weeks)');
    const problem3 = createNFLPattern(glpk);
    const result3 = glpk.solve(problem3);
    console.log(`  Status: ${getStatusName(result3.result?.status)}`);
    console.log(`  Games scheduled: ${countGames(result3.result?.vars)}\n`);
    
    // Test 4: NFL pattern with explicit bounds
    console.log('🔍 Test 4: NFL Pattern with Explicit Bounds');
    const problem4 = createNFLPatternWithBounds(glpk);
    const result4 = glpk.solve(problem4);
    console.log(`  Status: ${getStatusName(result4.result?.status)}`);
    console.log(`  Games scheduled: ${countGames(result4.result?.vars)}\n`);
    
    console.log('💡 Key Finding:');
    console.log('  Binary variables might need explicit 0-1 bounds in GLPK.js!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

function createNFLPattern(glpk) {
  const matchups = 2;
  const weeks = 3;
  const varNames = [];
  const objectiveVars = [];
  
  for (let m = 0; m < matchups; m++) {
    for (let w = 1; w <= weeks; w++) {
      const varName = `x${m}w${w}`;
      varNames.push(varName);
      objectiveVars.push({ name: varName, coef: 1 });
    }
  }
  
  const constraints = [];
  
  // Each matchup once
  for (let m = 0; m < matchups; m++) {
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
    name: 'NFL_Pattern',
    objective: {
      direction: glpk.GLP_MIN,
      name: 'obj',
      vars: objectiveVars
    },
    subjectTo: constraints,
    binaries: varNames
  };
}

function createNFLPatternWithBounds(glpk) {
  const problem = createNFLPattern(glpk);
  
  // Add explicit bounds for all binary variables
  problem.bounds = [];
  for (const varName of problem.binaries) {
    problem.bounds.push({
      name: varName,
      type: glpk.GLP_DB,
      lb: 0,
      ub: 1
    });
  }
  
  return problem;
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
testBinaryBounds();