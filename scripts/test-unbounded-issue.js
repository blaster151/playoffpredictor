const initGLPK = require('glpk.js');

// Mock NFL data for testing
function generateMockNFLData() {
  const teams = [];
  const conferences = ['AFC', 'NFC'];
  const divisions = ['North', 'South', 'East', 'West'];
  
  let teamId = 0;
  for (const conf of conferences) {
    for (const div of divisions) {
      for (let i = 0; i < 4; i++) {
        teams.push({
          id: `T${teamId}`,
          name: `Team ${teamId}`,
          conference: conf,
          division: div
        });
        teamId++;
      }
    }
  }
  
  return teams;
}

// Generate simple matchups for testing
function generateTestMatchups(teams) {
  const matchups = [];
  
  // Each team needs exactly 17 games
  // For simplicity, let's create a round-robin style with constraints
  for (let i = 0; i < teams.length; i++) {
    let gamesForTeam = 0;
    
    // Play next 17 teams in circular order
    for (let j = 1; j <= 17; j++) {
      const opponentIdx = (i + j) % teams.length;
      
      // Only create matchup if not already created (avoid duplicates)
      if (i < opponentIdx) {
        matchups.push({
          home: teams[i].id,
          away: teams[opponentIdx].id
        });
      }
    }
  }
  
  return matchups;
}

async function testUnboundedIssue() {
  console.log('🧪 Testing Unbounded Issue with Full NFL Data...\n');

  try {
    const glpk = await initGLPK();
    console.log('✅ GLPK initialized\n');

    // Generate test data
    const teams = generateMockNFLData();
    const matchups = generateTestMatchups(teams);
    
    console.log(`📊 Test Data:`);
    console.log(`  - Teams: ${teams.length}`);
    console.log(`  - Matchups: ${matchups.length}`);
    console.log(`  - Expected: 272 matchups (32 * 17 / 2)\n`);

    // Test 1: Minimal constraints (just matchup assignment)
    console.log('🔍 Test 1: Minimal Constraints');
    const problem1 = createMinimalProblem(glpk, matchups, teams);
    const result1 = glpk.solve(problem1);
    console.log(`  Status: ${result1.result?.status} (${getStatusName(result1.result?.status)})`);
    console.log(`  Objective: ${result1.result?.z}`);
    console.log(`  Solution vars: ${countSolutionVars(result1.result?.vars)}\n`);

    // Test 2: Add team weekly constraint
    console.log('🔍 Test 2: With Team Weekly Constraints');
    const problem2 = createProblemWithTeamWeekly(glpk, matchups, teams);
    const result2 = glpk.solve(problem2);
    console.log(`  Status: ${result2.result?.status} (${getStatusName(result2.result?.status)})`);
    console.log(`  Objective: ${result2.result?.z}`);
    console.log(`  Solution vars: ${countSolutionVars(result2.result?.vars)}\n`);

    // Test 3: Add game count constraint
    console.log('🔍 Test 3: With Game Count Constraints');
    const problem3 = createProblemWithGameCount(glpk, matchups, teams);
    const result3 = glpk.solve(problem3);
    console.log(`  Status: ${result3.result?.status} (${getStatusName(result3.result?.status)})`);
    console.log(`  Objective: ${result3.result?.z}`);
    console.log(`  Solution vars: ${countSolutionVars(result3.result?.vars)}\n`);

    // Test 4: Different objective functions
    console.log('🔍 Test 4: Testing Different Objectives');
    
    // 4a: Zero objective (find any feasible solution)
    const problem4a = createProblemWithZeroObjective(glpk, matchups, teams);
    const result4a = glpk.solve(problem4a);
    console.log(`  4a. Zero objective - Status: ${getStatusName(result4a.result?.status)}`);
    
    // 4b: All positive coefficients
    const problem4b = createProblemWithPositiveObjective(glpk, matchups, teams);
    const result4b = glpk.solve(problem4b);
    console.log(`  4b. All positive - Status: ${getStatusName(result4b.result?.status)}`);
    
    // 4c: Mixed coefficients
    const problem4c = createProblemWithMixedObjective(glpk, matchups, teams);
    const result4c = glpk.solve(problem4c);
    console.log(`  4c. Mixed coeffs - Status: ${getStatusName(result4c.result?.status)}\n`);

    // Test 5: Check constraint bounds
    console.log('🔍 Test 5: Analyzing Constraint Bounds');
    analyzeConstraintBounds(glpk, matchups, teams);

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

function createMinimalProblem(glpk, matchups, teams) {
  const numMatchups = matchups.length;
  const numWeeks = 18;
  
  const varNames = [];
  const objectiveVars = [];
  
  // Create variables
  for (let m = 0; m < numMatchups; m++) {
    for (let w = 1; w <= numWeeks; w++) {
      const varName = `m${m}w${w}`;
      varNames.push(varName);
      objectiveVars.push({ name: varName, coef: 1 });
    }
  }
  
  const constraints = [];
  
  // Only constraint: each matchup scheduled once
  for (let m = 0; m < numMatchups; m++) {
    const vars = [];
    for (let w = 1; w <= numWeeks; w++) {
      vars.push({ name: `m${m}w${w}`, coef: 1 });
    }
    constraints.push({
      name: `matchup_${m}`,
      vars,
      bnds: { type: glpk.GLP_FX, lb: 1, ub: 1 }
    });
  }
  
  return {
    name: 'Minimal_Test',
    objective: {
      direction: glpk.GLP_MIN,
      name: 'obj',
      vars: objectiveVars
    },
    subjectTo: constraints,
    binaries: varNames
  };
}

function createProblemWithTeamWeekly(glpk, matchups, teams) {
  const problem = createMinimalProblem(glpk, matchups, teams);
  
  // Add team weekly constraints
  const numWeeks = 18;
  for (let t = 0; t < teams.length; t++) {
    for (let w = 1; w <= numWeeks; w++) {
      const vars = [];
      
      for (let m = 0; m < matchups.length; m++) {
        if (matchups[m].home === teams[t].id || matchups[m].away === teams[t].id) {
          vars.push({ name: `m${m}w${w}`, coef: 1 });
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

function createProblemWithGameCount(glpk, matchups, teams) {
  const problem = createProblemWithTeamWeekly(glpk, matchups, teams);
  
  // Add game count constraints
  const numWeeks = 18;
  for (let t = 0; t < teams.length; t++) {
    const vars = [];
    
    for (let m = 0; m < matchups.length; m++) {
      if (matchups[m].home === teams[t].id || matchups[m].away === teams[t].id) {
        for (let w = 1; w <= numWeeks; w++) {
          vars.push({ name: `m${m}w${w}`, coef: 1 });
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

function createProblemWithZeroObjective(glpk, matchups, teams) {
  const problem = createMinimalProblem(glpk, matchups, teams);
  
  // Set all objective coefficients to 0
  problem.objective.vars.forEach(v => v.coef = 0);
  
  return problem;
}

function createProblemWithPositiveObjective(glpk, matchups, teams) {
  const problem = createMinimalProblem(glpk, matchups, teams);
  
  // Already has positive coefficients
  return problem;
}

function createProblemWithMixedObjective(glpk, matchups, teams) {
  const problem = createMinimalProblem(glpk, matchups, teams);
  
  // Mix of positive and zero coefficients
  problem.objective.vars.forEach((v, i) => {
    const week = (i % 18) + 1;
    v.coef = (week >= 6 && week <= 12) ? 0.9 : 1.1;
  });
  
  return problem;
}

function analyzeConstraintBounds(glpk, matchups, teams) {
  // Check if bounds are causing unbounded issues
  const numWeeks = 18;
  const numTeams = teams.length;
  const numMatchups = matchups.length;
  
  console.log(`  Constraint Analysis:`);
  console.log(`  - Total variables: ${numMatchups * numWeeks}`);
  console.log(`  - Matchup constraints: ${numMatchups} (equality)`);
  console.log(`  - Team-week constraints: ${numTeams * numWeeks} (upper bound)`);
  console.log(`  - Team-game constraints: ${numTeams} (equality)`);
  
  // Check if problem is over/under constrained
  const totalVars = numMatchups * numWeeks;
  const totalConstraints = numMatchups + (numTeams * numWeeks) + numTeams;
  console.log(`  - Variable/Constraint ratio: ${(totalVars/totalConstraints).toFixed(2)}`);
  
  // Check feasibility
  const requiredGames = numTeams * 17 / 2;
  const availableSlots = numWeeks * 16; // max 16 games per week
  console.log(`  - Required games: ${requiredGames}`);
  console.log(`  - Available slots: ${availableSlots}`);
  console.log(`  - Feasible: ${requiredGames <= availableSlots ? 'YES' : 'NO'}`);
}

// Run the test
testUnboundedIssue();