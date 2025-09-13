#!/usr/bin/env node

// Test script for the improved constraint solver
const initGLPK = require('glpk.js');

// Mock teams for testing
const mockTeams = [
  // AFC North
  { id: 'ravens', name: 'Baltimore Ravens', conference: 'AFC', division: 'North' },
  { id: 'browns', name: 'Cleveland Browns', conference: 'AFC', division: 'North' },
  { id: 'bengals', name: 'Cincinnati Bengals', conference: 'AFC', division: 'North' },
  { id: 'steelers', name: 'Pittsburgh Steelers', conference: 'AFC', division: 'North' },
  
  // AFC South
  { id: 'texans', name: 'Houston Texans', conference: 'AFC', division: 'South' },
  { id: 'colts', name: 'Indianapolis Colts', conference: 'AFC', division: 'South' },
  { id: 'jaguars', name: 'Jacksonville Jaguars', conference: 'AFC', division: 'South' },
  { id: 'titans', name: 'Tennessee Titans', conference: 'AFC', division: 'South' },

  // NFC North
  { id: 'packers', name: 'Green Bay Packers', conference: 'NFC', division: 'North' },
  { id: 'bears', name: 'Chicago Bears', conference: 'NFC', division: 'North' },
  { id: 'lions', name: 'Detroit Lions', conference: 'NFC', division: 'North' },
  { id: 'vikings', name: 'Minnesota Vikings', conference: 'NFC', division: 'North' },

  // NFC South
  { id: 'saints', name: 'New Orleans Saints', conference: 'NFC', division: 'South' },
  { id: 'falcons', name: 'Atlanta Falcons', conference: 'NFC', division: 'South' },
  { id: 'panthers', name: 'Carolina Panthers', conference: 'NFC', division: 'South' },
  { id: 'buccaneers', name: 'Tampa Bay Buccaneers', conference: 'NFC', division: 'South' }
];

// Generate simplified matchups
function generateTestMatchups() {
  const matchups = [];
  
  // Each team plays each other team once (simplified)
  for (let i = 0; i < mockTeams.length; i++) {
    for (let j = i + 1; j < mockTeams.length; j++) {
      matchups.push({
        home: mockTeams[i].id,
        away: mockTeams[j].id
      });
    }
  }
  
  return matchups.slice(0, 68); // Limit to 68 matchups for 16 teams (17 games per team)
}

async function testImprovedSolver() {
  console.log('🧪 Testing Improved NFL Constraint Solver...\n');
  
  try {
    // Import the improved solver
    const { ScheduleConstraintSolver } = await import('./src/utils/scheduleConstraintSolver.ts');
    
    const matchups = generateTestMatchups();
    
    console.log(`📊 Test Setup:`);
    console.log(`  - Teams: ${mockTeams.length}`);
    console.log(`  - Matchups: ${matchups.length}`);
    console.log(`  - Weeks: 18\n`);
    
    const solver = new ScheduleConstraintSolver(matchups, mockTeams, 18, {
      maxConsecutiveAway: 3,
      maxConsecutiveHome: 3,
      maxGamesPerWeek: 16,
      byeWeekDistribution: 'balanced',
      preventConsecutiveRematches: true
    });
    
    console.log('🚀 Running improved solver with optimal constraint ordering...\n');
    const startTime = Date.now();
    const solution = await solver.solve();
    const totalTime = Date.now() - startTime;
    
    console.log('📈 Results:');
    console.log(`  - Status: ${solution.status}`);
    console.log(`  - Games scheduled: ${solution.games.length}`);
    console.log(`  - Objective: ${solution.objective}`);
    console.log(`  - Total time: ${totalTime}ms`);
    console.log(`  - Solver time: ${solution.solveTime}ms`);
    
    if (solution.games.length > 0) {
      console.log('\n✅ SUCCESS! Improved solver is working!');
      
      // Analyze bye week distribution
      console.log('\n🔍 Bye Week Analysis:');
      const gamesPerWeek = {};
      const teamGamesPerWeek = {};
      
      // Initialize counters
      for (let w = 1; w <= 18; w++) {
        gamesPerWeek[w] = 0;
        teamGamesPerWeek[w] = new Set();
      }
      
      // Count games and teams per week
      for (const game of solution.games) {
        gamesPerWeek[game.week]++;
        teamGamesPerWeek[game.week].add(game.homeTeam);
        teamGamesPerWeek[game.week].add(game.awayTeam);
      }
      
      // Check bye week rules
      let byeWeekRulesPassed = true;
      for (let w = 1; w <= 18; w++) {
        const games = gamesPerWeek[w];
        const teamsPlaying = teamGamesPerWeek[w].size;
        const teamsOnBye = mockTeams.length - teamsPlaying;
        
        if (w <= 4 || w >= 15) {
          // No byes allowed in weeks 1-4 and 15-18
          if (games !== 8 || teamsOnBye !== 0) { // 8 games for 16 teams
            console.log(`  ❌ Week ${w}: ${games} games, ${teamsOnBye} teams on bye (should be 0 byes)`);
            byeWeekRulesPassed = false;
          } else {
            console.log(`  ✅ Week ${w}: ${games} games, ${teamsOnBye} teams on bye`);
          }
        } else {
          // Byes allowed in weeks 5-14
          if (teamsOnBye > 6) {
            console.log(`  ❌ Week ${w}: ${games} games, ${teamsOnBye} teams on bye (max 6 allowed)`);
            byeWeekRulesPassed = false;
          } else {
            console.log(`  ✅ Week ${w}: ${games} games, ${teamsOnBye} teams on bye`);
          }
        }
      }
      
      console.log(`\n🏈 Bye Week Rules: ${byeWeekRulesPassed ? '✅ PASSED' : '❌ FAILED'}`);
      
      // Validate solution
      const validation = solver.validateSolution(solution.games);
      console.log(`\n📋 Full Validation: ${validation.isValid ? '✅ PASSED' : '❌ FAILED'}`);
      if (!validation.isValid) {
        console.log('Issues:');
        validation.errors.slice(0, 5).forEach(e => console.log(`  - ${e}`));
        if (validation.errors.length > 5) {
          console.log(`  ... and ${validation.errors.length - 5} more issues`);
        }
      }
      
    } else {
      console.log('\n❌ No solution found - may need constraint relaxation');
      
      // Diagnostic information
      const diagnosis = solver.diagnoseConstraints();
      console.log('\n🔍 Diagnostic Info:');
      console.log(`  - Total variables: ${diagnosis.totalVariables}`);
      console.log(`  - Total constraints: ${diagnosis.totalConstraints}`);
      console.log(`  - Required matchups: ${diagnosis.requiredMatchups}`);
      console.log(`  - Actual matchups: ${diagnosis.totalMatchups}`);
      
      if (diagnosis.feasibilityIssues.length > 0) {
        console.log('  - Feasibility issues:');
        diagnosis.feasibilityIssues.forEach(issue => console.log(`    - ${issue}`));
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testImprovedSolver().then(() => {
  console.log('\n🎯 Test completed!');
}).catch(error => {
  console.error('Test error:', error);
});