const initGLPK = require('glpk.js');

async function testBinaryGLPK() {
  console.log('🧪 Testing Binary Variable GLPK Problem...\n');

  try {
    // Initialize GLPK
    console.log('📋 Step 1: Initializing GLPK...');
    const glpk = await initGLPK();
    console.log('✅ GLPK initialized successfully!\n');

    // Create a simple binary programming problem
    console.log('📋 Step 2: Creating binary problem...');
    const problem = {
      name: 'Binary_Test',
      objective: {
        direction: glpk.GLP_MIN,
        name: 'obj',
        vars: [
          { name: 'x1', coef: 1 },
          { name: 'x2', coef: 2 },
          { name: 'x3', coef: 3 }
        ]
      },
      subjectTo: [
        {
          name: 'c1',
          vars: [
            { name: 'x1', coef: 1 },
            { name: 'x2', coef: 1 }
          ],
          bnds: { type: glpk.GLP_FX, ub: 1, lb: 1 } // exactly one of x1 or x2
        },
        {
          name: 'c2',
          vars: [
            { name: 'x2', coef: 1 },
            { name: 'x3', coef: 1 }
          ],
          bnds: { type: glpk.GLP_UP, ub: 1, lb: 0 } // at most one of x2 or x3
        }
      ],
      binaries: ['x1', 'x2', 'x3'] // All variables are binary
    };

    console.log('Problem:', JSON.stringify(problem, null, 2));
    
    // Solve the problem
    console.log('⚡ Step 3: Solving...');
    const result = await glpk.solve(problem);
    
    console.log('✅ GLPK solve result:');
    console.log('Status:', result.status);
    console.log('Objective value:', result.result.z);
    console.log('Variables:', result.result.vars);
    console.log('Time:', result.time, 'ms');
    
    if (result.status === 'optimal') {
      console.log('\n🎉 Binary GLPK test successful!');
      console.log('Solution interpretation:');
      Object.entries(result.result.vars).forEach(([varName, value]) => {
        console.log(`  ${varName}: ${value > 0.5 ? '1 (selected)' : '0 (not selected)'}`);
      });
    } else {
      console.log('\n❌ Binary GLPK test failed with status:', result.status);
    }

  } catch (error) {
    console.error('❌ Binary GLPK test failed:', error);
  }
}

// Run the test
testBinaryGLPK(); 