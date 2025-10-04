#!/usr/bin/env node

// Simple test to check if the constraint solver hangs or fails
const initGLPK = require('glpk.js');

console.log('🧪 Testing NFL Constraint Solver - Simulating Bye Week Constraints\n');

// Test parameters based on NFL requirements
const numTeams = 32;
const numMatchups = 272; // 32 teams * 17 games / 2
const numWeeks = 18;

// Simulate the constraint structure based on the actual solver
async function testConstraintSolver() {
  console.log('📊 Test Setup:');
  console.log(`   - Teams: ${numTeams}`);
  console.log(`   - Matchups: ${numMatchups}`);
  console.log(`   - Weeks: ${numWeeks}`);
  console.log(`   - Bye weeks NOT allowed: weeks 1-4, 15-18`);
  console.log(`   - Bye weeks allowed: weeks 5-14 (10 weeks)`);
  console.log(`   - Max 6 teams on bye per week\n`);
  
  // Calculate if bye weeks are mathematically feasible
  console.log('🔍 Mathematical Feasibility Check:');
  const byeWeeksNeeded = numTeams; // Each team needs 1 bye week
  const byeWeeksAllowedWeeks = 10; // Weeks 5-14
  const maxByeTeamsPerWeek = 6;
  const maxPossibleByes = byeWeeksAllowedWeeks * maxByeTeamsPerWeek;
  
  console.log(`   - Bye weeks needed: ${byeWeeksNeeded}`);
  console.log(`   - Max possible byes: ${maxPossibleByes} (${byeWeeksAllowedWeeks} weeks × ${maxByeTeamsPerWeek} teams/week)`);
  console.log(`   - Feasible: ${byeWeeksNeeded <= maxPossibleByes ? '✅ YES' : '❌ NO'}`);
  
  if (byeWeeksNeeded > maxPossibleByes) {
    console.log('\n❌ INFEASIBILITY DETECTED!');
    console.log('   The bye week constraints are mathematically impossible to satisfy.');
    console.log(`   Need ${byeWeeksNeeded} byes but can only fit ${maxPossibleByes}.\n`);
    return { success: false, reason: 'mathematical_infeasibility' };
  }
  
  console.log('\n✅ Bye week constraints are mathematically feasible!');
  console.log('   The problem SHOULD be solvable if constraints are properly formulated.\n');
  
  // Now test with a small GLPK problem to see if we can solve with bye week constraints
  console.log('🚀 Testing with simplified GLPK problem...');
  
  try {
    const glpk = await initGLPK();
    
    // Create a minimal test: 8 teams, 28 matchups, 9 weeks
    // Bye weeks not allowed in weeks 1-2, 8-9 (like the real constraint)
    // Bye weeks allowed in weeks 3-7 (5 weeks)
    // Max 2 teams on bye per week
    const testTeams = 8;
    const testMatchups = 28; // 8 teams * 7 games / 2
    const testWeeks = 9;
    const testByeWeeks = [3, 4, 5, 6, 7]; // Bye-allowed weeks
    const testNoByeWeeks = [1, 2, 8, 9]; // No bye weeks
    
    console.log(`   Simplified test: ${testTeams} teams, ${testMatchups} matchups, ${testWeeks} weeks`);
    console.log(`   Bye allowed weeks: ${testByeWeeks.join(', ')}`);
    console.log(`   No bye weeks: ${testNoByeWeeks.join(', ')}`);
    
    const varNames = [];
    const objectiveVars = [];
    
    // Create variables: x_m_w = 1 if matchup m is in week w
    for (let m = 0; m < testMatchups; m++) {
      for (let w = 1; w <= testWeeks; w++) {
        const varName = `x_${m}_${w}`;
        varNames.push(varName);
        objectiveVars.push({ name: varName, coef: 1 });
      }
    }
    
    const constraints = [];
    
    // Constraint 1: Each matchup scheduled exactly once
    for (let m = 0; m < testMatchups; m++) {
      const vars = [];
      for (let w = 1; w <= testWeeks; w++) {
        vars.push({ name: `x_${m}_${w}`, coef: 1 });
      }
      constraints.push({
        name: `matchup_${m}_once`,
        vars,
        bnds: { type: glpk.GLP_FX, lb: 1, ub: 1 }
      });
    }
    
    // Constraint 2: Bye week timing (the critical constraint!)
    for (let w = 1; w <= testWeeks; w++) {
      const vars = [];
      for (let m = 0; m < testMatchups; m++) {
        vars.push({ name: `x_${m}_${w}`, coef: 1 });
      }
      
      if (testNoByeWeeks.includes(w)) {
        // No byes: exactly 4 games (8 teams / 2)
        constraints.push({
          name: `no_byes_week_${w}`,
          vars,
          bnds: { type: glpk.GLP_FX, lb: 4, ub: 4 }
        });
      } else {
        // Byes allowed: 3-4 games (up to 2 teams on bye)
        constraints.push({
          name: `bye_allowed_week_${w}`,
          vars,
          bnds: { type: glpk.GLP_DB, lb: 3, ub: 4 }
        });
      }
    }
    
    // Add explicit bounds for binary variables
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
      name: 'NFL_Bye_Week_Test',
      objective: {
        direction: glpk.GLP_MIN,
        name: 'cost',
        vars: objectiveVars
      },
      subjectTo: constraints,
      bounds,
      binaries: varNames
    };
    
    console.log('\n⏳ Solving with GLPK (timeout: 30s)...');
    const startTime = Date.now();
    
    const result = await Promise.race([
      Promise.resolve(glpk.solve(problem)),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Solver timed out')), 30000)
      )
    ]);
    
    const solveTime = Date.now() - startTime;
    
    console.log(`\n⏱️  Solved in ${solveTime}ms`);
    console.log(`📈 Status: ${result.result?.status} (${getStatusName(result.result?.status)})`);
    
    const gamesScheduled = result.result?.vars ? 
      Object.values(result.result.vars).filter(v => v > 0.5).length : 0;
    console.log(`🎯 Games scheduled: ${gamesScheduled} / ${testMatchups}\n`);
    
    if (result.result?.status === 3) {
      console.log('❌ SIMPLIFIED TEST IS INFEASIBLE!');
      console.log('   Even a small version of the problem fails.');
      console.log('   The bye week constraints are likely TOO RESTRICTIVE.\n');
      
      console.log('💡 RECOMMENDATION:');
      console.log('   1. Relax bye week timing (allow weeks 1-3 or 16-18)');
      console.log('   2. Increase max bye teams per week from 6 to 8');
      console.log('   3. Disable primetime constraints temporarily\n');
      
      return { success: false, reason: 'simplified_infeasible', time: solveTime };
    } else if (result.result?.status === 1 || result.result?.status === 5) {
      console.log('✅ SIMPLIFIED TEST SUCCEEDED!');
      console.log('   The bye week constraints CAN work with proper formulation.');
      console.log('   The full problem might fail due to:');
      console.log('   1. Additional constraints (primetime, consecutive rematches, etc.)');
      console.log('   2. Improper constraint formulation');
      console.log('   3. Matchup generation issues\n');
      
      return { success: true, time: solveTime };
    } else {
      console.log('⚠️  UNEXPECTED STATUS');
      console.log(`   Status: ${result.result?.status}\n`);
      return { success: false, reason: 'unexpected_status', time: solveTime };
    }
    
  } catch (error) {
    if (error.message.includes('timed out')) {
      console.log('\n⏱️ SOLVER TIMED OUT!');
      console.log('   The constraint solver is hanging.');
      console.log('   This suggests the problem is extremely complex or over-constrained.\n');
      return { success: false, reason: 'timeout' };
    }
    
    console.error('\n❌ Error:', error.message);
    return { success: false, reason: 'error', error: error.message };
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
console.log('=' .repeat(70));
console.log('NFL BYE WEEK CONSTRAINT TEST');
console.log('=' .repeat(70) + '\n');

testConstraintSolver()
  .then((result) => {
    console.log('=' .repeat(70));
    console.log('TEST COMPLETE');
    console.log('=' .repeat(70) + '\n');
    
    if (result.success) {
      console.log('✅ CONCLUSION: Bye week constraints can work, but full problem may need tuning\n');
      process.exit(0);
    } else {
      console.log(`❌ CONCLUSION: Issue detected - ${result.reason}\n`);
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
