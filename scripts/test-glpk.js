const GLPK = require('glpk.js');

async function testGLPK() {
  console.log('🧪 Testing GLPK.js...\n');

  try {
    const glpk = GLPK();
    
    // Simple linear programming problem
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

    console.log('Solving problem:', problem.name);
    const result = await glpk.solve(problem);
    
    console.log('✅ GLPK.js is working!');
    console.log('Result:', result);
    console.log('Status:', result.status);
    console.log('Objective value:', result.result.z);
    console.log('Variables:', result.result.vars);
    
  } catch (error) {
    console.error('❌ GLPK.js test failed:', error);
  }
}

testGLPK(); 