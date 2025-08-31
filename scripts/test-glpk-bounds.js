const initGLPK = require('glpk.js');

async function testGLPKBounds() {
  console.log('🧪 Testing GLPK Bounds Issue...\n');

  try {
    const glpk = await initGLPK();
    console.log('✅ GLPK initialized\n');

    // Test 1: Lower bound constraint with ub = 0 (potential issue)
    console.log('🔍 Test 1: Lower Bound with ub = 0');
    try {
      const problem1 = {
        name: 'Test_LB_Zero',
        objective: {
          direction: glpk.GLP_MIN,
          name: 'obj',
          vars: [{ name: 'x1', coef: 1 }, { name: 'x2', coef: 1 }]
        },
        subjectTo: [
          {
            name: 'c1',
            vars: [{ name: 'x1', coef: 1 }, { name: 'x2', coef: 1 }],
            bnds: { type: glpk.GLP_LO, lb: 5, ub: 0 } // This might be wrong!
          }
        ],
        bounds: [
          { name: 'x1', type: glpk.GLP_LO, lb: 0 },
          { name: 'x2', type: glpk.GLP_LO, lb: 0 }
        ]
      };
      
      const result1 = glpk.solve(problem1);
      console.log(`  Status: ${getStatusName(result1.result?.status)}`);
      console.log(`  Objective: ${result1.result?.z}`);
      console.log(`  x1: ${result1.result?.vars?.x1}, x2: ${result1.result?.vars?.x2}\n`);
    } catch (e) {
      console.log(`  ERROR: ${e.message}\n`);
    }

    // Test 2: Lower bound constraint without ub (correct way)
    console.log('🔍 Test 2: Lower Bound without ub');
    const problem2 = {
      name: 'Test_LB_Correct',
      objective: {
        direction: glpk.GLP_MIN,
        name: 'obj',
        vars: [{ name: 'x1', coef: 1 }, { name: 'x2', coef: 1 }]
      },
      subjectTo: [
        {
          name: 'c1',
          vars: [{ name: 'x1', coef: 1 }, { name: 'x2', coef: 1 }],
          bnds: { type: glpk.GLP_LO, lb: 5 } // No ub specified
        }
      ],
      bounds: [
        { name: 'x1', type: glpk.GLP_LO, lb: 0 },
        { name: 'x2', type: glpk.GLP_LO, lb: 0 }
      ]
    };
    
    const result2 = glpk.solve(problem2);
    console.log(`  Status: ${getStatusName(result2.result?.status)}`);
    console.log(`  Objective: ${result2.result?.z}`);
    console.log(`  x1: ${result2.result?.vars?.x1}, x2: ${result2.result?.vars?.x2}\n`);

    // Test 3: Double bound constraint (correct for bye weeks)
    console.log('🔍 Test 3: Double Bound (Correct for Bye Weeks)');
    const problem3 = {
      name: 'Test_DB',
      objective: {
        direction: glpk.GLP_MIN,
        name: 'obj',
        vars: [{ name: 'x1', coef: 1 }, { name: 'x2', coef: 1 }]
      },
      subjectTo: [
        {
          name: 'c1',
          vars: [{ name: 'x1', coef: 1 }, { name: 'x2', coef: 1 }],
          bnds: { type: glpk.GLP_DB, lb: 5, ub: 10 } // Between 5 and 10
        }
      ],
      bounds: [
        { name: 'x1', type: glpk.GLP_LO, lb: 0 },
        { name: 'x2', type: glpk.GLP_LO, lb: 0 }
      ]
    };
    
    const result3 = glpk.solve(problem3);
    console.log(`  Status: ${getStatusName(result3.result?.status)}`);
    console.log(`  Objective: ${result3.result?.z}`);
    console.log(`  x1: ${result3.result?.vars?.x1}, x2: ${result3.result?.vars?.x2}\n`);

    // Test 4: Simulating NFL bye week constraint
    console.log('🔍 Test 4: Simulating NFL Bye Week Constraint');
    
    // Create 16 binary variables (games in a week)
    const weekVars = [];
    const objVars = [];
    for (let i = 1; i <= 16; i++) {
      weekVars.push(`g${i}`);
      objVars.push({ name: `g${i}`, coef: 1 });
    }
    
    const problem4 = {
      name: 'NFL_Bye_Week',
      objective: {
        direction: glpk.GLP_MIN,
        name: 'obj',
        vars: objVars
      },
      subjectTo: [
        {
          name: 'bye_week_games',
          vars: objVars.map(v => ({ name: v.name, coef: 1 })),
          bnds: { type: glpk.GLP_DB, lb: 13, ub: 16 } // 13-16 games (0-6 teams on bye)
        }
      ],
      binaries: weekVars
    };
    
    const result4 = glpk.solve(problem4);
    console.log(`  Status: ${getStatusName(result4.result?.status)}`);
    console.log(`  Games scheduled: ${countBinaryVars(result4.result?.vars)}`);
    console.log(`  Objective: ${result4.result?.z}\n`);

    console.log('💡 Key Finding:');
    console.log('  The issue is likely using GLP_LO with ub=0 instead of:');
    console.log('  1. GLP_LO without ub (for true lower bounds)');
    console.log('  2. GLP_DB with proper lb/ub (for ranged constraints)');

  } catch (error) {
    console.error('❌ Test failed:', error);
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

function countBinaryVars(vars) {
  if (!vars) return 0;
  return Object.values(vars).filter(v => v > 0.5).length;
}

// Run the test
testGLPKBounds();