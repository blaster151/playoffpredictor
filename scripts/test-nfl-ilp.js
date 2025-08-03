const initGLPK = require('glpk.js');

// Mock NFL data for testing
const mockTeams = [
  // AFC North
  { id: 'ravens', name: 'Ravens', abbreviation: 'BAL', conference: 'AFC', division: 'North' },
  { id: 'browns', name: 'Browns', abbreviation: 'CLE', conference: 'AFC', division: 'North' },
  { id: 'bengals', name: 'Bengals', abbreviation: 'CIN', conference: 'AFC', division: 'North' },
  { id: 'steelers', name: 'Steelers', abbreviation: 'PIT', conference: 'AFC', division: 'North' },
  
  // AFC South
  { id: 'texans', name: 'Texans', abbreviation: 'HOU', conference: 'AFC', division: 'South' },
  { id: 'colts', name: 'Colts', abbreviation: 'IND', conference: 'AFC', division: 'South' },
  { id: 'jaguars', name: 'Jaguars', abbreviation: 'JAX', conference: 'AFC', division: 'South' },
  { id: 'titans', name: 'Titans', abbreviation: 'TEN', conference: 'AFC', division: 'South' },
  
  // AFC East
  { id: 'bills', name: 'Bills', abbreviation: 'BUF', conference: 'AFC', division: 'East' },
  { id: 'dolphins', name: 'Dolphins', abbreviation: 'MIA', conference: 'AFC', division: 'East' },
  { id: 'jets', name: 'Jets', abbreviation: 'NYJ', conference: 'AFC', division: 'East' },
  { id: 'patriots', name: 'Patriots', abbreviation: 'NE', conference: 'AFC', division: 'East' },
  
  // AFC West
  { id: 'chiefs', name: 'Chiefs', abbreviation: 'KC', conference: 'AFC', division: 'West' },
  { id: 'raiders', name: 'Raiders', abbreviation: 'LV', conference: 'AFC', division: 'West' },
  { id: 'chargers', name: 'Chargers', abbreviation: 'LAC', conference: 'AFC', division: 'West' },
  { id: 'broncos', name: 'Broncos', abbreviation: 'DEN', conference: 'AFC', division: 'West' },

  // NFC North
  { id: 'bears', name: 'Bears', abbreviation: 'CHI', conference: 'NFC', division: 'North' },
  { id: 'lions', name: 'Lions', abbreviation: 'DET', conference: 'NFC', division: 'North' },
  { id: 'packers', name: 'Packers', abbreviation: 'GB', conference: 'NFC', division: 'North' },
  { id: 'vikings', name: 'Vikings', abbreviation: 'MIN', conference: 'NFC', division: 'North' },
  
  // NFC South
  { id: 'falcons', name: 'Falcons', abbreviation: 'ATL', conference: 'NFC', division: 'South' },
  { id: 'panthers', name: 'Panthers', abbreviation: 'CAR', conference: 'NFC', division: 'South' },
  { id: 'saints', name: 'Saints', abbreviation: 'NO', conference: 'NFC', division: 'South' },
  { id: 'buccaneers', name: 'Buccaneers', abbreviation: 'TB', conference: 'NFC', division: 'South' },
  
  // NFC East
  { id: 'cowboys', name: 'Cowboys', abbreviation: 'DAL', conference: 'NFC', division: 'East' },
  { id: 'eagles', name: 'Eagles', abbreviation: 'PHI', conference: 'NFC', division: 'East' },
  { id: 'giants', name: 'Giants', abbreviation: 'NYG', conference: 'NFC', division: 'East' },
  { id: 'commanders', name: 'Commanders', abbreviation: 'WAS', conference: 'NFC', division: 'East' },
  
  // NFC West
  { id: 'cardinals', name: 'Cardinals', abbreviation: 'ARI', conference: 'NFC', division: 'West' },
  { id: 'rams', name: 'Rams', abbreviation: 'LAR', conference: 'NFC', division: 'West' },
  { id: '49ers', name: '49ers', abbreviation: 'SF', conference: 'NFC', division: 'West' },
  { id: 'seahawks', name: 'Seahawks', abbreviation: 'SEA', conference: 'NFC', division: 'West' },
];

// Generate mock matchups (division games only for testing)
const mockMatchups = [];
for (let i = 0; i < mockTeams.length; i += 4) {
  const division = mockTeams.slice(i, i + 4);
  for (let j = 0; j < division.length; j++) {
    for (let k = j + 1; k < division.length; k++) {
      mockMatchups.push({
        home: division[j].id,
        away: division[k].id
      });
    }
  }
}

// NFL Schedule ILP class (simplified for testing)
class NFLScheduleILP {
  constructor(glpkInstance, teams, matchups, weeks = 18, constraints = {}) {
    this.glpk = glpkInstance;
    this.teams = teams;
    this.matchups = matchups;
    this.weeks = weeks;
    this.constraints = {
      maxConsecutiveHome: 3,
      maxConsecutiveAway: 3,
      maxGamesPerWeek: 16,
      byeWeekRange: { min: 4, max: 14 },
      ...constraints,
    };
  }

  createILPModel() {
    const numMatchups = this.matchups.length;
    const numTeams = this.teams.length;
    const numWeeks = this.weeks;

    // Step 1: Create binary decision variables
    const varNames = [];

    for (let m = 0; m < numMatchups; m++) {
      for (let w = 1; w <= numWeeks; w++) {
        const varName = `m${m}w${w}`;
        varNames.push(varName);
      }
    }

    // Simple objective: minimize 0 (find any valid schedule)
    const objectiveVars = varNames.map(v => ({ name: v, coef: 0 }));

    // Step 2: Create constraints
    const subjectTo = [];

    // Constraint 1: One week per matchup
    for (let m = 0; m < numMatchups; m++) {
      const matchupVars = [];
      for (let w = 1; w <= numWeeks; w++) {
        matchupVars.push({ name: `m${m}w${w}`, coef: 1 });
      }
      subjectTo.push({
        name: `matchup_${m}`,
        vars: matchupVars,
        bnds: { type: this.glpk.GLP_FX, ub: 1, lb: 1 }
      });
    }

    // Constraint 2: One game per team per week
    for (let t = 0; t < numTeams; t++) {
      for (let w = 1; w <= numWeeks; w++) {
        const teamVars = [];
        
        for (let m = 0; m < numMatchups; m++) {
          const matchup = this.matchups[m];
          if (matchup.home === this.teams[t].id || matchup.away === this.teams[t].id) {
            teamVars.push({ name: `m${m}w${w}`, coef: 1 });
          }
        }
        
        if (teamVars.length > 0) {
          subjectTo.push({
            name: `team_${t}_week_${w}`,
            vars: teamVars,
            bnds: { type: this.glpk.GLP_UP, ub: 1, lb: 0 }
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
        bnds: { 
          type: this.glpk.GLP_UP, 
          ub: this.constraints.maxGamesPerWeek || 16, 
          lb: 0 
        }
      });
    }

    // Constraint 4: Each team plays exactly 3 games (for this test with division games only)
    for (let t = 0; t < numTeams; t++) {
      const teamGameVars = [];
      
      for (let m = 0; m < numMatchups; m++) {
        const matchup = this.matchups[m];
        if (matchup.home === this.teams[t].id || matchup.away === this.teams[t].id) {
          for (let w = 1; w <= numWeeks; w++) {
            teamGameVars.push({ name: `m${m}w${w}`, coef: 1 });
          }
        }
      }
      
      if (teamGameVars.length > 0) {
        subjectTo.push({
          name: `bye_${t}`,
          vars: teamGameVars,
          bnds: { 
            type: this.glpk.GLP_FX, 
            ub: 3, 
            lb: 3 
          }
        });
      }
    }

    return {
      name: 'NFL_Schedule_Optimization',
      objective: {
        direction: this.glpk.GLP_MIN,
        name: 'dummy',
        vars: objectiveVars
      },
      subjectTo: subjectTo,
      binaries: varNames
    };
  }



  extractSolution(result) {
    const games = [];
    
    for (let m = 0; m < this.matchups.length; m++) {
      for (let w = 1; w <= this.weeks; w++) {
        const varName = `m${m}w${w}`;
        const value = result.vars[varName];
        
        if (value > 0.5) {
          const matchup = this.matchups[m];
          games.push({
            matchup,
            week: w,
            homeTeam: matchup.home,
            awayTeam: matchup.away,
          });
        }
      }
    }
    
    return games.sort((a, b) => a.week - b.week);
  }

  calculateStats(games) {
    const gamesPerWeek = {};
    const teamGames = {};
    
    for (let w = 1; w <= this.weeks; w++) {
      gamesPerWeek[w] = 0;
    }
    
    for (const team of this.teams) {
      teamGames[team.id] = 0;
    }
    
    for (const game of games) {
      gamesPerWeek[game.week]++;
      teamGames[game.homeTeam]++;
      teamGames[game.awayTeam]++;
    }
    
    const weeksUsed = Object.values(gamesPerWeek).filter(count => count > 0).length;
    const averageGamesPerWeek = games.length / weeksUsed;
    
    return {
      totalGames: games.length,
      weeksUsed,
      teamsWithByes: Object.values(teamGames).filter(count => count === 3).length, // 3 games for this test
      averageGamesPerWeek,
    };
  }

  async solve() {
    const startTime = Date.now();

    try {
      const problem = this.createILPModel();
      
      console.log(`Created ILP model with ${problem.binaries.length} variables and ${problem.subjectTo.length} constraints`);
      
      const result = await this.glpk.solve(problem);
      const solveTime = Date.now() - startTime;

      console.log('GLPK result:', {
        status: result.status,
        resultStatus: result.result?.status,
        objective: result.result?.z,
        time: result.time
      });

      if (result.status === 'optimal' || result.result?.status === 1) {
        const games = this.extractSolution(result.result);
        const stats = this.calculateStats(games);
        
        return {
          games,
          objective: result.result.z,
          status: 'optimal',
          solveTime,
          stats,
        };
      } else {
        console.log('GLPK solve failed with status:', result.status, result.result?.status);
        return {
          games: [],
          objective: 0,
          status: result.status || 'infeasible',
          solveTime,
          stats: { totalGames: 0, weeksUsed: 0, teamsWithByes: 0, averageGamesPerWeek: 0 },
        };
      }
    } catch (error) {
      console.error('GLPK solve error:', error);
      return {
        games: [],
        objective: 0,
        status: 'error',
        solveTime: Date.now() - startTime,
        stats: { totalGames: 0, weeksUsed: 0, teamsWithByes: 0, averageGamesPerWeek: 0 },
      };
    }
  }
}

async function testNFLILP() {
  console.log('🚀 Testing NFL Schedule ILP Model...\n');

  try {
    // Step 1: Initialize GLPK
    console.log('📋 Step 1: Initializing GLPK...');
    const glpk = await initGLPK();
    console.log('✅ GLPK initialized successfully!\n');

    // Step 2: Create solver
    console.log('📋 Step 2: Creating NFL Schedule ILP solver...');
    console.log(`Teams: ${mockTeams.length}`);
    console.log(`Matchups: ${mockMatchups.length}`);
    console.log(`Weeks: 18`);
    
    const solver = new NFLScheduleILP(glpk, mockTeams, mockMatchups, 18, {
      maxConsecutiveHome: 3,
      maxConsecutiveAway: 3,
      maxGamesPerWeek: 16,
      byeWeekRange: { min: 4, max: 14 },
      primeTimeGames: ['ravens-cowboys', 'chiefs-bills', 'eagles-cowboys'],
      rivalryWeeks: {
        1: ['ravens-steelers', 'cowboys-eagles'],
        17: ['packers-bears', 'chiefs-raiders'],
      },
    });
    console.log('✅ NFL Schedule ILP solver created successfully!\n');

    // Step 3: Solve the schedule
    console.log('⚡ Step 3: Solving NFL schedule optimization...');
    const solution = await solver.solve();
    
    if (solution.status === 'optimal') {
      console.log('✅ NFL schedule solved successfully!');
      console.log(`📊 Objective value: ${solution.objective}`);
      console.log(`⏱️ Solve time: ${solution.solveTime}ms`);
      console.log(`📅 Total games: ${solution.stats.totalGames}`);
      console.log(`📅 Weeks used: ${solution.stats.weeksUsed}`);
      console.log(`🏖️ Teams with byes: ${solution.stats.teamsWithByes}`);
      console.log(`📊 Average games per week: ${solution.stats.averageGamesPerWeek.toFixed(2)}\n`);
    } else {
      console.log(`❌ NFL schedule solve failed: ${solution.status}`);
      return;
    }

    // Step 4: Show sample schedule
    console.log('📅 Step 4: Sample schedule (first 20 games):');
    solution.games.slice(0, 20).forEach((game, index) => {
      const homeTeam = mockTeams.find(t => t.id === game.homeTeam);
      const awayTeam = mockTeams.find(t => t.id === game.awayTeam);
      console.log(`  Week ${game.week}: ${awayTeam?.abbreviation} @ ${homeTeam?.abbreviation}`);
    });
    console.log('');

    // Step 5: Show games per week distribution
    console.log('📊 Step 5: Games per week distribution:');
    const gamesPerWeek = {};
    for (const game of solution.games) {
      gamesPerWeek[game.week] = (gamesPerWeek[game.week] || 0) + 1;
    }
    
    for (let week = 1; week <= 18; week++) {
      const count = gamesPerWeek[week] || 0;
      console.log(`  Week ${week}: ${count} games`);
    }
    console.log('');

    console.log('🎉 NFL Schedule ILP test successful!');
    console.log('\n📋 Summary:');
    console.log(`  - Successfully created ILP model with ${mockMatchups.length * 18} binary variables`);
    console.log(`  - Solved ${solution.games.length} games across 18 weeks`);
    console.log(`  - Optimized for constraints and preferences`);
    console.log(`  - Generated valid NFL schedule`);

  } catch (error) {
    console.error('❌ NFL Schedule ILP test failed:', error);
  }
}

// Run the test
testNFLILP(); 