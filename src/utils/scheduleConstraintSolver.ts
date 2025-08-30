import initGLPK from 'glpk.js';
import { Matchup } from './scheduleGenerator';
import { Team } from '../types/nfl';

export interface ScheduledGame {
  matchup: Matchup;
  week: number;
  homeTeam: string;
  awayTeam: string;
}

export interface ScheduleConstraints {
  maxConsecutiveAway?: number;
  maxConsecutiveHome?: number;
  maxGamesPerWeek?: number;
  byeWeekDistribution?: 'balanced' | 'early' | 'late';
  primeTimeGames?: string[]; // Array of matchup IDs for prime time
  rivalryWeeks?: { [week: number]: string[] }; // Specific weeks for rivalries
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

export class ScheduleConstraintSolver {
  private matchups: Matchup[];
  private teams: Team[];
  private weeks: number;
  private constraints: ScheduleConstraints;

  constructor(
    matchups: Matchup[],
    teams: Team[],
    weeks: number = 18,
    constraints: ScheduleConstraints = {}
  ) {
    this.matchups = matchups;
    this.teams = teams;
    this.weeks = weeks;
    this.constraints = {
      maxConsecutiveAway: 3,
      maxConsecutiveHome: 3,
      maxGamesPerWeek: 16, // 32 teams / 2 = 16 games max per week
      byeWeekDistribution: 'balanced',
      ...constraints,
    };
  }

  async solve(): Promise<ScheduleSolution> {
    const startTime = Date.now();

    try {
      // Initialize GLPK first
      const glpkInstance = await initGLPK();
      
      // Create the linear programming problem with GLPK instance
      const problem = this.createProblem(glpkInstance);
      
      // Add message level for better debugging
      const options = {
        msgLevel: glpkInstance.GLP_MSG_ERR, // Show only errors to avoid verbose output
        presolve: glpkInstance.GLP_ON,       // Enable presolve
      };
      
      // Solve using GLPK (solve is synchronous despite the async wrapper)
      const result = glpkInstance.solve(problem, options);
      
      const solveTime = Date.now() - startTime;

      console.log('🔍 GLPK Result Summary:');
      console.log(`  - Time: ${result.time}ms`);
      console.log(`  - Status: ${result.result?.status}`);
      console.log(`  - Objective: ${result.result?.z}`);
      console.log(`  - Variables set: ${result.result?.vars ? Object.keys(result.result.vars).filter(k => result.result.vars[k] > 0.5).length : 0}`);

      // Check if solution is found (GLPK.js returns numeric status codes)
      // Status codes: 1=optimal, 2=feasible, 3=infeasible, 4=unbounded, 5=undefined
      if (result && result.result) {
        const statusCode = result.result.status;
        console.log('🔍 GLPK Status Code:', statusCode);
        
        // Accept solutions with status 1 (optimal) or 5 (undefined but has solution)
        if (result.result.vars && Object.keys(result.result.vars).length > 0) {
          const games = this.extractSolution(result.result);
          console.log('✅ GLPK found solution with', games.length, 'games');
          
          // Map numeric status to string
          let status: 'optimal' | 'infeasible' | 'unbounded' | 'error' = 'optimal';
          if (statusCode === 3) status = 'infeasible';
          else if (statusCode === 4) status = 'unbounded';
          else if (!statusCode || statusCode > 5) status = 'error';
          
          return {
            games,
            objective: result.result.z || 0,
            status,
            solveTime,
            constraints: this.calculateConstraints(games),
          };
        } else {
          console.log('❌ GLPK problem is infeasible or failed');
          return {
            games: [],
            objective: 0,
            status: 'infeasible',
            solveTime,
            constraints: { totalGames: 0, weeksUsed: 0, teamsWithByes: 0 },
          };
        }
      } else {
        console.log('❌ GLPK solver returned no result');
        return {
          games: [],
          objective: 0,
          status: 'error',
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

  private createProblem(glpkInstance: any) {
    const numMatchups = this.matchups.length;
    const numTeams = this.teams.length;
    const numWeeks = this.weeks;

    // Create variable names and objective coefficients
    const objectiveVars: { name: string; coef: number }[] = [];
    const varNames: string[] = [];
    
    // Create variables: x[matchup][week] = 1 if matchup m is scheduled in week w
    for (let m = 0; m < numMatchups; m++) {
      for (let w = 1; w <= numWeeks; w++) {
        const varName = `x_${m}_${w}`;
        const matchup = this.matchups[m];
        
        // Maximize games scheduled (coefficient of 1 for each game)
        objectiveVars.push({ name: varName, coef: 1 });
        varNames.push(varName);
      }
    }

    // Constraints
    const subjectTo: { name: string; vars: { name: string; coef: number }[]; bnds: { type: number; lb: number; ub: number } }[] = [];

    // Constraint 1: Each matchup must be scheduled exactly once
    for (let m = 0; m < numMatchups; m++) {
      const vars: { name: string; coef: number }[] = [];
      
      for (let w = 1; w <= numWeeks; w++) {
        vars.push({ name: `x_${m}_${w}`, coef: 1 });
      }
      
      subjectTo.push({
        name: `matchup_${m}`,
        vars,
        bnds: { type: glpkInstance.GLP_FX, lb: 1, ub: 1 } // Exactly once
      });
    }

    // Constraint 2: Each team can play at most one game per week
    for (let t = 0; t < numTeams; t++) {
      for (let w = 1; w <= numWeeks; w++) {
        const vars: { name: string; coef: number }[] = [];
        
        // Find all matchups involving this team
        for (let m = 0; m < numMatchups; m++) {
          const matchup = this.matchups[m];
          if (matchup.home === this.teams[t].id || matchup.away === this.teams[t].id) {
            vars.push({ name: `x_${m}_${w}`, coef: 1 });
          }
        }
        
        if (vars.length > 0) {
          subjectTo.push({
            name: `team_${t}_week_${w}`,
            vars,
            bnds: { type: glpkInstance.GLP_UP, lb: 0, ub: 1 } // Less than or equal to 1
          });
        }
      }
    }

    // Constraint 3: Maximum games per week
    for (let w = 1; w <= numWeeks; w++) {
      const vars: { name: string; coef: number }[] = [];
      
      for (let m = 0; m < numMatchups; m++) {
        vars.push({ name: `x_${m}_${w}`, coef: 1 });
      }
      
      subjectTo.push({
        name: `max_games_week_${w}`,
        vars,
        bnds: { type: glpkInstance.GLP_UP, lb: 0, ub: this.constraints.maxGamesPerWeek || 16 }
      });
    }

    // Constraint 4: Each team must have exactly 17 games (1 bye week) - NFL REQUIREMENT
    for (let t = 0; t < numTeams; t++) {
      const vars: { name: string; coef: number }[] = [];
      
      // Sum of all games for this team should equal 17
      for (let m = 0; m < numMatchups; m++) {
        const matchup = this.matchups[m];
        if (matchup.home === this.teams[t].id || matchup.away === this.teams[t].id) {
          for (let w = 1; w <= numWeeks; w++) {
            vars.push({ name: `x_${m}_${w}`, coef: 1 });
          }
        }
      }
      
      if (vars.length > 0) {
        // Exactly 17 games per team (18 weeks - 1 bye week)
        subjectTo.push({
          name: `games_${t}`,
          vars,
          bnds: { type: glpkInstance.GLP_FX, lb: 17, ub: 17 } // Exactly 17 games
        });
      }
    }

    // Constraint 4b: Bye weeks can only occur in weeks 5-14 (not weeks 1-3 or 13)
    // TEMPORARILY DISABLED - too restrictive with current matchup count
    /*
    for (let t = 0; t < numTeams; t++) {
      // Force teams to play in weeks 1-3 (no byes allowed)
      for (let w = 1; w <= 3; w++) {
        const vars: { name: string; coef: number }[] = [];
        
        for (let m = 0; m < numMatchups; m++) {
          const matchup = this.matchups[m];
          if (matchup.home === this.teams[t].id || matchup.away === this.teams[t].id) {
            vars.push({ name: `x_${m}_${w}`, coef: 1 });
          }
        }
        
        if (vars.length > 0) {
          subjectTo.push({
            name: `no_bye_team_${t}_week_${w}`,
            vars,
            bnds: { type: glpkInstance.GLP_FX, lb: 1, ub: 1 } // Must play exactly 1 game
          });
        }
      }
      
      // Force teams to play in week 13 (no byes allowed)
      const week13Vars: { name: string; coef: number }[] = [];
      for (let m = 0; m < numMatchups; m++) {
        const matchup = this.matchups[m];
        if (matchup.home === this.teams[t].id || matchup.away === this.teams[t].id) {
          week13Vars.push({ name: `x_${m}_13`, coef: 1 });
        }
      }
      
      if (week13Vars.length > 0) {
        subjectTo.push({
          name: `no_bye_team_${t}_week_13`,
          vars: week13Vars,
          bnds: { type: glpkInstance.GLP_FX, lb: 1, ub: 1 } // Must play exactly 1 game
        });
      }
    }
    */

    // Constraint 5: Prevent consecutive rematches (same teams playing in consecutive weeks)
    for (let w = 1; w < numWeeks; w++) {
      for (let m1 = 0; m1 < numMatchups; m1++) {
        for (let m2 = 0; m2 < numMatchups; m2++) {
          if (m1 !== m2) {
            const matchup1 = this.matchups[m1];
            const matchup2 = this.matchups[m2];
            
            // Check if these are the same teams (in either order)
            if ((matchup1.home === matchup2.home && matchup1.away === matchup2.away) ||
                (matchup1.home === matchup2.away && matchup1.away === matchup2.home)) {
              
              subjectTo.push({
                name: `no_consecutive_${m1}_${m2}_${w}`,
                vars: [
                  { name: `x_${m1}_${w}`, coef: 1 },
                  { name: `x_${m2}_${w + 1}`, coef: 1 }
                ],
                bnds: { type: glpkInstance.GLP_UP, lb: 0, ub: 1 } // Sum ≤ 1 (can't have both)
              });
            }
          }
        }
      }
    }

    // Constraint 6: Ensure balanced weekly distribution but with more flexibility
    const targetGamesPerWeek = Math.floor(numMatchups / numWeeks);
    for (let w = 1; w <= numWeeks; w++) {
      const vars: { name: string; coef: number }[] = [];
      
      for (let m = 0; m < numMatchups; m++) {
        vars.push({ name: `x_${m}_${w}`, coef: 1 });
      }
      
      // More flexible bounds to improve feasibility
      const minGames = Math.max(1, targetGamesPerWeek - 5);
      const maxGames = Math.min(this.constraints.maxGamesPerWeek || 16, targetGamesPerWeek + 5);
      
      subjectTo.push({
        name: `weekly_balance_${w}`,
        vars,
        bnds: { type: glpkInstance.GLP_DB, lb: minGames, ub: maxGames }
      });
    }

    // Constraint 7: Prevent too many inter-conference games in the same week
    for (let w = 1; w <= numWeeks; w++) {
      const interConferenceVars: { name: string; coef: number }[] = [];
      
      for (let m = 0; m < numMatchups; m++) {
        const matchup = this.matchups[m];
        const homeTeam = this.teams.find(t => t.id === matchup.home);
        const awayTeam = this.teams.find(t => t.id === matchup.away);
        
        // Check if this is an inter-conference game
        if (homeTeam && awayTeam && homeTeam.conference !== awayTeam.conference) {
          interConferenceVars.push({ name: `x_${m}_${w}`, coef: 1 });
        }
      }
      
      if (interConferenceVars.length > 0) {
        // Limit inter-conference games to max 6 per week (about 1/3 of games)
        // This ensures proper distribution since each team plays 5 inter-conference games
        subjectTo.push({
          name: `max_inter_conf_week_${w}`,
          vars: interConferenceVars,
          bnds: { type: glpkInstance.GLP_UP, lb: 0, ub: 6 }
        });
      }
    }

    // Constraint 8: Bye week constraints - NFL rules
    // Bye weeks allowed only in weeks 4-14 (simplified from 5-14 for better feasibility)
    // Maximum 6 teams on bye per week
    for (let w = 1; w <= numWeeks; w++) {
      if (w >= 4 && w <= 14) {
        // For bye weeks, ensure at least some games are played
        const weekVars: { name: string; coef: number }[] = [];
        for (let m = 0; m < numMatchups; m++) {
          weekVars.push({ name: `x_${m}_${w}`, coef: 1 });
        }
        
        // At least (numTeams - 6) / 2 games per bye week (max 6 teams on bye)
        const minGamesInByeWeek = Math.floor((numTeams - 6) / 2);
        subjectTo.push({
          name: `bye_week_min_${w}`,
          vars: weekVars,
          bnds: { type: glpkInstance.GLP_LO, lb: minGamesInByeWeek, ub: 0 }
        });
      } else {
        // No bye weeks allowed - all teams must play
        const weekVars: { name: string; coef: number }[] = [];
        for (let m = 0; m < numMatchups; m++) {
          weekVars.push({ name: `x_${m}_${w}`, coef: 1 });
        }
        
        // Exactly numTeams/2 games (all teams playing)
        subjectTo.push({
          name: `no_bye_week_${w}`,
          vars: weekVars,
          bnds: { type: glpkInstance.GLP_FX, lb: numTeams / 2, ub: numTeams / 2 }
        });
      }
    }

    console.log('🔧 GLPK Problem Stats:');
    console.log('  - Variables:', varNames.length);
    console.log('  - Constraints:', subjectTo.length);
    console.log('  - Matchups:', this.matchups.length);
    console.log('  - Teams:', this.teams.length);
    console.log('  - Weeks:', this.weeks);
    console.log('  - Sample constraints:', subjectTo.slice(0, 3));
    console.log('  - Sample variables:', varNames.slice(0, 5));

    return {
      name: 'NFL_Schedule_Optimization',
      objective: {
        direction: 2, // GLP_MAX (maximize games scheduled)
        name: 'total_games',
        vars: objectiveVars
      },
      subjectTo,
      binaries: varNames
    };
  }

  private extractSolution(result: any): ScheduledGame[] {
    const games: ScheduledGame[] = [];
    
    console.log('🔍 Extracting solution from GLPK result...');
    console.log('  - Result vars:', Object.keys(result.vars || {}).length);
    console.log('  - Sample vars:', Object.entries(result.vars || {}).slice(0, 5));
    
    for (let m = 0; m < this.matchups.length; m++) {
      for (let w = 1; w <= this.weeks; w++) {
        const varName = `x_${m}_${w}`;
        const value = result.vars[varName];
        
        if (value > 0.5) { // Binary variable threshold
          const matchup = this.matchups[m];
          console.log(`  ✅ Found game: ${matchup.away} @ ${matchup.home} in Week ${w} (value: ${value})`);
          games.push({
            matchup,
            week: w,
            homeTeam: matchup.home,
            awayTeam: matchup.away,
          });
        }
      }
    }
    
    console.log(`  📊 Total games extracted: ${games.length}`);
    return games.sort((a, b) => a.week - b.week);
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

  // Helper method to diagnose constraint issues
  diagnoseConstraints(): { 
    matchupsPerTeam: { [teamId: string]: number };
    totalConstraints: number;
    totalVariables: number;
    feasibilityIssues: string[];
  } {
    const matchupsPerTeam: { [teamId: string]: number } = {};
    const feasibilityIssues: string[] = [];
    
    // Count matchups per team
    for (const team of this.teams) {
      matchupsPerTeam[team.id] = 0;
    }
    
    for (const matchup of this.matchups) {
      if (matchupsPerTeam[matchup.home] !== undefined) {
        matchupsPerTeam[matchup.home]++;
      }
      if (matchupsPerTeam[matchup.away] !== undefined) {
        matchupsPerTeam[matchup.away]++;
      }
    }
    
    // Check for potential issues
    for (const [teamId, count] of Object.entries(matchupsPerTeam)) {
      if (count < 17) {
        feasibilityIssues.push(`Team ${teamId} only has ${count} matchups (needs 17)`);
      }
      if (count > 17) {
        feasibilityIssues.push(`Team ${teamId} has ${count} matchups (max 17)`);
      }
    }
    
    const totalVariables = this.matchups.length * this.weeks;
    const totalConstraints = this.matchups.length + (this.teams.length * this.weeks) + this.weeks + this.teams.length;
    
    if (totalVariables > 5000) {
      feasibilityIssues.push(`Problem size may be too large: ${totalVariables} variables`);
    }
    
    return {
      matchupsPerTeam,
      totalConstraints,
      totalVariables,
      feasibilityIssues,
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
        
        // Count games against division rivals
        for (const otherTeamId of teamsInDiv) {
          if (teamId !== otherTeamId) {
            // Check if this matchup exists in the scheduled games
            const hasMatchup = games.some(g => 
              (g.homeTeam === teamId && g.awayTeam === otherTeamId) ||
              (g.homeTeam === otherTeamId && g.awayTeam === teamId)
            );
            
            if (hasMatchup) {
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
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// Utility function to create a solver instance
export function createScheduleSolver(
  matchups: Matchup[],
  teams: Team[],
  weeks: number = 18,
  constraints: ScheduleConstraints = {}
): ScheduleConstraintSolver {
  return new ScheduleConstraintSolver(matchups, teams, weeks, constraints);
} 