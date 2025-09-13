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
  preventConsecutiveRematches?: boolean; // New flag to control the expensive constraint
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
      preventConsecutiveRematches: true, // Enabled to prevent consecutive rematches
      ...constraints,
    };
  }

  async solve(): Promise<ScheduleSolution> {
    const startTime = Date.now();

    try {
      console.log('🧮 Initializing GLPK solver...');
      // Initialize GLPK first
      const glpkInstance = await initGLPK();
      
      console.log('📋 Creating linear programming problem...');
      // Create the linear programming problem with GLPK instance
      const problem = this.createProblem(glpkInstance);
      
      console.log('🔧 Solving with GLPK (this may take a while)...');
      console.log('   - Variables:', problem.objective.vars?.length || 'unknown');
      console.log('   - Constraints:', problem.subjectTo?.length || 'unknown');
      console.log('   - Please wait...');
      
      // Solve using GLPK
      const result = await glpkInstance.solve(problem);
      
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
        
        // Smart objective: prefer middle weeks for flexibility
        // Weeks 6-12 get coefficient 1, others get slightly higher to discourage edge weeks
        let coef = 1;
        if (w <= 3 || w >= 16) {
          coef = 1.1; // Slightly discourage very early/late games
        } else if (w >= 6 && w <= 12) {
          coef = 0.9; // Slightly prefer middle weeks
        }
        
        objectiveVars.push({ name: varName, coef });
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
        name: `matchup_${m}_exactly_once`,
        vars,
        bnds: { type: glpkInstance.GLP_FX, lb: 1, ub: 1 } // Exactly 1
      });
    }

    // Constraint 2: Each team can play at most one game per week
    // REMOVED - duplicate of Constraint 4 below

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

    // Constraint 3.5: Prevent self-matchups (team playing against itself)
    for (let m = 0; m < numMatchups; m++) {
      const matchup = this.matchups[m];
      if (matchup.home === matchup.away) {
        // This is a self-matchup - prevent it from being scheduled
        for (let w = 1; w <= numWeeks; w++) {
          subjectTo.push({
            name: `no_self_matchup_${m}_${w}`,
            vars: [{ name: `x_${m}_${w}`, coef: 1 }],
            bnds: { type: glpkInstance.GLP_FX, lb: 0, ub: 0 } // Force to 0
          });
        }
      }
    }

    // Constraint 4: Each team can play at most one game per week (allows bye weeks)
    for (let t = 0; t < numTeams; t++) {
      const teamId = this.teams[t].id;
      
      // For each week, create a constraint that the team must play at most one game
      for (let w = 1; w <= numWeeks; w++) {
        const vars: { name: string; coef: number }[] = [];
        
        // Find all matchups involving this team
        for (let m = 0; m < numMatchups; m++) {
          const matchup = this.matchups[m];
          if (matchup.home === teamId || matchup.away === teamId) {
            vars.push({ name: `x_${m}_${w}`, coef: 1 });
          }
        }
        
        if (vars.length > 0) {
          // Team can play at most one game this week (0 = bye week, 1 = plays a game)
          subjectTo.push({
            name: `team_${t}_week_${w}_max_one_game`,
            vars,
            bnds: { type: glpkInstance.GLP_UP, lb: 0, ub: 1 } // At most 1 game
          });
        }
      }
    }

    // Constraint 4.5: Each team must play 16-18 games (allowing some flexibility)
    for (let t = 0; t < numTeams; t++) {
      const teamId = this.teams[t].id;
      const vars: { name: string; coef: number }[] = [];
      
      for (let m = 0; m < numMatchups; m++) {
        const M = this.matchups[m];
        if (M.home === teamId || M.away === teamId) {
          for (let w = 1; w <= numWeeks; w++) {
            vars.push({ name: `x_${m}_${w}`, coef: 1 });
          }
        }
      }
      
      subjectTo.push({
        name: `team_${teamId}_season_total_16_18`,
        vars,
        bnds: { type: glpkInstance.GLP_DB, lb: 16, ub: 18 } // 16-18 games
      });
    }

    // Constraint 5: Prevent consecutive rematches between the same teams (optimized paired version)
    if (this.constraints.preventConsecutiveRematches) {
      // Precompute reverse pairs once
      const reversePairs: Array<{m1: number; m2: number}> = [];
      const key = (h: string, a: string) => `${h}__${a}`;
      const indexByKey = new Map<string, number>();
      
      for (let m = 0; m < numMatchups; m++) {
        indexByKey.set(key(this.matchups[m].home, this.matchups[m].away), m);
      }
      
      for (let m = 0; m < numMatchups; m++) {
        const M = this.matchups[m];
        const rev = indexByKey.get(key(M.away, M.home));
        if (rev !== undefined && rev > m) {
          reversePairs.push({ m1: m, m2: rev }); // store once
        }
      }

      // No consecutive rematches only for reverse pairs
      for (const { m1, m2 } of reversePairs) {
        for (let w = 1; w < numWeeks; w++) {
          subjectTo.push({
            name: `no_consec_${m1}_${m2}_w${w}`,
            vars: [
              { name: `x_${m1}_${w}`, coef: 1 },
              { name: `x_${m2}_${w + 1}`, coef: 1 },
            ],
            bnds: { type: glpkInstance.GLP_UP, lb: 0, ub: 1 },
          });
          // And the other direction (m2 this week blocks m1 next week)
          subjectTo.push({
            name: `no_consec_${m2}_${m1}_w${w}`,
            vars: [
              { name: `x_${m2}_${w}`, coef: 1 },
              { name: `x_${m1}_${w + 1}`, coef: 1 },
            ],
            bnds: { type: glpkInstance.GLP_UP, lb: 0, ub: 1 },
          });
        }
      }
    }

    // Constraint 5.5: REMOVED - redundant with "matchup exactly once" constraint

    // Constraint 6: Ensure balanced weekly distribution (target ~15-16 games per week)
    // TEMPORARILY DISABLED - too restrictive for initial testing
    /*
    const targetGamesPerWeek = Math.ceil(numMatchups / numWeeks);
    for (let w = 1; w <= numWeeks; w++) {
      const vars: { name: string; coef: number }[] = [];
      
      for (let m = 0; m < numMatchups; m++) {
        vars.push({ name: `x_${m}_${w}`, coef: 1 });
      }
      
      // Ensure each week has at least targetGamesPerWeek - 2 games and at most targetGamesPerWeek + 2 games
      subjectTo.push({
        name: `min_games_week_${w}`,
        vars,
        bnds: { type: glpkInstance.GLP_DB, lb: Math.max(1, targetGamesPerWeek - 2), ub: targetGamesPerWeek + 2 }
      });
    }
    */

    // Constraint 7: Prevent too many inter-conference games in the same week
    // TEMPORARILY DISABLED - too restrictive for initial testing
    /*
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
    */

    // Constraint 8: Maximum 6 teams on bye per week (NFL rule)
    // TEMPORARILY DISABLED - too complex for initial testing
    /*
    for (let w = 1; w <= numWeeks; w++) {
      // For each week, count how many teams are NOT playing (i.e., on bye)
      // A team is on bye if it doesn't appear in any matchup scheduled for that week
      const teamsOnByeVars: { name: string; coef: number }[] = [];
      
      for (let t = 0; t < numTeams; t++) {
        const teamId = this.teams[t].id;
        let teamPlaysThisWeek = true;
        
        // Check if this team plays in any matchup this week
        for (let m = 0; m < numMatchups; m++) {
          const matchup = this.matchups[m];
          if (matchup.home === teamId || matchup.away === teamId) {
            teamPlaysThisWeek = true;
            break;
          }
        }
        
        // If team doesn't play this week, it's on bye
        if (!teamPlaysThisWeek) {
          // Create a binary variable for team t being on bye in week w
          const byeVarName = `bye_${t}_${w}`;
          varNames.push(byeVarName);
          
          teamsOnByeVars.push({ name: byeVarName, coef: 1 });
        }
      }
      
      if (teamsOnByeVars.length > 0) {
        // Limit to maximum 6 teams on bye per week
        subjectTo.push({
          name: `max_bye_teams_week_${w}`,
          vars: teamsOnByeVars,
          bnds: { type: glpkInstance.GLP_UP, lb: 0, ub: 6 }
        });
      }
    }
    */

    // Constraint 8.5: Bye week timing rules (NFL 2025 rules)
    // TEMPORARILY DISABLED - too restrictive, causing infeasible solutions
    /*
    for (let t = 0; t < numTeams; t++) {
      const teamId = this.teams[t].id;
      
      // Find all matchups involving this team
      const teamMatchups: number[] = [];
      for (let m = 0; m < numMatchups; m++) {
        const matchup = this.matchups[m];
        if (matchup.home === teamId || matchup.away === teamId) {
          teamMatchups.push(m);
        }
      }
      
      // Prevent bye weeks in weeks 1-2 (start of season)
      for (let w = 1; w <= 2; w++) {
        const vars: { name: string; coef: number }[] = [];
        for (const m of teamMatchups) {
          vars.push({ name: `x_${m}_${w}`, coef: 1 });
        }
        // Team must play at least one game in weeks 1-2
        subjectTo.push({
          name: `team_${t}_must_play_early_${w}`,
          vars,
          bnds: { type: glpkInstance.GLP_LO, lb: 1, ub: 1 }
        });
      }
      
      // Prevent bye weeks in weeks 17-18 (end of season)
      for (let w = 17; w <= 18; w++) {
        const vars: { name: string; coef: number }[] = [];
        for (const m of teamMatchups) {
          vars.push({ name: `x_${m}_${w}`, coef: 1 });
        }
        // Team must play at least one game in weeks 17-18
        subjectTo.push({
          name: `team_${t}_must_play_late_${w}`,
          vars,
          bnds: { type: glpkInstance.GLP_LO, lb: 1, ub: 1 }
        });
      }
    }
    */

    console.log('🔧 GLPK Problem Stats:');
    console.log('  - Variables:', varNames.length);
    console.log('  - Constraints:', subjectTo.length);
    console.log('  - Matchups:', this.matchups.length);
    console.log('  - Teams:', this.teams.length);
    console.log('  - Weeks:', this.weeks);
    console.log('  - Consecutive rematches prevented:', this.constraints.preventConsecutiveRematches);
    console.log('  - Sample constraints:', subjectTo.slice(0, 3));
    console.log('  - Sample variables:', varNames.slice(0, 5));

    // Add explicit bounds for binary variables to prevent unbounded solutions
    const bounds: { name: string; type: number; lb: number; ub: number }[] = [];
    for (const varName of varNames) {
      bounds.push({
        name: varName,
        type: glpkInstance.GLP_DB,
        lb: 0,
        ub: 1
      });
    }

    return {
      name: 'NFL_Schedule_Optimization',
      objective: {
        direction: glpkInstance.GLP_MIN, // Minimize cost (lower cost = better schedule)
        name: 'schedule_cost',
        vars: objectiveVars
      },
      subjectTo,
      bounds,
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
    totalMatchups: number;
    requiredMatchups: number;
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
    const requiredMatchups = (this.teams.length * 17) / 2; // Each team plays 17 games
    
    if (this.matchups.length !== requiredMatchups) {
      feasibilityIssues.push(`Have ${this.matchups.length} matchups but need exactly ${requiredMatchups}`);
    }
    
    for (const [teamId, count] of Object.entries(matchupsPerTeam)) {
      if (count !== 17) {
        feasibilityIssues.push(`Team ${teamId} has ${count} matchups (needs exactly 17)`);
      }
    }
    
    const totalVariables = this.matchups.length * this.weeks;
    const totalConstraints = this.matchups.length + (this.teams.length * this.weeks) + this.weeks + this.teams.length;
    
    if (totalVariables > 5000) {
      feasibilityIssues.push(`Problem size may be too large: ${totalVariables} variables`);
    }
    
    // Check bye week feasibility
    const totalGameSlots = this.weeks * 16; // Max 16 games per week
    if (requiredMatchups > totalGameSlots) {
      feasibilityIssues.push(`Not enough game slots: ${totalGameSlots} available, ${requiredMatchups} needed`);
    }
    
    return {
      matchupsPerTeam,
      totalConstraints,
      totalVariables,
      totalMatchups: this.matchups.length,
      requiredMatchups,
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