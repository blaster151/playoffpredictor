import initGLPK from 'glpk.js';

// Type definitions for GLPK
interface GLPKInstance {
  GLP_MIN: number;
  GLP_MAX: number;
  GLP_UP: number;
  GLP_LO: number;
  GLP_FX: number;
  GLP_FR: number;
  GLP_MSG_OFF: number;
  solve(problem: any, options?: any): any;
}

export interface ScheduledGame {
  matchup: any;
  week: number;
  homeTeam: string;
  awayTeam: string;
}

export interface ScheduleConstraints {
  maxConsecutiveAway?: number;
  maxConsecutiveHome?: number;
  maxGamesPerWeek?: number;
  byeWeekDistribution?: 'balanced' | 'early' | 'late';
  primeTimeGames?: string[];
  rivalryWeeks?: { [week: number]: string[] };
}

export interface ScheduleSolution {
  games: ScheduledGame[];
  objective: number;
  status: 'optimal' | 'infeasible' | 'unbounded' | 'error';
  solveTime: number;
  constraints: {
    totalGames: number;
    weeksUsed: number;
    teamsWithByes: number;
  };
}

export class GLPKScheduleSolver {
  private glpk: any;
  private matchups: any[];
  private teams: any[];
  private weeks: number;
  private constraints: ScheduleConstraints;

  constructor(
    glpkInstance: any,
    matchups: any[],
    teams: any[],
    weeks: number = 18,
    constraints: ScheduleConstraints = {}
  ) {
    this.glpk = glpkInstance;
    this.matchups = matchups;
    this.teams = teams;
    this.weeks = weeks;
    this.constraints = {
      maxConsecutiveAway: 3,
      maxConsecutiveHome: 3,
      maxGamesPerWeek: 16,
      byeWeekDistribution: 'balanced',
      ...constraints,
    };
  }

  solve(): ScheduleSolution {
    const startTime = Date.now();

    try {
      // Create the linear programming problem
      const problem = this.createProblem();
      
      // Solve using GLPK with synchronous API
      const result = this.glpk.solve(problem, { msgLevel: this.glpk.GLP_MSG_OFF });
      
      const solveTime = Date.now() - startTime;

      console.log('GLPK result status:', result.status);

      if (result.status === 'OPTIMAL') {
        const games = this.extractSolution(result.result);
        return {
          games,
          objective: result.result.z,
          status: 'optimal',
          solveTime,
          constraints: this.calculateConstraints(games),
        };
      } else {
        return {
          games: [],
          objective: 0,
          status: result.status as any,
          solveTime,
          constraints: { totalGames: 0, weeksUsed: 0, teamsWithByes: 0 },
        };
      }
    } catch (error) {
      console.error('GLPK solve error:', error);
      return {
        games: [],
        objective: 0,
        status: 'error',
        solveTime: Date.now() - startTime,
        constraints: { totalGames: 0, weeksUsed: 0, teamsWithByes: 0 },
      };
    }
  }

  private createProblem() {
    const numMatchups = this.matchups.length;
    const numTeams = this.teams.length;
    const numWeeks = this.weeks;

    // Create binary decision variables for every possible "matchup → week" combination
    const varNames: string[] = [];
    const objectiveVars: { name: string; coef: number }[] = [];

    for (let m = 0; m < numMatchups; m++) {
      for (let w = 1; w <= numWeeks; w++) {
        const varName = `m${m}w${w}`;
        varNames.push(varName);
        
        // Calculate objective coefficient for this variable
        const matchup = this.matchups[m];
        let cost = 1; // Base cost
        
        // Add cost for prime time games if specified
        if (this.constraints.primeTimeGames?.includes(`${matchup.home}-${matchup.away}`)) {
          cost += 10; // Encourage prime time games
        }
        
        // Add cost for rivalry weeks if specified
        if (this.constraints.rivalryWeeks?.[w]?.includes(`${matchup.home}-${matchup.away}`)) {
          cost += 5; // Encourage rivalry games in specific weeks
        }
        
        objectiveVars.push({ name: varName, coef: cost });
      }
    }

    // Constraints
    const subjectTo: any[] = [];

    // Constraint 1: Each matchup happens once
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

    // Constraint 2: Each team can play at most one game per week
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
        
        subjectTo.push({
          name: `team_${t}_week_${w}`,
          vars: teamVars,
          bnds: { type: this.glpk.GLP_UP, ub: 1, lb: 0 } // at most 1 game per week
        });
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
        bnds: { type: this.glpk.GLP_UP, ub: this.constraints.maxGamesPerWeek || 16, lb: 0 }
      });
    }

    // Constraint 4: Each team must have exactly one bye week (17 games total)
    for (let t = 0; t < numTeams; t++) {
      const teamGameVars = [];
      
      // Sum of all games for this team should equal 17 (18 weeks - 1 bye)
      for (let m = 0; m < numMatchups; m++) {
        const matchup = this.matchups[m];
        if (matchup.home === this.teams[t].id || matchup.away === this.teams[t].id) {
          for (let w = 1; w <= numWeeks; w++) {
            teamGameVars.push({ name: `m${m}w${w}`, coef: 1 });
          }
        }
      }
      
      subjectTo.push({
        name: `bye_${t}`,
        vars: teamGameVars,
        bnds: { type: this.glpk.GLP_FX, ub: 17, lb: 17 } // exactly 17 games
      });
    }

    // Constraint 5: Bye week distribution - no byes in certain weeks
    const byeWeekRestrictions = this.getByeWeekRestrictions();
    
    for (const week of byeWeekRestrictions.noByeWeeks) {
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
          bnds: { type: this.glpk.GLP_LO, ub: 0, lb: 1 } // at least 1 game
        });
      }
    }

    return {
      name: 'NFL_Schedule_Optimization',
      objective: {
        direction: this.glpk.GLP_MIN,
        name: 'total_cost',
        vars: objectiveVars
      },
      subjectTo: subjectTo,
      binaries: varNames // All variables are binary
    };
  }

  private extractSolution(result: any): ScheduledGame[] {
    const schedule: { week: number; home: string; away: string }[] = [];
    
    for (let m = 0; m < this.matchups.length; m++) {
      for (let w = 1; w <= this.weeks; w++) {
        const varName = `m${m}w${w}`;
        if (result.vars[varName] === 1) {
          schedule.push({ week: w, ...this.matchups[m] });
        }
      }
    }
    
    // Convert to ScheduledGame format and sort by week
    const games: ScheduledGame[] = schedule
      .sort((a, b) => a.week - b.week)
      .map(game => ({
        matchup: { home: game.home, away: game.away },
        week: game.week,
        homeTeam: game.home,
        awayTeam: game.away,
      }));
    
    return games;
  }

  private calculateConstraints(games: ScheduledGame[]) {
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
    
    // Count teams with byes (teams with 17 games instead of 18)
    const teamsWithByes = Object.values(teamGames).filter(count => count === 17).length;
    
    return {
      totalGames: games.length,
      weeksUsed: Object.values(gamesPerWeek).filter(count => count > 0).length,
      teamsWithByes,
    };
  }

  // Helper method to validate a solution
  validateSolution(games: ScheduledGame[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check that all matchups are scheduled
    if (games.length !== this.matchups.length) {
      errors.push(`Expected ${this.matchups.length} games, got ${games.length}`);
    }
    
    // Check that each team plays exactly 17 games
    const teamGames: { [teamId: string]: number } = {};
    for (const team of this.teams) {
      teamGames[team.id] = 0;
    }
    
    for (const game of games) {
      teamGames[game.homeTeam]++;
      teamGames[game.awayTeam]++;
    }
    
    for (const [teamId, count] of Object.entries(teamGames)) {
      if (count !== 17) {
        errors.push(`Team ${teamId} has ${count} games, expected 17`);
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
    
    // Check bye week restrictions
    const byeWeekRestrictions = this.getByeWeekRestrictions();
    for (const week of byeWeekRestrictions.noByeWeeks) {
      if (!gamesPerWeek[week] || gamesPerWeek[week] === 0) {
        errors.push(`Week ${week} has no games, but bye weeks are not allowed`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Get bye week restrictions based on NFL rules
  private getByeWeekRestrictions() {
    return {
      noByeWeeks: [1, 18], // No byes in Week 1 or Week 18
      preferredByeWeeks: [6, 7, 8, 9, 10, 11, 12, 13, 14], // Preferred bye weeks
      maxByesPerWeek: 6, // Maximum teams on bye per week
    };
  }
}

// Utility function to create a solver instance with proper async initialization
export async function createGLPKScheduleSolver(
  matchups: any[],
  teams: any[],
  weeks: number = 18,
  constraints: ScheduleConstraints = {}
): Promise<GLPKScheduleSolver> {
  const glpkInstance = await initGLPK();
  return new GLPKScheduleSolver(glpkInstance, matchups, teams, weeks, constraints);
}

// Synchronous solver creation (after GLPK is initialized)
export function createGLPKScheduleSolverSync(
  glpkInstance: any,
  matchups: any[],
  teams: any[],
  weeks: number = 18,
  constraints: ScheduleConstraints = {}
): GLPKScheduleSolver {
  return new GLPKScheduleSolver(glpkInstance, matchups, teams, weeks, constraints);
}

// Initialize GLPK instance
let glpk: any = null;

// Async initialization function
export async function initializeGLPK(): Promise<any> {
  if (!glpk) {
    glpk = await initGLPK();
  }
  return glpk;
} 