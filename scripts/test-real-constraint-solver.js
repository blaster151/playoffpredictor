// Test the real constraint solver with individual constraints
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Create a test file that can be run with ts-node
const testContent = `
import { createScheduleSolver } from '../src/utils/scheduleConstraintSolver';
import { generateMatchups, createScheduleConfig } from '../src/utils/scheduleGenerator';
import { teams } from '../src/data/nflData';

async function testRealConstraintSolver() {
  console.log('🧪 Testing Real Constraint Solver...\\n');

  try {
    // Get teams and create matchups
    const priorYearStandings: { [key: string]: number } = {};
    teams.forEach((team: any) => {
      priorYearStandings[team.id] = Math.floor(Math.random() * 4) + 1;
    });

    const config = createScheduleConfig(teams, 2024, priorYearStandings);
    const matchups = generateMatchups(config);

    console.log(\`📊 Setup:\`);
    console.log(\`  - Teams: \${teams.length}\`);
    console.log(\`  - Matchups: \${matchups.length}\`);
    console.log(\`  - Weeks: 18\\n\`);

    // Test 1: No constraints (baseline)
    console.log('🔍 Test 1: No Constraints (Baseline)');
    const solver1 = createScheduleSolver(matchups, teams, 18, {});
    const result1 = await solver1.solve();
    console.log(\`  Status: \${result1.status}\`);
    console.log(\`  Games: \${result1.games.length}\`);
    console.log(\`  Solve Time: \${result1.solveTime}ms\\n\`);

    // Test 2: Only maxConsecutiveAway constraint
    console.log('🔍 Test 2: Only maxConsecutiveAway = 2');
    const solver2 = createScheduleSolver(matchups, teams, 18, { maxConsecutiveAway: 2 });
    const result2 = await solver2.solve();
    console.log(\`  Status: \${result2.status}\`);
    console.log(\`  Games: \${result2.games.length}\`);
    console.log(\`  Solve Time: \${result2.solveTime}ms\\n\`);

    // Test 3: Only maxConsecutiveHome constraint
    console.log('🔍 Test 3: Only maxConsecutiveHome = 2');
    const solver3 = createScheduleSolver(matchups, teams, 18, { maxConsecutiveHome: 2 });
    const result3 = await solver3.solve();
    console.log(\`  Status: \${result3.status}\`);
    console.log(\`  Games: \${result3.games.length}\`);
    console.log(\`  Solve Time: \${result3.solveTime}ms\\n\`);

    // Test 4: Only maxGamesPerWeek constraint
    console.log('🔍 Test 4: Only maxGamesPerWeek = 12');
    const solver4 = createScheduleSolver(matchups, teams, 18, { maxGamesPerWeek: 12 });
    const result4 = await solver4.solve();
    console.log(\`  Status: \${result4.status}\`);
    console.log(\`  Games: \${result4.games.length}\`);
    console.log(\`  Solve Time: \${result4.solveTime}ms\\n\`);

    // Test 5: Only byeWeekDistribution constraint
    console.log('🔍 Test 5: Only byeWeekDistribution = "balanced"');
    const solver5 = createScheduleSolver(matchups, teams, 18, { byeWeekDistribution: 'balanced' });
    const result5 = await solver5.solve();
    console.log(\`  Status: \${result5.status}\`);
    console.log(\`  Games: \${result5.games.length}\`);
    console.log(\`  Solve Time: \${result5.solveTime}ms\\n\`);

    // Test 6: Reduced matchups (subset)
    console.log('🔍 Test 6: Reduced matchups (first 200)');
    const reducedMatchups = matchups.slice(0, 200);
    const solver6 = createScheduleSolver(reducedMatchups, teams, 18, {});
    const result6 = await solver6.solve();
    console.log(\`  Status: \${result6.status}\`);
    console.log(\`  Games: \${result6.games.length}\`);
    console.log(\`  Solve Time: \${result6.solveTime}ms\\n\`);

    // Test 7: All constraints together (current implementation)
    console.log('🔍 Test 7: All constraints together');
    const solver7 = createScheduleSolver(matchups, teams, 18, {
      maxConsecutiveAway: 3,
      maxConsecutiveHome: 3,
      maxGamesPerWeek: 16,
      byeWeekDistribution: 'balanced'
    });
    const result7 = await solver7.solve();
    console.log(\`  Status: \${result7.status}\`);
    console.log(\`  Games: \${result7.games.length}\`);
    console.log(\`  Solve Time: \${result7.solveTime}ms\\n\`);

    // Summary
    console.log('📋 Test Summary:');
    console.log('================');
    const results = [
      { test: 'No Constraints', status: result1.status, games: result1.games.length },
      { test: 'maxConsecutiveAway=2', status: result2.status, games: result2.games.length },
      { test: 'maxConsecutiveHome=2', status: result3.status, games: result3.games.length },
      { test: 'maxGamesPerWeek=12', status: result4.status, games: result4.games.length },
      { test: 'byeWeekDistribution=balanced', status: result5.status, games: result5.games.length },
      { test: 'reduced matchups', status: result6.status, games: result6.games.length },
      { test: 'All constraints', status: result7.status, games: result7.games.length }
    ];

    results.forEach((r, i) => {
      const icon = r.status === 'optimal' ? '✅' : r.status === 'infeasible' ? '❌' : '⚠️';
      console.log(\`\${icon} Test \${i + 1}: \${r.test} - \${r.status} (\${r.games} games)\`);
    });

    // Analysis
    const workingTests = results.filter(r => r.status === 'optimal');
    const failingTests = results.filter(r => r.status === 'infeasible');
    const errorTests = results.filter(r => r.status === 'error');

    console.log('\\n🎯 Analysis:');
    console.log(\`  - Working tests: \${workingTests.length}\`);
    console.log(\`  - Failing tests: \${failingTests.length}\`);
    console.log(\`  - Error tests: \${errorTests.length}\`);

    if (failingTests.length > 0) {
      console.log('\\n❌ Failing constraints:');
      failingTests.forEach(t => console.log(\`  - \${t.test}\`));
    }

    if (errorTests.length > 0) {
      console.log('\\n⚠️ Error constraints:');
      errorTests.forEach(t => console.log(\`  - \${t.test}\`));
    }

    // Check if baseline works but combined doesn't
    if (result1.status === 'optimal' && result7.status === 'infeasible') {
      console.log('\\n🔍 Key Finding: Baseline works but combined constraints fail!');
      console.log('   This suggests constraint interaction issues.');
    }

    // Check if all individual constraints work but combined doesn't
    const individualTests = [result2, result3, result4, result5];
    const allIndividualWork = individualTests.every(r => r.status === 'optimal');
    
    if (allIndividualWork && result7.status === 'infeasible') {
      console.log('\\n🔍 Key Finding: All individual constraints work but combined fails!');
      console.log('   This suggests constraint interaction or scaling issues.');
    }

  } catch (error: any) {
    console.error('❌ Test failed with error:', error.message);
    console.error(error.stack);
  }
}

testRealConstraintSolver().catch(console.error);
`;

// Write the test file
fs.writeFileSync('scripts/test-real-constraint-solver.ts', testContent);

// Run the test with ts-node
try {
  console.log('🚀 Running real constraint solver test...\n');
  const output = execSync('npx ts-node scripts/test-real-constraint-solver.ts', { 
    encoding: 'utf8',
    stdio: 'pipe'
  });
  console.log(output);
} catch (error) {
  console.error('❌ Test execution failed:');
  console.error(error.stdout || error.message);
  if (error.stderr) {
    console.error('STDERR:', error.stderr);
  }
} finally {
  // Clean up
  if (fs.existsSync('scripts/test-real-constraint-solver.ts')) {
    fs.unlinkSync('scripts/test-real-constraint-solver.ts');
  }
} 