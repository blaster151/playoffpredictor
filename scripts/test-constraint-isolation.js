const initGLPK = require('glpk.js');

// Import the actual constraint solver to test with real data
const { ScheduleConstraintSolver } = require('../src/utils/scheduleConstraintSolver');
const { generateMatchups, createScheduleConfig } = require('../src/utils/scheduleGenerator');
const { teams } = require('../src/data/nflData');

async function testConstraintIsolation() {
  console.log('🧪 Testing Constraint Isolation with Real NFL Data...\n');

  try {
    // Generate real NFL matchups
    const priorYearStandings = {};
    teams.forEach(team => {
      priorYearStandings[team.id] = Math.floor(Math.random() * 4) + 1;
    });

    const config = createScheduleConfig(teams, 2024, priorYearStandings);
    const matchups = generateMatchups(config);

    console.log(`📊 Real NFL Data:`);
    console.log(`  - Teams: ${teams.length}`);
    console.log(`  - Matchups: ${matchups.length}`);
    console.log(`  - Weeks: 18\n`);

    // Test with progressively adding constraints
    const glpk = await initGLPK();
    
    // Test 1: Just the objective function with no constraints
    console.log('🔍 Test 1: No Constraints (Checking Objective)');
    const problem1 = createProblemNoConstraints(glpk, matchups, teams);
    const result1 = glpk.solve(problem1);
    console.log(`  Status: ${getStatusName(result1.result?.status)}`);
    console.log(`  Objective: ${result1.result?.z}\n`);

    // Test 2: Only matchup constraints
    console.log('🔍 Test 2: Only Matchup Constraints');
    const problem2 = createProblemMatchupOnly(glpk, matchups, teams);
    const result2 = glpk.solve(problem2);
    console.log(`  Status: ${getStatusName(result2.result?.status)}`);
    console.log(`  Games scheduled: ${countSolutionVars(result2.result?.vars)}\n`);

    // Test 3: Matchup + Team Weekly
    console.log('🔍 Test 3: Matchup + Team Weekly Constraints');
    const problem3 = createProblemMatchupTeamWeekly(glpk, matchups, teams);
    const result3 = glpk.solve(problem3);
    console.log(`  Status: ${getStatusName(result3.result?.status)}`);
    console.log(`  Games scheduled: ${countSolutionVars(result3.result?.vars)}\n`);

    // Test 4: Check bounds on bye week constraints
    console.log('🔍 Test 4: Analyzing Bye Week Constraint Bounds');
    analyzeByeWeekConstraints(teams.length, matchups.length);

    // Test 5: Fix the bye week constraint
    console.log('\n🔍 Test 5: Testing Fixed Bye Week Constraints');
    const problem5 = createProblemWithFixedByeWeeks(glpk, matchups, teams);
    const result5 = glpk.solve(problem5);
    console.log(`  Status: ${getStatusName(result5.result?.status)}`);
    console.log(`  Games scheduled: ${countSolutionVars(result5.result?.vars)}\n`);

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

function countSolutionVars(vars) {
  if (!vars) return 0;
  return Object.values(vars).filter(v => v > 0.5).length;
}

function createProblemNoConstraints(glpk, matchups, teams) {
  const numMatchups = matchups.length;
  const numWeeks = 18;
  
  const varNames = [];
  const objectiveVars = [];
  
  // Create variables with objective coefficients
  for (let m = 0; m < numMatchups; m++) {
    for (let w = 1; w <= numWeeks; w++) {
      const varName = `x_${m}_${w}`;
      varNames.push(varName);
      
      // Use the same objective as the real solver
      let coef = 1;
      if (w <= 3 || w >= 16) {
        coef = 1.1;
      } else if (w >= 6 && w <= 12) {
        coef = 0.9;
      }
      
      objectiveVars.push({ name: varName, coef });
    }
  }
  
  return {
    name: 'No_Constraints_Test',
    objective: {
      direction: glpk.GLP_MIN,
      name: 'schedule_cost',
      vars: objectiveVars
    },
    subjectTo: [],
    binaries: varNames
  };
}

function createProblemMatchupOnly(glpk, matchups, teams) {
  const problem = createProblemNoConstraints(glpk, matchups, teams);
  
  // Add only matchup constraints
  const numMatchups = matchups.length;
  const numWeeks = 18;
  
  for (let m = 0; m < numMatchups; m++) {
    const vars = [];
    for (let w = 1; w <= numWeeks; w++) {
      vars.push({ name: `x_${m}_${w}`, coef: 1 });
    }
    problem.subjectTo.push({
      name: `matchup_${m}`,
      vars,
      bnds: { type: glpk.GLP_FX, lb: 1, ub: 1 }
    });
  }
  
  return problem;
}

function createProblemMatchupTeamWeekly(glpk, matchups, teams) {
  const problem = createProblemMatchupOnly(glpk, matchups, teams);
  
  // Add team weekly constraints
  const numWeeks = 18;
  for (let t = 0; t < teams.length; t++) {
    for (let w = 1; w <= numWeeks; w++) {
      const vars = [];
      
      for (let m = 0; m < matchups.length; m++) {
        if (matchups[m].home === teams[t].id || matchups[m].away === teams[t].id) {
          vars.push({ name: `x_${m}_${w}`, coef: 1 });
        }
      }
      
      if (vars.length > 0) {
        problem.subjectTo.push({
          name: `team_${t}_week_${w}`,
          vars,
          bnds: { type: glpk.GLP_UP, lb: 0, ub: 1 }
        });
      }
    }
  }
  
  return problem;
}

function analyzeByeWeekConstraints(numTeams, numMatchups) {
  console.log(`  Bye Week Math:`);
  console.log(`  - Teams: ${numTeams}`);
  console.log(`  - Max teams on bye: 6`);
  console.log(`  - Min games in bye week: ${Math.floor((numTeams - 6) / 2)} games`);
  console.log(`  - Games in non-bye week: ${numTeams / 2} games`);
  
  // Check if the bounds make sense
  const minGamesInByeWeek = Math.floor((numTeams - 6) / 2);
  const maxGamesInWeek = numMatchups; // This is way too high!
  
  console.log(`  - Current upper bound: ${maxGamesInWeek} (TOO HIGH!)`);
  console.log(`  - Should be: 16 (max games per week)`);
}

function createProblemWithFixedByeWeeks(glpk, matchups, teams) {
  const problem = createProblemMatchupTeamWeekly(glpk, matchups, teams);
  
  // Add proper bye week constraints
  const numTeams = teams.length;
  const numMatchups = matchups.length;
  const numWeeks = 18;
  
  for (let w = 1; w <= numWeeks; w++) {
    const weekVars = [];
    for (let m = 0; m < numMatchups; m++) {
      weekVars.push({ name: `x_${m}_${w}`, coef: 1 });
    }
    
    if (w >= 4 && w <= 14) {
      // Bye weeks allowed - use double bound constraint
      const minGames = Math.floor((numTeams - 6) / 2); // 13 for 32 teams
      const maxGames = 16; // NFL max games per week
      
      problem.subjectTo.push({
        name: `bye_week_${w}`,
        vars: weekVars,
        bnds: { type: glpk.GLP_DB, lb: minGames, ub: maxGames }
      });
    } else {
      // No bye weeks - exactly 16 games
      problem.subjectTo.push({
        name: `no_bye_week_${w}`,
        vars: weekVars,
        bnds: { type: glpk.GLP_FX, lb: 16, ub: 16 }
      });
    }
  }
  
  // Add game count constraints
  for (let t = 0; t < teams.length; t++) {
    const vars = [];
    
    for (let m = 0; m < matchups.length; m++) {
      if (matchups[m].home === teams[t].id || matchups[m].away === teams[t].id) {
        for (let w = 1; w <= numWeeks; w++) {
          vars.push({ name: `x_${m}_${w}`, coef: 1 });
        }
      }
    }
    
    if (vars.length > 0) {
      problem.subjectTo.push({
        name: `games_${t}`,
        vars,
        bnds: { type: glpk.GLP_FX, lb: 17, ub: 17 }
      });
    }
  }
  
  return problem;
}

// Run the test
testConstraintIsolation();