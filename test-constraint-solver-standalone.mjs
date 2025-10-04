#!/usr/bin/env node

// Standalone test for the constraint solver using ESM imports
import initGLPK from 'glpk.js';
import { createScheduleConfig, generateMatchups } from './src/utils/scheduleGenerator.ts';
import { ScheduleConstraintSolver } from './src/utils/scheduleConstraintSolver.ts';
import { teams } from './src/data/nflData.ts';

// Mock prior year standings
const mockPriorYearStandings = {};
teams.forEach((team, index) => {
  const divisionRank = (index % 4) + 1;
  mockPriorYearStandings[team.id] = divisionRank;
});

async function testConstraintSolver() {
  console.log('🧪 Testing NFL Constraint Solver with Bye Week Constraints...\n');
  
  try {
    // Generate matchups
    console.log('📋 Step 1: Generating matchups...');
    const config = createScheduleConfig(teams, 2025, mockPriorYearStandings);
    const matchups = generateMatchups(config);
    console.log(`✅ Generated ${matchups.length} matchups (expected: 272)\n`);
    
    // Create solver with all constraints enabled
    console.log('🔧 Step 2: Creating constraint solver...');
    const solver = new ScheduleConstraintSolver(matchups, teams, 18, {
      maxConsecutiveAway: 3,
      maxConsecutiveHome: 3,
      maxGamesPerWeek: 16,
      byeWeekDistribution: 'balanced',
      preventConsecutiveRematches: true,
      // Default primetime constraints are included
    });
    console.log('✅ Solver created with ALL constraints enabled\n');
    
    // Run diagnostics
    console.log('🔍 Step 3: Running diagnostics...');
    const diagnostics = await solver.diagnoseConstraints();
    console.log(`   - Total variables: ${diagnostics.totalVariables}`);
    console.log(`   - Total constraints: ${diagnostics.totalConstraints}`);
    console.log(`   - Matchups: ${diagnostics.totalMatchups} / ${diagnostics.requiredMatchups} required`);
    
    if (diagnostics.feasibilityIssues.length > 0) {
      console.log('\n⚠️ Feasibility Issues Found:');
      diagnostics.feasibilityIssues.forEach(issue => console.log(`  - ${issue}`));
    } else {
      console.log('   - No obvious feasibility issues\n');
    }
    
    // Attempt to solve
    console.log('🚀 Step 4: Attempting to solve (with 120s timeout)...');
    console.log('   This will test if the solver hangs or fails with current constraints...\n');
    
    const startTime = Date.now();
    const solution = await Promise.race([
      solver.solve(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Solver timed out after 120s')), 120000)
      )
    ]);
    const totalTime = Date.now() - startTime;
    
    console.log(`\n⏱️  Solver completed in ${totalTime}ms (${(totalTime/1000).toFixed(1)}s)`);
    console.log(`📈 Status: ${solution.status}`);
    console.log(`🎯 Games scheduled: ${solution.games.length} / 272 expected`);
    console.log(`💯 Objective: ${solution.objective}`);
    
    if (solution.status === 'infeasible') {
      console.log('\n❌ SOLVER IS INFEASIBLE!');
      console.log('   The constraints are mathematically incompatible.');
      console.log('   This is likely due to the bye week constraints being too restrictive.\n');
      
      console.log('💡 Analysis:');
      console.log('   - Bye weeks NOT allowed in: weeks 1-4 and 15-18 (8 weeks)');
      console.log('   - Bye weeks allowed in: weeks 5-14 (10 weeks)');
      console.log('   - Max 6 teams on bye per week');
      console.log('   - 32 teams need bye weeks: 32 / 6 = 5.33 weeks minimum needed');
      console.log('   - We have 10 weeks available, should be enough...\n');
      
      console.log('🔍 Potential Issues:');
      console.log('   1. Primetime constraints might be over-constraining');
      console.log('   2. Consecutive rematch prevention might conflict with bye weeks');
      console.log('   3. Matchup generation might not be creating valid combinations\n');
      
      return { success: false, reason: 'infeasible', time: totalTime };
    } else if (solution.status === 'error' || solution.games.length === 0) {
      console.log('\n❌ SOLVER FAILED TO FIND A SOLUTION');
      console.log(`   Status: ${solution.status}`);
      return { success: false, reason: 'no_solution', time: totalTime };
    } else {
      console.log('\n✅ SOLVER SUCCEEDED!');
      
      // Validate the solution
      console.log('\n🔍 Step 5: Validating solution...');
      const validation = solver.validateSolution(solution.games);
      
      if (validation.isValid) {
        console.log('✅ Solution validation PASSED!\n');
      } else {
        console.log('⚠️ Solution validation found issues:');
        validation.errors.slice(0, 10).forEach(err => console.log(`  - ${err}`));
        if (validation.errors.length > 10) {
          console.log(`  ... and ${validation.errors.length - 10} more errors\n`);
        }
      }
      
      // Analyze bye weeks
      console.log('📊 Bye Week Analysis:');
      const gamesPerWeek = {};
      for (let w = 1; w <= 18; w++) {
        gamesPerWeek[w] = 0;
      }
      
      for (const game of solution.games) {
        gamesPerWeek[game.week]++;
      }
      
      let byeWeekViolations = 0;
      for (let w = 1; w <= 18; w++) {
        const games = gamesPerWeek[w];
        const teamsOnBye = 32 - (games * 2);
        const status = (w <= 4 || w >= 15) 
          ? (teamsOnBye === 0 ? '✅' : '❌')
          : (teamsOnBye <= 6 ? '✅' : '❌');
        
        if (status === '❌') byeWeekViolations++;
        
        console.log(`  ${status} Week ${w.toString().padStart(2)}: ${games} games, ${teamsOnBye} teams on bye`);
      }
      
      console.log(`\n${byeWeekViolations === 0 ? '✅' : '❌'} Bye week constraints: ${byeWeekViolations} violations\n`);
      
      return { 
        success: true, 
        time: totalTime, 
        validation: validation.isValid,
        byeWeekViolations 
      };
    }
    
  } catch (error) {
    if (error.message.includes('timed out')) {
      console.log('\n⏱️ SOLVER TIMED OUT AFTER 120 SECONDS!');
      console.log('   The constraint solver is hanging/taking too long.');
      console.log('   This suggests the problem is over-constrained.\n');
      return { success: false, reason: 'timeout' };
    }
    
    console.error('\n❌ Test failed with error:', error.message);
    console.error(error.stack);
    return { success: false, reason: 'error', error: error.message };
  }
}

// Run the test
console.log('=' .repeat(70));
console.log('NFL CONSTRAINT SOLVER - STANDALONE TEST');
console.log('Testing with all constraints enabled including bye weeks');
console.log('=' .repeat(70) + '\n');

testConstraintSolver()
  .then((result) => {
    console.log('=' .repeat(70));
    console.log('TEST COMPLETE');
    console.log('=' .repeat(70));
    
    if (result.success) {
      console.log('✅ RESULT: Constraint solver is working!');
      console.log(`   Time: ${(result.time/1000).toFixed(1)}s`);
      console.log(`   Validation: ${result.validation ? 'PASSED' : 'FAILED'}`);
      console.log(`   Bye week violations: ${result.byeWeekViolations}`);
      
      if (!result.validation || result.byeWeekViolations > 0) {
        console.log('\n⚠️ Note: Solver found a solution but it has validation issues');
        process.exit(1);
      }
      
      process.exit(0);
    } else {
      console.log(`❌ RESULT: Constraint solver failed - ${result.reason}`);
      
      if (result.reason === 'infeasible') {
        console.log('\n💡 RECOMMENDATION: Relax constraints');
        console.log('   Consider:');
        console.log('   1. Disabling primetime constraints');
        console.log('   2. Relaxing bye week timing (allow weeks 1-3 or 16-18)');
        console.log('   3. Increasing max bye teams per week from 6 to 8');
      } else if (result.reason === 'timeout') {
        console.log('\n💡 RECOMMENDATION: Simplify constraints or improve solver performance');
      }
      
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
