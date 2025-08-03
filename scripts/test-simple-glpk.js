const initGLPK = require('glpk.js');

async function testSimpleGLPK() {
  console.log('🧪 Testing Simple GLPK Problem...\n');

  try {
    // Initialize GLPK
    console.log('📋 Step 1: Initializing GLPK...');
    const glpk = await initGLPK();
    console.log('✅ GLPK initialized successfully!\n');

    // Create a simple linear programming problem
    console.log('📋 Step 2: Creating simple problem...');
    const problem = {
      name: 'Simple_Test',
      objective: {
        direction: glpk.GLP_MIN,
        name: 'obj',
        vars: [
          { name: 'x1', coef: 1 },
          { name: 'x2', coef: 2 }
        ]
      },
      subjectTo: [
        {
          name: 'c1',
          vars: [
            { name: 'x1', coef: 1 },
            { name: 'x2', coef: 1 }
          ],
          bnds: { type: glpk.GLP_UP, ub: 10 }
        },
        {
          name: 'c2',
          vars: [
            { name: 'x1', coef: 2 },
            { name: 'x2', coef: 1 }
          ],
          bnds: { type: glpk.GLP_UP, ub: 15 }
        }
      ],
      bounds: [
        { name: 'x1', type: glpk.GLP_LO, lb: 0 },
        { name: 'x2', type: glpk.GLP_LO, lb: 0 }
      ]
    };

    console.log('Problem:', problem);
    
    // Solve the problem
    console.log('⚡ Step 3: Solving...');
    const result = await glpk.solve(problem);
    
    console.log('✅ GLPK solve result:');
    console.log('Status:', result.status);
    console.log('Objective value:', result.result.z);
    console.log('Variables:', result.result.vars);
    console.log('Time:', result.time, 'ms');
    
    if (result.status === 'optimal') {
      console.log('\n🎉 Simple GLPK test successful!');
    } else {
      console.log('\n❌ Simple GLPK test failed with status:', result.status);
    }

  } catch (error) {
    console.error('❌ Simple GLPK test failed:', error);
  }
}

// Run the test
testSimpleGLPK(); 