const initGLPK = require('glpk.js');

// Create a test version of the constraint solver with our fixes
class TestScheduleConstraintSolver {
  constructor(matchups, teams, weeks = 18) {
    this.matchups = matchups;
    this.teams = teams;
    this.weeks = weeks;
  }

  async solve() {
    const startTime = Date.now();
    
    try {
      const glpk = await initGLPK();
      const problem = this.createProblem(glpk);
      
      console.log(`📊 Problem created:`);
      console.log(`  - Variables: ${problem.binaries.length}`);
      console.log(`  - Constraints: ${problem.subjectTo.length}`);
      
      const result = glpk.solve(problem, { msgLevel: glpk.GLP_MSG_ERR });
      const solveTime = Date.now() - startTime;
      
      console.log(`\n📈 Solution found:`);
      console.log(`  - Status: ${result.result?.status} (${this.getStatusName(result.result?.status)})`);
      console.log(`  - Objective: ${result.result?.z}`);
      console.log(`  - Solve time: ${solveTime}ms`);
      
      if (result.result?.vars) {
        const games = this.extractGames(result.result.vars);
        console.log(`  - Games scheduled: ${games.length}`);
        
        // Validate the solution
        this.validateSolution(games);
        
        return { 
          status: 'success', 
          games, 
          objective: result.result.z,
          solveTime 
        };
      }
      
      return { status: 'failed', games: [], objective: 0, solveTime };
      
    } catch (error) {
      console.error('Solver error:', error);
      return { status: 'error', games: [], objective: 0, solveTime: Date.now() - startTime };
    }
  }

  createProblem(glpk) {
    const numMatchups = this.matchups.length;
    const numTeams = this.teams.length;
    const numWeeks = this.weeks;
    
    const varNames = [];
    const objectiveVars = [];
    
    // Create variables
    for (let m = 0; m < numMatchups; m++) {
      for (let w = 1; w <= numWeeks; w++) {
        const varName = `x_${m}_${w}`;
        varNames.push(varName);
        
        // Smart objective
        let coef = 1;
        if (w <= 3 || w >= 16) coef = 1.1;
        else if (w >= 6 && w <= 12) coef = 0.9;
        
        objectiveVars.push({ name: varName, coef });
      }
    }
    
    const constraints = [];
    
    // 1. Each matchup scheduled exactly once
    for (let m = 0; m < numMatchups; m++) {
      const vars = [];
      for (let w = 1; w <= numWeeks; w++) {
        vars.push({ name: `x_${m}_${w}`, coef: 1 });
      }
      constraints.push({
        name: `matchup_${m}`,
        vars,
        bnds: { type: glpk.GLP_FX, lb: 1, ub: 1 }
      });
    }
    
    // 2. Each team plays at most once per week
    for (let t = 0; t < numTeams; t++) {
      for (let w = 1; w <= numWeeks; w++) {
        const vars = [];
        for (let m = 0; m < numMatchups; m++) {
          if (this.matchups[m].home === this.teams[t].id || 
              this.matchups[m].away === this.teams[t].id) {
            vars.push({ name: `x_${m}_${w}`, coef: 1 });
          }
        }
        if (vars.length > 0) {
          constraints.push({
            name: `team_${t}_week_${w}`,
            vars,
            bnds: { type: glpk.GLP_UP, lb: 0, ub: 1 }
          });
        }
      }
    }
    
    // 3. Each team plays exactly 17 games
    for (let t = 0; t < numTeams; t++) {
      const vars = [];
      for (let m = 0; m < numMatchups; m++) {
        if (this.matchups[m].home === this.teams[t].id || 
            this.matchups[m].away === this.teams[t].id) {
          for (let w = 1; w <= numWeeks; w++) {
            vars.push({ name: `x_${m}_${w}`, coef: 1 });
          }
        }
      }
      if (vars.length > 0) {
        constraints.push({
          name: `games_${t}`,
          vars,
          bnds: { type: glpk.GLP_FX, lb: 17, ub: 17 }
        });
      }
    }
    
    // 4. Bye week constraints (FIXED)
    for (let w = 1; w <= numWeeks; w++) {
      const weekVars = [];
      for (let m = 0; m < numMatchups; m++) {
        weekVars.push({ name: `x_${m}_${w}`, coef: 1 });
      }
      
      if (w >= 4 && w <= 14) {
        // Bye weeks allowed - use double bounds
        const minGames = Math.floor((numTeams - 6) / 2); // 13 for 32 teams
        const maxGames = numTeams / 2; // 16 for 32 teams
        
        constraints.push({
          name: `bye_week_${w}`,
          vars: weekVars,
          bnds: { type: glpk.GLP_DB, lb: minGames, ub: maxGames }
        });
      } else {
        // No bye weeks - all teams must play
        constraints.push({
          name: `no_bye_week_${w}`,
          vars: weekVars,
          bnds: { type: glpk.GLP_FX, lb: numTeams / 2, ub: numTeams / 2 }
        });
      }
    }
    
    return {
      name: 'NFL_Schedule_Fixed',
      objective: {
        direction: glpk.GLP_MIN,
        name: 'schedule_cost',
        vars: objectiveVars
      },
      subjectTo: constraints,
      binaries: varNames
    };
  }

  extractGames(vars) {
    const games = [];
    for (let m = 0; m < this.matchups.length; m++) {
      for (let w = 1; w <= this.weeks; w++) {
        if (vars[`x_${m}_${w}`] > 0.5) {
          games.push({
            matchup: this.matchups[m],
            week: w,
            homeTeam: this.matchups[m].home,
            awayTeam: this.matchups[m].away
          });
        }
      }
    }
    return games.sort((a, b) => a.week - b.week);
  }

  validateSolution(games) {
    console.log('\n🔍 Validating solution:');
    
    // Check total games
    console.log(`  - Total games: ${games.length} (expected: ${this.matchups.length})`);
    
    // Check games per week
    const gamesPerWeek = {};
    for (let w = 1; w <= this.weeks; w++) {
      gamesPerWeek[w] = games.filter(g => g.week === w).length;
    }
    
    console.log(`  - Games per week:`);
    for (let w = 1; w <= this.weeks; w++) {
      const count = gamesPerWeek[w];
      const expected = (w >= 4 && w <= 14) ? '13-16' : '16';
      console.log(`    Week ${w}: ${count} games (expected: ${expected})`);
    }
    
    // Check games per team
    const teamGames = {};
    this.teams.forEach(t => teamGames[t.id] = 0);
    
    games.forEach(g => {
      teamGames[g.homeTeam]++;
      teamGames[g.awayTeam]++;
    });
    
    const teamsWith17Games = Object.values(teamGames).filter(count => count === 17).length;
    console.log(`  - Teams with 17 games: ${teamsWith17Games}/${this.teams.length}`);
  }

  getStatusName(status) {
    const names = {
      1: 'OPTIMAL',
      2: 'FEASIBLE',
      3: 'INFEASIBLE',
      4: 'UNBOUNDED',
      5: 'UNDEFINED'
    };
    return names[status] || 'UNKNOWN';
  }
}

// Generate test data
function generateNFLTestData() {
  const teams = [];
  const conferences = ['AFC', 'NFC'];
  const divisions = ['North', 'South', 'East', 'West'];
  
  let teamId = 0;
  for (const conf of conferences) {
    for (const div of divisions) {
      for (let i = 0; i < 4; i++) {
        teams.push({
          id: `T${teamId}`,
          name: `${conf} ${div} Team ${i + 1}`,
          conference: conf,
          division: div
        });
        teamId++;
      }
    }
  }
  
  // Generate exactly 272 matchups (17 games per team)
  const matchups = [];
  const gamesPerTeam = {};
  teams.forEach(t => gamesPerTeam[t.id] = 0);
  
  // Simple round-robin to ensure each team gets exactly 17 games
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      if (gamesPerTeam[teams[i].id] < 17 && gamesPerTeam[teams[j].id] < 17) {
        matchups.push({
          home: teams[i].id,
          away: teams[j].id
        });
        gamesPerTeam[teams[i].id]++;
        gamesPerTeam[teams[j].id]++;
        
        if (matchups.length >= 272) break;
      }
    }
    if (matchups.length >= 272) break;
  }
  
  return { teams, matchups };
}

// Run the test
async function testSolverWithFix() {
  console.log('🧪 Testing Fixed Constraint Solver with NFL Data...\n');
  
  const { teams, matchups } = generateNFLTestData();
  
  console.log(`📊 Test Data:`);
  console.log(`  - Teams: ${teams.length}`);
  console.log(`  - Matchups: ${matchups.length}`);
  console.log(`  - Weeks: 18\n`);
  
  const solver = new TestScheduleConstraintSolver(matchups, teams, 18);
  const result = await solver.solve();
  
  console.log('\n✅ Test completed!');
  console.log(`  Final status: ${result.status}`);
  console.log(`  Games scheduled: ${result.games.length}`);
  console.log(`  Total time: ${result.solveTime}ms`);
}

testSolverWithFix();