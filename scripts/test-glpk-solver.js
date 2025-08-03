const initGLPK = require('glpk.js');

async function testGLPKSolver() {
  console.log('🧪 Testing GLPK Solver with updated API format...\n');

  try {
    // Initialize GLPK
    console.log('📦 Initializing GLPK...');
    const glpk = await initGLPK();
    console.log('✅ GLPK initialized successfully\n');

    // Mock data for testing
    const teams = [
      { id: 'BUF', name: 'Buffalo Bills', division: 'AFC East' },
      { id: 'MIA', name: 'Miami Dolphins', division: 'AFC East' },
      { id: 'NE', name: 'New England Patriots', division: 'AFC East' },
      { id: 'NYJ', name: 'New York Jets', division: 'AFC East' },
    ];

    const matchups = [
      { home: 'BUF', away: 'MIA' },
      { home: 'BUF', away: 'NE' },
      { home: 'BUF', away: 'NYJ' },
      { home: 'MIA', away: 'NE' },
      { home: 'MIA', away: 'NYJ' },
      { home: 'NE', away: 'NYJ' },
    ];

    const weeks = 4; // Small test with 4 weeks

    console.log(`📊 Test data: ${teams.length} teams, ${matchups.length} matchups, ${weeks} weeks\n`);

    // Create the ILP problem exactly as in our solver
    const numMatchups = matchups.length;
    const numTeams = teams.length;
    const numWeeks = weeks;

    // Create binary decision variables for every possible "matchup → week" combination
    const varNames = [];
    const objectiveVars = [];

    for (let m = 0; m < numMatchups; m++) {
      for (let w = 1; w <= numWeeks; w++) {
        const varName = `m${m}w${w}`;
        varNames.push(varName);
        objectiveVars.push({ name: varName, coef: 0 }); // Minimize 0
      }
    }

    console.log(`🔢 Created ${varNames.length} binary variables\n`);

    // Constraints
    const subjectTo = [];

    // Constraint 1: Each matchup happens once
    for (let m = 0; m < numMatchups; m++) {
      const matchupVars = [];
      for (let w = 1; w <= numWeeks; w++) {
        matchupVars.push({ name: `m${m}w${w}`, coef: 1 });
      }
      subjectTo.push({
        name: `matchup_${m}`,
        vars: matchupVars,
        bnds: { type: glpk.GLP_FX, ub: 1, lb: 1 } // sum = 1
      });
    }

    // Constraint 2: Each team can play at most one game per week
    for (let t = 0; t < numTeams; t++) {
      for (let w = 1; w <= numWeeks; w++) {
        const teamVars = [];
        
        // Find all matchups involving this team
        for (let m = 0; m < numMatchups; m++) {
          const matchup = matchups[m];
          if (matchup.home === teams[t].id || matchup.away === teams[t].id) {
            teamVars.push({ name: `m${m}w${w}`, coef: 1 });
          }
        }
        
        if (teamVars.length > 0) {
          subjectTo.push({
            name: `team_${t}_week_${w}`,
            vars: teamVars,
            bnds: { type: glpk.GLP_UP, ub: 1, lb: 0 } // at most 1 game per week
          });
        }
      }
    }

    // Constraint 3: Maximum games per week
    for (let w = 1; w <= numWeeks; w++) {
      const weekVars = [];
      
      for (let m = 0; m < numMatchups; m++) {
        weekVars.push({ name: `m${m}w${w}`, coef: 1 });
      }
      
      subjectTo.push({
        name: `max_games_week_${w}`,
        vars: weekVars,
        bnds: { type: glpk.GLP_UP, ub: 2, lb: 0 } // max 2 games per week for this test
      });
    }

    // Constraint 4: Each team plays exactly 3 games (for this small test)
    for (let t = 0; t < numTeams; t++) {
      const teamGameVars = [];
      
      // Sum of all games for this team should equal 3
      for (let m = 0; m < numMatchups; m++) {
        const matchup = matchups[m];
        if (matchup.home === teams[t].id || matchup.away === teams[t].id) {
          for (let w = 1; w <= numWeeks; w++) {
            teamGameVars.push({ name: `m${m}w${w}`, coef: 1 });
          }
        }
      }
      
      if (teamGameVars.length > 0) {
        subjectTo.push({
          name: `games_${t}`,
          vars: teamGameVars,
          bnds: { type: glpk.GLP_FX, ub: 3, lb: 3 } // exactly 3 games
        });
      }
    }

    // Constraint 5: Bye week restrictions - no complete bye weeks in certain weeks
    const noByeWeeks = [1]; // For this 4-week test, only Week 1 is restricted
    
    for (const week of noByeWeeks) {
      const weekGameVars = [];
      
      // Collect all games that could be played this week
      for (let m = 0; m < numMatchups; m++) {
        weekGameVars.push({ name: `m${m}w${week}`, coef: 1 });
      }
      
      // Ensure at least some games are played (no complete bye week)
      if (weekGameVars.length > 0) {
        subjectTo.push({
          name: `no_bye_week_${week}`,
          vars: weekGameVars,
          bnds: { type: glpk.GLP_LO, ub: 0, lb: 1 } // at least 1 game
        });
      }
    }

    console.log(`🔗 Created ${subjectTo.length} constraints\n`);

    // Create the problem exactly as in our solver
    const problem = {
      name: 'NFL_Schedule_Test',
      objective: {
        direction: glpk.GLP_MIN,
        name: 'dummy',
        vars: objectiveVars
      },
      subjectTo: subjectTo,
      binaries: varNames
    };

    console.log('🚀 Solving with GLPK...');
    
    // Solve using the exact API format from our solver
    const result = glpk.solve(problem, { msgLevel: glpk.GLP_MSG_OFF });
    
    console.log('📊 GLPK Result:');
    console.log(`   Status: ${result.result?.status}`);
    console.log(`   Full result object:`, JSON.stringify(result, null, 2));
    console.log(`   Result keys:`, Object.keys(result));
    if (result.result) {
      console.log(`   Result.result keys:`, Object.keys(result.result));
    }
    console.log(`   Objective: ${result.result?.z}`);
    console.log(`   Variables: ${result.result?.vars ? Object.keys(result.result.vars).length : 'none'}\n`);

    // GLPK status codes: 1=optimal, 2=feasible, 3=infeasible, 4=unbounded, 5=undefined
    const statusText = {
      1: 'OPTIMAL',
      2: 'FEASIBLE', 
      3: 'INFEASIBLE',
      4: 'UNBOUNDED',
      5: 'UNDEFINED'
    };
    
    const status = result.result?.status;
    console.log(`   Status code ${status}: ${statusText[status] || 'UNKNOWN'}\n`);

    if (status === 1 || status === 5) { // OPTIMAL or UNDEFINED (but with solution)
      console.log('✅ Solution found! Converting to schedule...\n');
      
      // Convert solution back to schedule using exact format from our solver
      const schedule = [];
      
      for (let m = 0; m < matchups.length; m++) {
        for (let w = 1; w <= weeks; w++) {
          const varName = `m${m}w${w}`;
          if (result.result.vars[varName] === 1) {
            schedule.push({ week: w, ...matchups[m] });
          }
        }
      }
      
      console.log('📅 Generated Schedule:');
      console.table(schedule.sort((a, b) => a.week - b.week));
      
      // Validate the solution
      console.log('\n🔍 Validating solution...');
      
      // Check each matchup appears once
      const matchupCounts = {};
      schedule.forEach(game => {
        const key = `${game.home}-${game.away}`;
        matchupCounts[key] = (matchupCounts[key] || 0) + 1;
      });
      
      const validMatchups = Object.values(matchupCounts).every(count => count === 1);
      console.log(`   Each matchup appears once: ${validMatchups ? '✅' : '❌'}`);
      
      // Check each team plays exactly 3 games
      const teamGameCounts = {};
      schedule.forEach(game => {
        teamGameCounts[game.home] = (teamGameCounts[game.home] || 0) + 1;
        teamGameCounts[game.away] = (teamGameCounts[game.away] || 0) + 1;
      });
      
      const validTeamGames = teams.every(team => teamGameCounts[team.id] === 3);
      console.log(`   Each team plays 3 games: ${validTeamGames ? '✅' : '❌'}`);
      
      // Check max games per week
      const gamesPerWeek = {};
      schedule.forEach(game => {
        gamesPerWeek[game.week] = (gamesPerWeek[game.week] || 0) + 1;
      });
      
      const validGamesPerWeek = Object.values(gamesPerWeek).every(count => count <= 2);
      console.log(`   Max 2 games per week: ${validGamesPerWeek ? '✅' : '❌'}`);
      
      // Check bye week restrictions
      const noByeWeeks = [1]; // Week 1 should have games
      const validByeWeeks = noByeWeeks.every(week => gamesPerWeek[week] && gamesPerWeek[week] > 0);
      console.log(`   No complete bye weeks in restricted weeks: ${validByeWeeks ? '✅' : '❌'}`);
      
      console.log('\n🎉 Test completed successfully!');
      
    } else {
      console.log('❌ No optimal solution found');
      console.log(`   Status: ${statusText[status] || 'UNKNOWN'} (code: ${status})`);
    }

  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

testGLPKSolver(); 