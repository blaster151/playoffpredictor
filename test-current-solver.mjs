// Standalone test for the current constraint solver configuration
// Run with: node test-current-solver.mjs

import { createScheduleSolver } from './src/utils/scheduleConstraintSolver.ts';
import { generateMatchups, createScheduleConfig } from './src/utils/scheduleGenerator.ts';
import { teams } from './src/data/nflData.ts';
import { loadScheduleStartingPoint, filterPreScheduledMatchups, getPreScheduledMatchups, getTeamGameCounts } from './src/utils/scheduleStartingPoint.ts';

async function testCurrentSolver() {
  console.log('🧪 Testing Current Solver Configuration\n');
  console.log('='.repeat(60));

  try {
    // Setup prior year standings (simple: sort by team name for consistency)
    const priorYearStandings = {};
    const divisions = {};
    
    // Group by division
    teams.forEach(team => {
      const key = `${team.conference}_${team.division}`;
      if (!divisions[key]) divisions[key] = [];
      divisions[key].push(team);
    });
    
    // Assign standings within each division (1-4)
    Object.values(divisions).forEach(divisionTeams => {
      divisionTeams.sort((a, b) => a.id.localeCompare(b.id));
      divisionTeams.forEach((team, index) => {
        priorYearStandings[team.id] = index + 1;
      });
    });
    
    // Load pre-scheduled data
    console.log('📅 Loading pre-scheduled data...');
    const startingPoint = loadScheduleStartingPoint();
    const preScheduledMatchups = getPreScheduledMatchups();
    const teamGameCounts = getTeamGameCounts();
    const preScheduledWeeksSet = new Set(startingPoint.preScheduledWeeks);
    
    console.log(`  - Pre-scheduled weeks: ${startingPoint.preScheduledWeeks.join(', ')}`);
    console.log(`  - Pre-scheduled games: ${preScheduledMatchups.length}`);
    console.log(`  - Teams with pre-scheduled games: ${teamGameCounts.size}`);
    
    // Generate matchups
    console.log('\n📋 Generating matchups...');
    const config = createScheduleConfig(teams, 2026, priorYearStandings);
    const allMatchups = generateMatchups(config);
    console.log(`  - Total matchups generated: ${allMatchups.length}`);
    
    // Filter out pre-scheduled matchups
    const matchups = filterPreScheduledMatchups(allMatchups, preScheduledMatchups);
    console.log(`  - Matchups for solver: ${matchups.length}`);
    console.log(`  - Matchups already scheduled: ${allMatchups.length - matchups.length}`);
    
    // Calculate expected stats
    const totalGamesNeeded = (teams.length * 17) / 2; // 272 games
    const preScheduledGamesCount = preScheduledMatchups.length;
    const solverGamesNeeded = matchups.length;
    
    console.log('\n📊 Expected Statistics:');
    console.log(`  - Total games needed: ${totalGamesNeeded}`);
    console.log(`  - Pre-scheduled games: ${preScheduledGamesCount}`);
    console.log(`  - Solver needs to schedule: ${solverGamesNeeded}`);
    console.log(`  - Teams: ${teams.length}`);
    console.log(`  - Weeks: 18 (solver responsible for 2-18)`);
    
    // Create solver with EXACT configuration from index.tsx
    console.log('\n🔧 Creating solver with current configuration...');
    console.log('  Constraints:');
    console.log('    - maxGamesPerWeek: 18');
    console.log('    - byeWeekDistribution: balanced');
    console.log('    - preventConsecutiveRematches: true (DISABLED in solver, moved to postprocessing)');
    console.log('    - Primetime: ALL DISABLED');
    console.log('    - Consecutive rematches: DISABLED (moved to postprocessing)');
    console.log('    - Team week constraints: DISABLED (redundant)');
    
    const solver = createScheduleSolver(
      matchups,
      teams,
      18,
      {
        maxGamesPerWeek: 18,
        byeWeekDistribution: 'balanced',
        preventConsecutiveRematches: true, // Flag is ignored in solver now
        primetimeConstraints: {
          mondayNightFootball: { enabled: false, gamesPerWeek: 1, maxAppearances: 3 },
          thursdayNightFootball: { enabled: false, gamesPerWeek: 1, maxAppearances: 2, minimumRestDays: 4, startWeek: 2 },
          sundayNightFootball: { enabled: false, gamesPerWeek: 1, maxAppearances: 4 }
        }
      },
      teamGameCounts,
      preScheduledWeeksSet
    );
    
    console.log('\n⏳ Solving (this may take a while)...');
    console.log('  - Timeout: 5 minutes (300 seconds)');
    console.log('  - If this hangs, press Ctrl+C after 30 seconds\n');
    
    const startTime = Date.now();
    
    // Add a timeout warning
    const warningTimer = setTimeout(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      console.log(`\n⚠️  Still solving after ${elapsed}s - this might be taking too long...`);
    }, 30000);
    
    const solution = await solver.solve();
    clearTimeout(warningTimer);
    
    const solveTime = Date.now() - startTime;
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 SOLVER RESULT:');
    console.log('='.repeat(60));
    console.log(`  Status: ${solution.status}`);
    console.log(`  Solve Time: ${solveTime}ms (${(solveTime / 1000).toFixed(2)}s)`);
    console.log(`  Games Scheduled: ${solution.games.length}`);
    console.log(`  Objective Value: ${solution.objective}`);
    console.log(`  Constraints Satisfied:`, solution.constraints);
    
    if (solution.status === 'optimal') {
      console.log('\n✅ SUCCESS! Solver completed successfully!');
      
      // Validate solution
      console.log('\n🔍 Validating solution...');
      const validation = solver.validateSolution(solution.games);
      
      if (validation.isValid) {
        console.log('  ✅ Solution is valid!');
      } else {
        console.log('  ❌ Solution has errors:');
        validation.errors.forEach(err => console.log(`    - ${err}`));
      }
      
      // Week distribution
      const weekCounts = {};
      for (let w = 1; w <= 18; w++) weekCounts[w] = 0;
      solution.games.forEach(g => weekCounts[g.week]++);
      
      console.log('\n📅 Week Distribution:');
      for (let w = 1; w <= 18; w++) {
        const count = weekCounts[w];
        const bar = '█'.repeat(count);
        const status = preScheduledWeeksSet.has(w) ? ' (pre-scheduled)' : '';
        console.log(`  Week ${w.toString().padStart(2)}: ${count.toString().padStart(2)} games ${bar}${status}`);
      }
      
    } else if (solution.status === 'infeasible') {
      console.log('\n❌ INFEASIBLE: The constraints are mathematically impossible to satisfy.');
      console.log('\nPossible causes:');
      console.log('  1. Conflicting constraints');
      console.log('  2. Over-constrained problem');
      console.log('  3. Pre-scheduled games create impossible situation');
      
      // Run diagnostics
      console.log('\n🔍 Running diagnostics...');
      const diagnostics = await solver.diagnoseConstraints();
      
      console.log('\n📊 Diagnostic Results:');
      console.log(`  - Total variables: ${diagnostics.totalVariables}`);
      console.log(`  - Total constraints: ${diagnostics.totalConstraints}`);
      console.log(`  - Total matchups: ${diagnostics.totalMatchups}`);
      console.log(`  - Required matchups: ${diagnostics.requiredMatchups}`);
      
      if (diagnostics.feasibilityIssues.length > 0) {
        console.log('\n⚠️  Feasibility Issues:');
        diagnostics.feasibilityIssues.forEach(issue => console.log(`  - ${issue}`));
      }
      
      if (diagnostics.recommendations.length > 0) {
        console.log('\n💡 Recommendations:');
        diagnostics.recommendations.forEach(rec => console.log(`  - ${rec}`));
      }
      
    } else if (solution.status === 'unbounded') {
      console.log('\n❌ UNBOUNDED: The problem is missing constraints.');
      console.log('\nThis is a bug in the constraint formulation!');
      console.log('The solver found that some variables can go to infinity.');
      
    } else if (solution.status === 'error') {
      console.log('\n❌ ERROR: The solver encountered an internal error.');
      
    } else {
      console.log(`\n⚠️  UNKNOWN STATUS: ${solution.status}`);
    }
    
  } catch (error) {
    console.error('\n💥 TEST FAILED WITH ERROR:');
    console.error('='.repeat(60));
    console.error(error);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
console.log('Starting solver test...\n');
testCurrentSolver()
  .then(() => {
    console.log('\n✅ Test completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Unexpected error:', error);
    process.exit(1);
  });

