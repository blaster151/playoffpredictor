import initGLPK from 'glpk.js';

// GLPK problem interface
interface GLPKProblem {
  name: string;
  objective: { 
    direction: 'max' | 'min'; 
    name: string; 
    vars: { name: string; coef: number }[] 
  };
  subjectTo: { 
    name: string; 
    vars: { name: string; coef: number }[]; 
    bnds: { type: number; ub?: number; lb?: number } 
  }[];
  binaries: string[];
}

// NFL data interfaces
interface Team {
  id: string;
  name: string;
  abbreviation: string;
  conference: 'AFC' | 'NFC';
  division: string;
}

interface Matchup {
  home: string;
  away: string;
}

interface ScheduleConstraints {
  maxConsecutiveHome?: number;
  maxConsecutiveAway?: number;
  maxGamesPerWeek?: number;
  byeWeekRange?: { min: number; max: number };
  primeTimeGames?: string[];
  rivalryWeeks?: { [week: number]: string[] };
  travelDistance?: { [teamId: string]: { [teamId: string]: number } };
  internationalGames?: {
    teams: string[]; // Teams that will play international games
    preferredWeeks?: number[]; // Preferred weeks for international games (typically 4-10)
    venues?: string[]; // International venues (London, Mexico City, Munich, etc.)
  };
}

interface ScheduleSolution {
  games: {
    matchup: Matchup;
    week: number;
    homeTeam: string;
    awayTeam: string;
  }[];
  objective: number;
  status: 'optimal' | 'infeasible' | 'unbounded' | 'error';
  solveTime: number;
  stats: {
    totalGames: number;
    weeksUsed: number;
    teamsWithByes: number;
    averageGamesPerWeek: number;
  };
}

export class NFLScheduleILP {
  private glpk: any;
  private teams: Team[];
  private matchups: Matchup[];
  private weeks: number;
  private constraints: ScheduleConstraints;

  constructor(
    glpkInstance: any,
    teams: Team[],
    matchups: Matchup[],
    weeks: number = 18,
    constraints: ScheduleConstraints = {}
  ) {
    this.glpk = glpkInstance;
    this.teams = teams;
    this.matchups = matchups;
    this.weeks = weeks;
    this.constraints = {
      maxConsecutiveHome: 3,
      maxConsecutiveAway: 3,
      maxGamesPerWeek: 16,
      byeWeekRange: { min: 4, max: 14 }, // Weeks 4-14 for byes
      ...constraints,
    };
  }

  /**
   * Create the complete ILP model for NFL schedule optimization
   */
  createILPModel(): GLPKProblem {
    const numMatchups = this.matchups.length;
    const numTeams = this.teams.length;
    const numWeeks = this.weeks;

    // Step 1: Create binary decision variables
    // Variables: m0w1, m0w2, ..., m{numMatchups-1}w{numWeeks}
    const varNames: string[] = [];
    const objectiveVars: { name: string; coef: number }[] = [];

    for (let m = 0; m < numMatchups; m++) {
      for (let w = 1; w <= numWeeks; w++) {
        const varName = `m${m}w${w}`;
        varNames.push(varName);
        
        // Calculate objective coefficient for this variable
        const cost = this.calculateObjectiveCost(m, w);
        objectiveVars.push({ name: varName, coef: cost });
      }
    }

    // Step 2: Create constraints
    const subjectTo: any[] = [];

    // Constraint 1: One week per matchup
    // sum_w x[m,w] = 1 for each matchup m
    for (let m = 0; m < numMatchups; m++) {
      const matchupVars = [];
      for (let w = 1; w <= numWeeks; w++) {
        matchupVars.push({ name: `m${m}w${w}`, coef: 1 });
      }
      subjectTo.push({
        name: `matchup_${m}`,
        vars: matchupVars,
        bnds: { type: this.glpk.GLP_FX, ub: 1, lb: 1 } // sum = 1
      });
    }

    // Constraint 2: One game per team per week
    // For each team T, each week W: sum_{m involving T} x[m, W] ≤ 1
    for (let t = 0; t < numTeams; t++) {
      for (let w = 1; w <= numWeeks; w++) {
        const teamVars = [];
        
        // Find all matchups involving this team
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
            bnds: { type: this.glpk.GLP_UP, ub: 1, lb: 0 } // ≤ 1
          });
        }
      }
    }

    // Constraint 3: Maximum games per week
    // sum_m x[m, w] ≤ maxGamesPerWeek for each week w
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

    // Constraint 4: Bye week range (optional)
    // Each team must have exactly one bye week within the specified range
    if (this.constraints.byeWeekRange) {
      for (let t = 0; t < numTeams; t++) {
        const teamGameVars = [];
        
        // Sum of all games for this team
        for (let m = 0; m < numMatchups; m++) {
          const matchup = this.matchups[m];
          if (matchup.home === this.teams[t].id || matchup.away === this.teams[t].id) {
            for (let w = 1; w <= numWeeks; w++) {
              teamGameVars.push({ name: `m${m}w${w}`, coef: 1 });
            }
          }
        }
        
        if (teamGameVars.length > 0) {
          // Each team plays exactly (numWeeks - 1) games (one bye week)
          subjectTo.push({
            name: `bye_${t}`,
            vars: teamGameVars,
            bnds: { 
              type: this.glpk.GLP_FX, 
              ub: numWeeks - 1, 
              lb: numWeeks - 1 
            }
          });
        }
      }
    }

    // Constraint 5: No more than 3 consecutive home/away games (optional)
    if (this.constraints.maxConsecutiveHome || this.constraints.maxConsecutiveAway) {
      this.addConsecutiveGameConstraints(subjectTo);
    }

    return {
      name: 'NFL_Schedule_Optimization',
      objective: {
        direction: 'min',
        name: 'total_cost',
        vars: objectiveVars
      },
      subjectTo: subjectTo,
      binaries: varNames
    };
  }

  /**
   * Calculate objective cost for a matchup-week combination
   */
  private calculateObjectiveCost(matchupIndex: number, week: number): number {
    const matchup = this.matchups[matchupIndex];
    let cost = 1; // Base cost

    // Add cost for prime time games
    if (this.constraints.primeTimeGames?.includes(`${matchup.home}-${matchup.away}`)) {
      cost += 10; // Encourage prime time games
    }

    // Add cost for rivalry weeks
    if (this.constraints.rivalryWeeks?.[week]?.includes(`${matchup.home}-${matchup.away}`)) {
      cost += 5; // Encourage rivalry games in specific weeks
    }

    // Add travel distance cost
    if (this.constraints.travelDistance?.[matchup.home]?.[matchup.away]) {
      cost += this.constraints.travelDistance[matchup.home][matchup.away] * 0.1;
    }

    // Add cost for bye week timing
    if (this.constraints.byeWeekRange) {
      const { min, max } = this.constraints.byeWeekRange;
      if (week < min || week > max) {
        cost += 2; // Discourage games outside bye week range
      }
    }

    // Add cost for international games
    if (this.constraints.internationalGames) {
      const internationalTeams = this.constraints.internationalGames.teams;
      const preferredWeeks = this.constraints.internationalGames.preferredWeeks || [4, 5, 6, 7, 8, 9, 10];
      
      const isInternationalGame = internationalTeams.includes(matchup.home) || internationalTeams.includes(matchup.away);
      
      if (isInternationalGame) {
        if (preferredWeeks.includes(week)) {
          cost -= 5; // Encourage international games in preferred weeks
        } else {
          cost += 10; // Discourage international games outside preferred weeks
        }
      }
    }

    return cost;
  }

  /**
   * Add constraints to prevent too many consecutive home/away games
   */
  private addConsecutiveGameConstraints(subjectTo: any[]): void {
    const maxConsecutive = Math.max(
      this.constraints.maxConsecutiveHome || 3,
      this.constraints.maxConsecutiveAway || 3
    );

    // For each team, prevent more than maxConsecutive consecutive home/away games
    for (let t = 0; t < this.teams.length; t++) {
      for (let w = 1; w <= this.weeks - maxConsecutive; w++) {
        const consecutiveVars = [];
        
        // Check consecutive weeks for this team
        for (let consecutiveWeek = 0; consecutiveWeek <= maxConsecutive; consecutiveWeek++) {
          const week = w + consecutiveWeek;
          if (week <= this.weeks) {
            // Find all matchups involving this team in this week
            for (let m = 0; m < this.matchups.length; m++) {
              const matchup = this.matchups[m];
              if (matchup.home === this.teams[t].id || matchup.away === this.teams[t].id) {
                consecutiveVars.push({ name: `m${m}w${week}`, coef: 1 });
              }
            }
          }
        }
        
        if (consecutiveVars.length > 0) {
          subjectTo.push({
            name: `consecutive_${t}_week_${w}`,
            vars: consecutiveVars,
            bnds: { 
              type: this.glpk.GLP_UP, 
              ub: maxConsecutive, 
              lb: 0 
            }
          });
        }
      }
    }
  }

  /**
   * Solve the ILP model
   */
  async solve(): Promise<ScheduleSolution> {
    const startTime = Date.now();

    try {
      // Create the ILP model
      const problem = this.createILPModel();
      
      console.log(`Created ILP model with ${problem.binaries.length} variables and ${problem.subjectTo.length} constraints`);
      
      // Solve using GLPK (solve is synchronous)
      const result = this.glpk.solve(problem);
      
      const solveTime = Date.now() - startTime;

      // Check result status - GLPK.js returns numeric codes
      const statusCode = result.result?.status;
      console.log('GLPK Status Code:', statusCode, 'Result:', result);
      
      // Status codes: 1=optimal, 2=feasible, 3=infeasible, 4=unbounded, 5=undefined
      if (result.result && result.result.vars && Object.keys(result.result.vars).length > 0) {
        const games = this.extractSolution(result.result);
        const stats = this.calculateStats(games);
        
        // Map numeric status to string
        let status: 'optimal' | 'infeasible' | 'unbounded' | 'error' = 'optimal';
        if (statusCode === 3) status = 'infeasible';
        else if (statusCode === 4) status = 'unbounded';
        else if (!statusCode || (statusCode !== 1 && statusCode !== 5)) status = 'error';
        
        return {
          games,
          objective: result.result.z || 0,
          status,
          solveTime,
          stats,
        };
      } else {
        console.log('GLPK solve failed - no solution found');
        return {
          games: [],
          objective: 0,
          status: 'infeasible',
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

  /**
   * Extract solution from GLPK result
   */
  private extractSolution(result: any): ScheduleSolution['games'] {
    const games: ScheduleSolution['games'] = [];
    
    for (let m = 0; m < this.matchups.length; m++) {
      for (let w = 1; w <= this.weeks; w++) {
        const varName = `m${m}w${w}`;
        const value = result.vars[varName];
        
        if (value > 0.5) { // Binary variable threshold
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

  /**
   * Calculate solution statistics
   */
  private calculateStats(games: ScheduleSolution['games']) {
    const gamesPerWeek: { [week: number]: number } = {};
    const teamGames: { [teamId: string]: number } = {};
    
    // Initialize counters
    for (let w = 1; w <= this.weeks; w++) {
      gamesPerWeek[w] = 0;
    }
    
    for (const team of this.teams) {
      teamGames[team.id] = 0;
    }
    
    // Count games
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
      teamsWithByes: Object.values(teamGames).filter(count => count === this.weeks - 1).length,
      averageGamesPerWeek,
    };
  }

  /**
   * Validate the solution
   */
  validateSolution(games: ScheduleSolution['games']): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check that all matchups are scheduled
    if (games.length !== this.matchups.length) {
      errors.push(`Expected ${this.matchups.length} games, got ${games.length}`);
    }
    
    // Check that each team plays the correct number of games
    const teamGames: { [teamId: string]: number } = {};
    for (const team of this.teams) {
      teamGames[team.id] = 0;
    }
    
    for (const game of games) {
      teamGames[game.homeTeam]++;
      teamGames[game.awayTeam]++;
    }
    
    const expectedGames = this.weeks - 1; // One bye week
    for (const [teamId, count] of Object.entries(teamGames)) {
      if (count !== expectedGames) {
        errors.push(`Team ${teamId} has ${count} games, expected ${expectedGames}`);
      }
    }
    
    // Check max games per week
    const gamesPerWeek: { [week: number]: number } = {};
    for (const game of games) {
      gamesPerWeek[game.week] = (gamesPerWeek[game.week] || 0) + 1;
    }
    
    for (const [week, count] of Object.entries(gamesPerWeek)) {
      if (count > (this.constraints.maxGamesPerWeek || 16)) {
        errors.push(`Week ${week} has ${count} games, max allowed is ${this.constraints.maxGamesPerWeek || 16}`);
      }
    }

    // Validate division rivalry constraint - each team must play division rivals exactly twice
    const divisions: { [key: string]: string[] } = {};
    
    // Group teams by division
    for (const team of this.teams) {
      const divKey = `${team.conference}_${team.division}`;
      if (!divisions[divKey]) {
        divisions[divKey] = [];
      }
      divisions[divKey].push(team.id);
    }

        // Check division games for each team
    for (const [divisionName, teamsInDiv] of Object.entries(divisions)) {
      for (const teamId of teamsInDiv) {
        let divisionGameCount = 0;
        
        // Count games where this team is involved against division rivals
        for (const game of games) {
          if (game.homeTeam === teamId || game.awayTeam === teamId) {
            const opponent = game.homeTeam === teamId ? game.awayTeam : game.homeTeam;
            const opponentTeam = this.teams.find(t => t.id === opponent);
            const currentTeam = this.teams.find(t => t.id === teamId);
            
            if (opponentTeam && currentTeam &&
                opponentTeam.conference === currentTeam.conference &&
                opponentTeam.division === currentTeam.division) {
              divisionGameCount++;
            }
          }
        }
        
        // Each team should have 6 division games (3 opponents × 2 games each)
        if (divisionGameCount !== 6) {
          errors.push(`Team ${teamId} has ${divisionGameCount} division games, expected 6`);
        }
      }
    }

// Validate international game constraints
if (this.constraints.internationalGames) {
  const internationalTeams = this.constraints.internationalGames.teams;
  const preferredWeeks = this.constraints.internationalGames.preferredWeeks || [4, 5, 6, 7, 8, 9, 10];
  
  // Check that international teams play in preferred weeks
  for (const game of games) {
    if (internationalTeams.includes(game.homeTeam) || internationalTeams.includes(game.awayTeam)) {
      if (!preferredWeeks.includes(game.week)) {
        errors.push(`International game ${game.homeTeam} vs ${game.awayTeam} scheduled in week ${game.week}, but international games should be in weeks ${preferredWeeks.join(', ')}`);
      }
    }
  }
  
  // Check that international teams don't have back-to-back international games
  for (const teamId of internationalTeams) {
    const teamGames = games.filter(g => g.homeTeam === teamId || g.awayTeam === teamId);
    teamGames.sort((a, b) => a.week - b.week);
    
    for (let i = 0; i < teamGames.length - 1; i++) {
      const currentGame = teamGames[i];
      const nextGame = teamGames[i + 1];
      
      if (nextGame.week === currentGame.week + 1) {
        const isCurrentInternational = internationalTeams.includes(currentGame.homeTeam) || internationalTeams.includes(currentGame.awayTeam);
        const isNextInternational = internationalTeams.includes(nextGame.homeTeam) || internationalTeams.includes(nextGame.awayTeam);
        
        if (isCurrentInternational && isNextInternational) {
          errors.push(`Team ${teamId} has back-to-back international games in weeks ${currentGame.week} and ${nextGame.week}`);
        }
      }
    }
  }
}

return {
  isValid: errors.length === 0,
  errors,
};
  }
}

// Utility function to create solver instance
export async function createNFLScheduleILP(
  teams: Team[],
  matchups: Matchup[],
  weeks: number = 18,
  constraints: ScheduleConstraints = {}
): Promise<NFLScheduleILP> {
  const glpkInstance = await initGLPK();
  return new NFLScheduleILP(glpkInstance, teams, matchups, weeks, constraints);
} 