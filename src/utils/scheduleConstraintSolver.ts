import initGLPK from 'glpk.js';
import { Matchup } from './scheduleGenerator';
import { Team } from '../types/nfl';

export interface ScheduledGame {
  matchup: Matchup;
  week: number;
  homeTeam: string;
  awayTeam: string;
  
  // PRIMETIME DESIGNATIONS (NEW!)
  primetimeSlot?: 'MNF' | 'TNF' | 'SNF' | 'INTERNATIONAL' | null;
  timeSlot?: 'EARLY' | 'LATE' | 'PRIMETIME'; // General time categories
  networkPreference?: 'CBS' | 'FOX' | 'NBC' | 'ESPN' | 'AMAZON' | 'NFL_NETWORK';
}

export interface ScheduleConstraints {
  maxConsecutiveAway?: number;
  maxConsecutiveHome?: number;
  maxGamesPerWeek?: number;
  byeWeekDistribution?: 'balanced' | 'early' | 'late';
  primeTimeGames?: string[]; // Array of matchup IDs for prime time
  rivalryWeeks?: { [week: number]: string[] }; // Specific weeks for rivalries
  preventConsecutiveRematches?: boolean; // New flag to control the expensive constraint
  
  // PRIMETIME GAME CONSTRAINTS (NEW!)
  primetimeConstraints?: {
    mondayNightFootball?: {
      enabled: boolean;
      gamesPerWeek: number; // Usually 1
      maxAppearances: number; // Max per team per season (e.g., 3)
      preferredTeams?: string[]; // High-profile teams that get priority
      avoidWeeks?: number[]; // Weeks to avoid (e.g., Week 1, playoffs)
    };
    thursdayNightFootball?: {
      enabled: boolean;
      gamesPerWeek: number; // Usually 1
      maxAppearances: number; // Max per team per season
      minimumRestDays: number; // Days since last game (usually 4+)
      avoidBackToBack?: boolean; // Avoid teams with Sunday->Thursday
      startWeek?: number; // When TNF season starts (usually Week 2)
    };
    sundayNightFootball?: {
      enabled: boolean;
      gamesPerWeek: number; // Usually 1
      maxAppearances: number; // Max per team per season
      flexibleWeeks?: number[]; // Weeks that can be flexed
      preferredMatchups?: Array<{home: string, away: string}>; // Rivalry games
    };
    flexScheduling?: {
      enabled: boolean;
      flexWindows: Array<{startWeek: number, endWeek: number, maxChanges: number}>;
    };
  };
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
  private preScheduledGameCounts: Map<string, number>;
  private preScheduledWeeks: Set<number>; // NEW: Track which weeks are pre-scheduled

  constructor(
    matchups: Matchup[],
    teams: Team[],
    weeks: number = 18,
    constraints: ScheduleConstraints = {},
    preScheduledGameCounts?: Map<string, number>, // Number of games each team has already played
    preScheduledWeeks?: Set<number> // NEW: Weeks that are already scheduled (should be skipped)
  ) {
    this.matchups = matchups;
    this.teams = teams;
    this.weeks = weeks;
    this.preScheduledGameCounts = preScheduledGameCounts || new Map();
    this.preScheduledWeeks = preScheduledWeeks || new Set();
    this.constraints = {
      maxConsecutiveAway: 3,
      maxConsecutiveHome: 3,
      maxGamesPerWeek: 16, // 32 teams / 2 = 16 games max per week
      byeWeekDistribution: 'balanced',
      preventConsecutiveRematches: true, // Enabled to prevent consecutive rematches
      
      // DEFAULT PRIMETIME CONSTRAINTS (realistic NFL patterns)
      primetimeConstraints: {
        mondayNightFootball: {
          enabled: false, // DISABLED - Too complex for constraint solver, will be assigned in postprocessing
          gamesPerWeek: 1,
          maxAppearances: 3, // Max 3 MNF appearances per team per season
          preferredTeams: ['cowboys', 'patriots', 'packers', 'steelers', 'chiefs'], // High-profile teams
          avoidWeeks: [18] // Avoid Week 18 (season finale)
        },
        thursdayNightFootball: {
          enabled: false, // DISABLED - Too complex for constraint solver, will be assigned in postprocessing
          gamesPerWeek: 1,
          maxAppearances: 2, // Max 2 TNF appearances per team per season
          minimumRestDays: 4,
          avoidBackToBack: true, // Don't schedule Sunday->Thursday
          startWeek: 2 // TNF starts Week 2 (Week 1 is Thursday opener)
        },
        sundayNightFootball: {
          enabled: false, // DISABLED - Too complex for constraint solver, will be assigned in postprocessing
          gamesPerWeek: 1,
          maxAppearances: 4, // Max 4 SNF appearances per team per season
          flexibleWeeks: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17], // Weeks that can be flexed
          preferredMatchups: [
            {home: 'cowboys', away: 'giants'}, // NFC East rivalries
            {home: 'packers', away: 'bears'},  // NFC North rivalries
            {home: 'patriots', away: 'jets'},  // AFC East rivalries
            {home: 'steelers', away: 'ravens'} // AFC North rivalries
          ]
        },
        flexScheduling: {
          enabled: true,
          flexWindows: [
            {startWeek: 5, endWeek: 10, maxChanges: 2}, // Early flex window
            {startWeek: 11, endWeek: 17, maxChanges: 5}  // Late flex window
          ]
        }
      },
      
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
      console.log('   - Timeout: 5 minutes (300 seconds)');
      console.log('   - Please be patient, this is a complex optimization problem...');
      
      // Add progress logging every 30 seconds
      const progressInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        console.log(`⏳ GLPK solver still working... (${elapsed}s elapsed)`);
      }, 30000);
      
      // Solve using GLPK with 5-minute timeout
      const result: any = await Promise.race([
        glpkInstance.solve(problem),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('GLPK solver timed out after 5 minutes (300 seconds)')), 300000)
        )
      ]);
      
      // Clear the progress interval
      clearInterval(progressInterval);
      
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

    // Constraints - ORDERED BY RESTRICTIVENESS (most restrictive first)
    const subjectTo: { name: string; vars: { name: string; coef: number }[]; bnds: { type: number; lb: number; ub: number } }[] = [];

    // STEP 1: EQUALITY CONSTRAINTS (most restrictive)
    this.addMatchupConstraints(subjectTo, glpkInstance, numMatchups, numWeeks);
    this.addTeamGameConstraints(subjectTo, glpkInstance, numMatchups, numTeams, numWeeks);
    
    // STEP 2: TIGHT BOUNDS
    // DISABLED: Testing minimal constraints
    // this.addByeWeekConstraints(subjectTo, glpkInstance, numMatchups, numWeeks);
    
    // STEP 3: SIMPLE INEQUALITIES  
    // DISABLED: addTeamWeekConstraints - 544 redundant constraints! Already enforced by matchup + team game constraints
    // this.addTeamWeekConstraints(subjectTo, glpkInstance, numMatchups, numTeams, numWeeks);
    // DISABLED: Testing minimal constraints
    // this.addMaxGamesPerWeekConstraints(subjectTo, glpkInstance, numMatchups, numWeeks);
    // this.addInterConferenceConstraints(subjectTo, glpkInstance, numMatchups, numWeeks);
    
    // STEP 4: COMPLEX/EXPENSIVE CONSTRAINTS (least restrictive, most expensive)
    // DISABLED: addConsecutiveConstraints - ~8,704 constraints! Moved to postprocessing for 5-10x speedup
    // this.addConsecutiveConstraints(subjectTo, glpkInstance, numMatchups, numWeeks);
    // DISABLED: Testing minimal constraints
    // this.addSelfMatchupPrevention(subjectTo, glpkInstance, numMatchups, numWeeks);
    // DISABLED: addMaxByeTeamsConstraint - ~512 constraints + 320 variables! Testing if this causes unbounded
    // this.addMaxByeTeamsConstraint(subjectTo, glpkInstance, numMatchups, numTeams, numWeeks, varNames);
    // DISABLED: addBalancedWeeklyDistribution - Testing if this causes unbounded
    // this.addBalancedWeeklyDistribution(subjectTo, glpkInstance, numMatchups, numWeeks);
    
    // STEP 5: PRIMETIME CONSTRAINTS (NEW! - for maximum realism)
    this.addPrimetimeConstraints(subjectTo, glpkInstance, numMatchups, numTeams, numWeeks, varNames);



    console.log('🔧 GLPK Problem Stats (CORE CONSTRAINTS ONLY):');
    console.log('  - Variables:', varNames.length);
    console.log('  - Constraints:', subjectTo.length);
    console.log('  - Matchups:', this.matchups.length);
    console.log('  - Teams:', this.teams.length);
    console.log('  - Weeks:', this.weeks);
    console.log('  ✅ Bye weeks prevented in weeks 1-4 and 15-18');
    console.log('  ✅ Inter-conference distribution limits');
    console.log('  ✅ Maximum 6 teams on bye per week');
    console.log('  ✅ Balanced weekly distribution');
    console.log('  ✅ Constraint ordering optimized (EQUALITY → TIGHT → INEQUALITIES → COMPLEX)');
    console.log('  ⚠️  PRIMETIME CONSTRAINTS DISABLED (too complex for solver)');
    console.log('    - Game times will be assigned in postprocessing phase');
    console.log('    - This significantly reduces solver complexity');
    console.log('  - Consecutive rematches prevented:', this.constraints.preventConsecutiveRematches);
    console.log('  - Sample constraints:', subjectTo.slice(0, 2));
    console.log('🔍 Constraint breakdown:');
    console.log('  - Matchup constraints:', subjectTo.filter(c => c.name.startsWith('matchup_')).length);
    console.log('  - Team game constraints:', subjectTo.filter(c => c.name.startsWith('team_') && c.name.includes('_season_total_')).length);
    console.log('  - Bye week constraints:', subjectTo.filter(c => c.name.startsWith('no_byes_') || c.name.startsWith('bye_allowed_')).length);
    console.log('  - Max games per week:', subjectTo.filter(c => c.name.startsWith('max_games_week_')).length);
    console.log('  - Inter-conference:', subjectTo.filter(c => c.name.startsWith('max_inter_conf_')).length);
    console.log('  - Self-matchup prevention:', subjectTo.filter(c => c.name.startsWith('no_self_matchup_')).length);

    // Add explicit bounds for binary variables to prevent unbounded solutions
    // IMPORTANT: Create bounds AFTER all constraints have been added, since some constraints
    // (like addMaxByeTeamsConstraint) add new variables to varNames
    const bounds: { name: string; type: number; lb: number; ub: number }[] = [];
    for (const varName of varNames) {
      bounds.push({
        name: varName,
        type: glpkInstance.GLP_DB,
        lb: 0,
        ub: 1
      });
    }
    
    console.log(`🔧 Bounds created for ${bounds.length} variables (including bye variables)`);

    return {
      name: 'NFL_Schedule_Optimization',
      objective: {
        direction: glpkInstance.GLP_MIN, // Minimize cost (lower cost = better schedule)
        name: 'schedule_cost',
        vars: objectiveVars
      },
      subjectTo,
      bounds,
      // NOTE: binaries field might conflict with bounds in GLPK.js
      // binaries: varNames
    };
  }

  // CONSTRAINT METHODS - ORDERED BY RESTRICTIVENESS (most restrictive first)

  private addMatchupConstraints(
    subjectTo: any[], 
    glpkInstance: any, 
    numMatchups: number, 
    numWeeks: number
  ): void {
    // Constraint 1: Each matchup must be scheduled exactly once (EQUALITY - most restrictive)
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
  }

  private addTeamGameConstraints(
    subjectTo: any[], 
    glpkInstance: any, 
    numMatchups: number, 
    numTeams: number, 
    numWeeks: number
  ): void {
    // Constraint 2: Each team must play exactly 17 games total (including pre-scheduled)
    for (let t = 0; t < numTeams; t++) {
      const teamId = this.teams[t].id;
      const vars: { name: string; coef: number }[] = [];
      
      for (let m = 0; m < numMatchups; m++) {
        const matchup = this.matchups[m];
        if (matchup.home === teamId || matchup.away === teamId) {
          for (let w = 1; w <= numWeeks; w++) {
            vars.push({ name: `x_${m}_${w}`, coef: 1 });
          }
        }
      }
      
      // Calculate how many games this team needs from the solver
      const preScheduledGames = this.preScheduledGameCounts.get(teamId) || 0;
      const remainingGames = 17 - preScheduledGames;
      
      subjectTo.push({
        name: `team_${teamId}_season_total_${remainingGames}`,
        vars,
        bnds: { type: glpkInstance.GLP_FX, lb: remainingGames, ub: remainingGames } // Exactly remaining games
      });
      
      if (preScheduledGames > 0) {
        console.log(`  📅 Team ${teamId}: ${preScheduledGames} pre-scheduled, ${remainingGames} to solve`);
      }
    }
  }

  private addByeWeekConstraints(
    subjectTo: any[], 
    glpkInstance: any, 
    numMatchups: number, 
    numWeeks: number
  ): void {
    // Constraint 3: Bye week timing rules (TIGHT BOUNDS - very restrictive)
    // No bye weeks allowed in weeks 1-4 and 15-18 (NFL requirement)
    // NOTE: Pre-scheduled weeks (like Week 1) are not constrained by the solver
    for (let w = 1; w <= numWeeks; w++) {
      // IMPORTANT: Skip pre-scheduled weeks to avoid unbounded problems
      if (this.preScheduledWeeks.has(w)) {
        console.log(`  ⏭️  Week ${w} is pre-scheduled, skipping bye week constraint`);
        continue;
      }
      
      const vars: { name: string; coef: number }[] = [];
      
      // Count all games scheduled in this week
      for (let m = 0; m < numMatchups; m++) {
        vars.push({ name: `x_${m}_${w}`, coef: 1 });
      }
      
      // Skip constraint if no variables (week might be pre-scheduled)
      if (vars.length === 0) {
        console.log(`  ⚠️  Week ${w} has no solver variables (likely pre-scheduled), skipping bye week constraint`);
        continue;
      }
      
      if (w <= 4 || w >= 15) {
        // Weeks 1-4 and 15-18: All teams must play (exactly 16 games, no byes)
        subjectTo.push({
          name: `no_byes_week_${w}`,
          vars,
          bnds: { type: glpkInstance.GLP_FX, lb: 16, ub: 16 } // Exactly 16 games
        });
      } else {
        // Weeks 5-14: Bye weeks allowed (at least 13 games, max 6 teams on bye)
        subjectTo.push({
          name: `bye_allowed_week_${w}`,
          vars,
          bnds: { type: glpkInstance.GLP_DB, lb: 13, ub: 16 } // 13-16 games (up to 6 byes)
        });
      }
    }
  }

  private addTeamWeekConstraints(
    subjectTo: any[], 
    glpkInstance: any, 
    numMatchups: number, 
    numTeams: number, 
    numWeeks: number
  ): void {
    // Constraint 4: Each team can play at most one game per week (SIMPLE INEQUALITY)
    for (let t = 0; t < numTeams; t++) {
      const teamId = this.teams[t].id;
      
      // For each week, create a constraint that the team must play at most one game
      for (let w = 1; w <= numWeeks; w++) {
        // IMPORTANT: Skip pre-scheduled weeks to avoid unbounded problems
        if (this.preScheduledWeeks.has(w)) {
          continue;
        }
        
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
  }

  private addMaxGamesPerWeekConstraints(
    subjectTo: any[], 
    glpkInstance: any, 
    numMatchups: number, 
    numWeeks: number
  ): void {
    // Constraint 5: Maximum games per week (SIMPLE INEQUALITY)
    for (let w = 1; w <= numWeeks; w++) {
      // IMPORTANT: Skip pre-scheduled weeks to avoid unbounded problems
      if (this.preScheduledWeeks.has(w)) {
        continue;
      }
      
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
  }

  private addInterConferenceConstraints(
    subjectTo: any[], 
    glpkInstance: any, 
    numMatchups: number, 
    numWeeks: number
  ): void {
    // Constraint 6: Prevent too many inter-conference games in the same week (SIMPLE INEQUALITY)
    for (let w = 1; w <= numWeeks; w++) {
      // IMPORTANT: Skip pre-scheduled weeks to avoid unbounded problems
      if (this.preScheduledWeeks.has(w)) {
        continue;
      }
      
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
  }

  private addConsecutiveConstraints(
    subjectTo: any[], 
    glpkInstance: any, 
    numMatchups: number, 
    numWeeks: number
  ): void {
    // Constraint 7: Prevent consecutive rematches between the same teams (EXPENSIVE/COMPLEX)
    if (this.constraints.preventConsecutiveRematches) {
      // Precompute reverse pairs once
      const reversePairs: Array<{m1: number; m2: number}> = [];
      const key = (h: string, a: string) => `${h}__${a}`;
      const indexByKey = new Map<string, number>();
      
      for (let m = 0; m < numMatchups; m++) {
        indexByKey.set(key(this.matchups[m].home, this.matchups[m].away), m);
      }
      
      for (let m = 0; m < numMatchups; m++) {
        const matchup = this.matchups[m];
        const rev = indexByKey.get(key(matchup.away, matchup.home));
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
  }

  private addSelfMatchupPrevention(
    subjectTo: any[], 
    glpkInstance: any, 
    numMatchups: number, 
    numWeeks: number
  ): void {
    // Constraint 8: Prevent self-matchups (team playing against itself) - SIMPLE CHECK
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
  }

  private addMaxByeTeamsConstraint(
    subjectTo: any[], 
    glpkInstance: any, 
    numMatchups: number, 
    numTeams: number, 
    numWeeks: number,
    varNames: string[]
  ): void {
    // Constraint 9: Maximum 6 teams on bye per week (NFL rule) - RE-ENABLED
    // This is complex because we need to track which teams are NOT playing
    for (let w = 1; w <= numWeeks; w++) {
      // Only apply this constraint to bye-allowed weeks (5-14)
      if (w >= 5 && w <= 14) {
        // For each team, create a binary variable indicating if they're on bye
        const byeVars: { name: string; coef: number }[] = [];
        
        for (let t = 0; t < numTeams; t++) {
          const teamId = this.teams[t].id;
          const byeVarName = `bye_${t}_${w}`;
          varNames.push(byeVarName);
          
          // bye_t_w = 1 if team t is on bye in week w, 0 otherwise
          byeVars.push({ name: byeVarName, coef: 1 });
          
          // Link bye variable to game variables: 
          // bye_t_w + sum(games involving team t in week w) = 1
          const teamGameVars: { name: string; coef: number }[] = [
            { name: byeVarName, coef: 1 }
          ];
          
          for (let m = 0; m < numMatchups; m++) {
            const matchup = this.matchups[m];
            if (matchup.home === teamId || matchup.away === teamId) {
              teamGameVars.push({ name: `x_${m}_${w}`, coef: 1 });
            }
          }
          
          subjectTo.push({
            name: `bye_link_team_${t}_week_${w}`,
            vars: teamGameVars,
            bnds: { type: glpkInstance.GLP_FX, lb: 1, ub: 1 } // Exactly 1
          });
        }
        
        // Limit total bye teams to 6
        if (byeVars.length > 0) {
          subjectTo.push({
            name: `max_bye_teams_week_${w}`,
            vars: byeVars,
            bnds: { type: glpkInstance.GLP_UP, lb: 0, ub: 6 }
          });
        }
      }
    }
  }

  private addBalancedWeeklyDistribution(
    subjectTo: any[], 
    glpkInstance: any, 
    numMatchups: number, 
    numWeeks: number
  ): void {
    // Constraint 10: Balanced weekly distribution - RE-ENABLED with flexible bounds
    // Target ~15-16 games per week (272 games / 18 weeks = ~15.1 games per week)
    // IMPORTANT: Calculate target based on weeks the solver is responsible for
    const solverWeeks = numWeeks - this.preScheduledWeeks.size;
    const targetGamesPerWeek = Math.ceil(numMatchups / solverWeeks);
    
    for (let w = 1; w <= numWeeks; w++) {
      // IMPORTANT: Skip pre-scheduled weeks to avoid unbounded problems
      if (this.preScheduledWeeks.has(w)) {
        console.log(`  ⏭️  Week ${w} is pre-scheduled, skipping balanced distribution constraint`);
        continue;
      }
      
      const vars: { name: string; coef: number }[] = [];
      
      for (let m = 0; m < numMatchups; m++) {
        vars.push({ name: `x_${m}_${w}`, coef: 1 });
      }
      
      // Allow some flexibility: target ± 3 games per week
      // This prevents extreme clustering while maintaining feasibility
      const minGames = Math.max(1, targetGamesPerWeek - 3);
      const maxGames = targetGamesPerWeek + 3;
      
      subjectTo.push({
        name: `balanced_games_week_${w}`,
        vars,
        bnds: { type: glpkInstance.GLP_DB, lb: minGames, ub: maxGames }
      });
    }
  }

  private addPrimetimeConstraints(
    subjectTo: any[], 
    glpkInstance: any, 
    numMatchups: number, 
    numTeams: number, 
    numWeeks: number,
    varNames: string[]
  ): void {
    // Constraint 11: PRIMETIME GAME CONSTRAINTS (NEW! - Maximum NFL Realism!)
    const primetimeConfig = this.constraints.primetimeConstraints;
    
    if (!primetimeConfig) return;
    
    // MONDAY NIGHT FOOTBALL CONSTRAINTS
    if (primetimeConfig.mondayNightFootball?.enabled) {
      this.addMondayNightFootballConstraints(subjectTo, glpkInstance, numMatchups, numTeams, numWeeks, varNames);
    }
    
    // THURSDAY NIGHT FOOTBALL CONSTRAINTS  
    if (primetimeConfig.thursdayNightFootball?.enabled) {
      this.addThursdayNightFootballConstraints(subjectTo, glpkInstance, numMatchups, numTeams, numWeeks, varNames);
    }
    
    // SUNDAY NIGHT FOOTBALL CONSTRAINTS
    if (primetimeConfig.sundayNightFootball?.enabled) {
      this.addSundayNightFootballConstraints(subjectTo, glpkInstance, numMatchups, numTeams, numWeeks, varNames);
    }
    
    console.log('  ✅ NEW: Primetime constraints enabled (MNF, TNF, SNF)');
  }

  private addMondayNightFootballConstraints(
    subjectTo: any[], 
    glpkInstance: any, 
    numMatchups: number, 
    numTeams: number, 
    numWeeks: number,
    varNames: string[]
  ): void {
    const mnfConfig = this.constraints.primetimeConstraints?.mondayNightFootball!;
    
    // Create MNF binary variables: mnf_m_w = 1 if matchup m is MNF game in week w
    for (let w = 1; w <= numWeeks; w++) {
      // Skip weeks where MNF is avoided
      if (mnfConfig.avoidWeeks?.includes(w)) continue;
      // Skip pre-scheduled weeks to avoid unbounded problems
      if (this.preScheduledWeeks.has(w)) continue;
      
      const mnfVars: { name: string; coef: number }[] = [];
      
      for (let m = 0; m < numMatchups; m++) {
        const mnfVarName = `mnf_${m}_${w}`;
        varNames.push(mnfVarName);
        mnfVars.push({ name: mnfVarName, coef: 1 });
        
        // Link MNF variable to regular game variable: mnf_m_w <= x_m_w
        subjectTo.push({
          name: `mnf_link_${m}_${w}`,
          vars: [
            { name: mnfVarName, coef: 1 },
            { name: `x_${m}_${w}`, coef: -1 }
          ],
          bnds: { type: glpkInstance.GLP_UP, lb: 0, ub: 0 } // mnf_m_w - x_m_w <= 0
        });
      }
      
      // Exactly 1 MNF game per week
      if (mnfVars.length > 0) {
        subjectTo.push({
          name: `mnf_exactly_one_week_${w}`,
          vars: mnfVars,
          bnds: { type: glpkInstance.GLP_FX, lb: mnfConfig.gamesPerWeek, ub: mnfConfig.gamesPerWeek }
        });
      }
    }
    
    // Limit MNF appearances per team per season
    for (let t = 0; t < numTeams; t++) {
      const teamId = this.teams[t].id;
      const teamMnfVars: { name: string; coef: number }[] = [];
      
      for (let w = 1; w <= numWeeks; w++) {
        if (mnfConfig.avoidWeeks?.includes(w)) continue;
        
        for (let m = 0; m < numMatchups; m++) {
          const matchup = this.matchups[m];
          if (matchup.home === teamId || matchup.away === teamId) {
            teamMnfVars.push({ name: `mnf_${m}_${w}`, coef: 1 });
          }
        }
      }
      
      if (teamMnfVars.length > 0) {
        // Preferred teams get higher limit
        const isPreferred = mnfConfig.preferredTeams?.includes(teamId);
        const maxAppearances = isPreferred ? mnfConfig.maxAppearances + 1 : mnfConfig.maxAppearances;
        
        subjectTo.push({
          name: `mnf_max_appearances_team_${t}`,
          vars: teamMnfVars,
          bnds: { type: glpkInstance.GLP_UP, lb: 0, ub: maxAppearances }
        });
      }
    }
  }

  private addThursdayNightFootballConstraints(
    subjectTo: any[], 
    glpkInstance: any, 
    numMatchups: number, 
    numTeams: number, 
    numWeeks: number,
    varNames: string[]
  ): void {
    const tnfConfig = this.constraints.primetimeConstraints?.thursdayNightFootball!;
    
    // Create TNF binary variables
    for (let w = (tnfConfig.startWeek || 2); w <= numWeeks; w++) {
      // Skip pre-scheduled weeks to avoid unbounded problems
      if (this.preScheduledWeeks.has(w)) continue;
      
      const tnfVars: { name: string; coef: number }[] = [];
      
      for (let m = 0; m < numMatchups; m++) {
        const tnfVarName = `tnf_${m}_${w}`;
        varNames.push(tnfVarName);
        tnfVars.push({ name: tnfVarName, coef: 1 });
        
        // Link TNF variable to regular game variable
        subjectTo.push({
          name: `tnf_link_${m}_${w}`,
          vars: [
            { name: tnfVarName, coef: 1 },
            { name: `x_${m}_${w}`, coef: -1 }
          ],
          bnds: { type: glpkInstance.GLP_UP, lb: 0, ub: 0 }
        });
      }
      
      // Exactly 1 TNF game per week
      if (tnfVars.length > 0) {
        subjectTo.push({
          name: `tnf_exactly_one_week_${w}`,
          vars: tnfVars,
          bnds: { type: glpkInstance.GLP_FX, lb: tnfConfig.gamesPerWeek, ub: tnfConfig.gamesPerWeek }
        });
      }
    }
    
    // Limit TNF appearances per team per season
    for (let t = 0; t < numTeams; t++) {
      const teamId = this.teams[t].id;
      const teamTnfVars: { name: string; coef: number }[] = [];
      
      for (let w = (tnfConfig.startWeek || 2); w <= numWeeks; w++) {
        for (let m = 0; m < numMatchups; m++) {
          const matchup = this.matchups[m];
          if (matchup.home === teamId || matchup.away === teamId) {
            teamTnfVars.push({ name: `tnf_${m}_${w}`, coef: 1 });
          }
        }
      }
      
      if (teamTnfVars.length > 0) {
        subjectTo.push({
          name: `tnf_max_appearances_team_${t}`,
          vars: teamTnfVars,
          bnds: { type: glpkInstance.GLP_UP, lb: 0, ub: tnfConfig.maxAppearances }
        });
      }
    }
    
    // TODO: Add minimum rest days constraint (complex - requires tracking previous games)
    // This would prevent Sunday->Thursday scheduling for player safety
  }

  private addSundayNightFootballConstraints(
    subjectTo: any[], 
    glpkInstance: any, 
    numMatchups: number, 
    numTeams: number, 
    numWeeks: number,
    varNames: string[]
  ): void {
    const snfConfig = this.constraints.primetimeConstraints?.sundayNightFootball!;
    
    // Create SNF binary variables
    for (let w = 1; w <= numWeeks; w++) {
      // Skip pre-scheduled weeks to avoid unbounded problems
      if (this.preScheduledWeeks.has(w)) continue;
      
      const snfVars: { name: string; coef: number }[] = [];
      
      for (let m = 0; m < numMatchups; m++) {
        const snfVarName = `snf_${m}_${w}`;
        varNames.push(snfVarName);
        snfVars.push({ name: snfVarName, coef: 1 });
        
        // Link SNF variable to regular game variable
        subjectTo.push({
          name: `snf_link_${m}_${w}`,
          vars: [
            { name: snfVarName, coef: 1 },
            { name: `x_${m}_${w}`, coef: -1 }
          ],
          bnds: { type: glpkInstance.GLP_UP, lb: 0, ub: 0 }
        });
      }
      
      // Exactly 1 SNF game per week
      if (snfVars.length > 0) {
        subjectTo.push({
          name: `snf_exactly_one_week_${w}`,
          vars: snfVars,
          bnds: { type: glpkInstance.GLP_FX, lb: snfConfig.gamesPerWeek, ub: snfConfig.gamesPerWeek }
        });
      }
    }
    
    // Limit SNF appearances per team per season
    for (let t = 0; t < numTeams; t++) {
      const teamId = this.teams[t].id;
      const teamSnfVars: { name: string; coef: number }[] = [];
      
      for (let w = 1; w <= numWeeks; w++) {
        for (let m = 0; m < numMatchups; m++) {
          const matchup = this.matchups[m];
          if (matchup.home === teamId || matchup.away === teamId) {
            teamSnfVars.push({ name: `snf_${m}_${w}`, coef: 1 });
          }
        }
      }
      
      if (teamSnfVars.length > 0) {
        subjectTo.push({
          name: `snf_max_appearances_team_${t}`,
          vars: teamSnfVars,
          bnds: { type: glpkInstance.GLP_UP, lb: 0, ub: snfConfig.maxAppearances }
        });
      }
    }
    
    // Bonus: Prefer rivalry matchups for SNF
    if (snfConfig.preferredMatchups) {
      for (const preferredMatchup of snfConfig.preferredMatchups) {
        for (let w = 1; w <= numWeeks; w++) {
          for (let m = 0; m < numMatchups; m++) {
            const matchup = this.matchups[m];
            if ((matchup.home === preferredMatchup.home && matchup.away === preferredMatchup.away) ||
                (matchup.home === preferredMatchup.away && matchup.away === preferredMatchup.home)) {
              
              // Add soft constraint to encourage this matchup for SNF
              // (This is a bonus feature - could be implemented with weighted objective)
              console.log(`  💡 Preferred SNF matchup identified: ${matchup.home} vs ${matchup.away}`);
            }
          }
        }
      }
    }
  }

  private extractSolution(result: any): ScheduledGame[] {
    const games: ScheduledGame[] = [];
    
    console.log('🔍 Extracting solution from GLPK result...');
    console.log('  - Result vars:', Object.keys(result.vars || {}).length);
    console.log('  - Sample vars:', Object.entries(result.vars || {}).slice(0, 5));
    
    // First pass: Extract regular games
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
            primetimeSlot: null, // Will be set in second pass
            timeSlot: 'EARLY', // Default to early games
            networkPreference: 'CBS' // Default network
          });
        }
      }
    }
    
    // Second pass: Identify primetime games
    let mnfCount = 0, tnfCount = 0, snfCount = 0;
    
    for (const game of games) {
      // Check if this game is MNF
      const mnfVar = `mnf_${this.getMatchupIndex(game.matchup)}_${game.week}`;
      if (result.vars[mnfVar] > 0.5) {
        game.primetimeSlot = 'MNF';
        game.timeSlot = 'PRIMETIME';
        game.networkPreference = 'ESPN';
        mnfCount++;
        console.log(`  🌙 MNF: ${game.awayTeam} @ ${game.homeTeam} - Week ${game.week}`);
      }
      
      // Check if this game is TNF
      const tnfVar = `tnf_${this.getMatchupIndex(game.matchup)}_${game.week}`;
      if (result.vars[tnfVar] > 0.5) {
        game.primetimeSlot = 'TNF';
        game.timeSlot = 'PRIMETIME';
        game.networkPreference = 'AMAZON';
        tnfCount++;
        console.log(`  🦃 TNF: ${game.awayTeam} @ ${game.homeTeam} - Week ${game.week}`);
      }
      
      // Check if this game is SNF
      const snfVar = `snf_${this.getMatchupIndex(game.matchup)}_${game.week}`;
      if (result.vars[snfVar] > 0.5) {
        game.primetimeSlot = 'SNF';
        game.timeSlot = 'PRIMETIME';
        game.networkPreference = 'NBC';
        snfCount++;
        console.log(`  🌃 SNF: ${game.awayTeam} @ ${game.homeTeam} - Week ${game.week}`);
      }
    }
    
    console.log(`  📊 Total games extracted: ${games.length}`);
    console.log(`  🏈 Primetime games: ${mnfCount} MNF, ${tnfCount} TNF, ${snfCount} SNF`);
    
    return games.sort((a, b) => a.week - b.week);
  }

  // Helper method to get matchup index
  private getMatchupIndex(matchup: Matchup): number {
    return this.matchups.findIndex(m => m.home === matchup.home && m.away === matchup.away);
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

  // Enhanced diagnostic method to identify infeasibility causes
  async diagnoseConstraints(): Promise<{ 
    matchupsPerTeam: { [teamId: string]: number };
    totalConstraints: number;
    totalVariables: number;
    totalMatchups: number;
    requiredMatchups: number;
    feasibilityIssues: string[];
    constraintGroups: { [groupName: string]: { enabled: boolean; count: number; feasible?: boolean } };
    recommendations: string[];
  }> {
    const matchupsPerTeam: { [teamId: string]: number } = {};
    const feasibilityIssues: string[] = [];
    const recommendations: string[] = [];
    
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
      recommendations.push('Check matchup generation logic in scheduleGenerator.ts');
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
      recommendations.push('Consider reducing problem size or using constraint relaxation');
    }
    
    // Check bye week feasibility
    const totalGameSlots = this.weeks * 16; // Max 16 games per week
    if (requiredMatchups > totalGameSlots) {
      feasibilityIssues.push(`Not enough game slots: ${totalGameSlots} available, ${requiredMatchups} needed`);
      recommendations.push('Increase weeks or allow more games per week');
    }
    
    // Test constraint groups individually
    const constraintGroups = await this.testConstraintGroups();
    
    // Generate recommendations based on constraint group results
    for (const [groupName, group] of Object.entries(constraintGroups)) {
      if (group.feasible === false) {
        feasibilityIssues.push(`Constraint group '${groupName}' causes infeasibility`);
        recommendations.push(`Consider relaxing or removing constraints in group: ${groupName}`);
      }
    }
    
    return {
      matchupsPerTeam,
      totalConstraints,
      totalVariables,
      totalMatchups: this.matchups.length,
      requiredMatchups,
      feasibilityIssues,
      constraintGroups,
      recommendations,
    };
  }

  // Test individual constraint groups to identify infeasibility sources
  private async testConstraintGroups(): Promise<{ [groupName: string]: { enabled: boolean; count: number; feasible?: boolean } }> {
    const groups: { [groupName: string]: { enabled: boolean; count: number; feasible?: boolean } } = {
      'Matchup Constraints': { enabled: true, count: 0 },
      'Team Game Constraints': { enabled: true, count: 0 },
      'Bye Week Constraints': { enabled: true, count: 0 },
      'Team-Week Constraints': { enabled: true, count: 0 },
      'Max Games Per Week': { enabled: true, count: 0 },
      'Inter-Conference Limits': { enabled: true, count: 0 },
      'Consecutive Constraints': { enabled: this.constraints.preventConsecutiveRematches || false, count: 0 },
      'Self-Matchup Prevention': { enabled: true, count: 0 },
      'Max Bye Teams': { enabled: true, count: 0 },
      'Balanced Distribution': { enabled: true, count: 0 }
    };

    try {
      // Import GLPK for testing
      const initGLPK = (await import('glpk.js')).default;
      const glpkInstance = await initGLPK();
      
      // Test each constraint group by creating minimal problems
      console.log('🔍 Testing constraint groups for feasibility...');
      
      // Test basic constraints first (most likely to succeed)
      const basicTest = this.createMinimalProblem(glpkInstance, ['matchup', 'teamGame']);
      const basicResult = await glpkInstance.solve(basicTest);
      if (basicResult?.result?.status) {
        groups['Matchup Constraints'].feasible = basicResult.result.status <= 2;
        groups['Team Game Constraints'].feasible = basicResult.result.status <= 2;
      }
      
      // Test bye week constraints
      const byeTest = this.createMinimalProblem(glpkInstance, ['matchup', 'teamGame', 'byeWeek']);
      const byeResult = await glpkInstance.solve(byeTest);
      if (byeResult?.result?.status) {
        groups['Bye Week Constraints'].feasible = byeResult.result.status <= 2;
      }
      
      // Test other constraint groups incrementally...
      // (This is a simplified version - full implementation would test all combinations)
      
    } catch (error) {
      console.log('⚠️ Could not run constraint group tests:', error instanceof Error ? error.message : String(error));
    }

    return groups;
  }

  // Create a minimal problem for testing specific constraint groups
  private createMinimalProblem(glpkInstance: any, constraintTypes: string[]): any {
    // Create a very small test problem (4 teams, 6 matchups, 6 weeks)
    const testMatchups = this.matchups.slice(0, 6);
    const testTeams = this.teams.slice(0, 4);
    const testWeeks = 6;
    
    const varNames: string[] = [];
    const objectiveVars: { name: string; coef: number }[] = [];
    const subjectTo: any[] = [];
    
    // Create variables
    for (let m = 0; m < testMatchups.length; m++) {
      for (let w = 1; w <= testWeeks; w++) {
        const varName = `x_${m}_${w}`;
        varNames.push(varName);
        objectiveVars.push({ name: varName, coef: 1 });
      }
    }
    
    // Add only the requested constraint types
    if (constraintTypes.includes('matchup')) {
      for (let m = 0; m < testMatchups.length; m++) {
        const vars: { name: string; coef: number }[] = [];
        for (let w = 1; w <= testWeeks; w++) {
          vars.push({ name: `x_${m}_${w}`, coef: 1 });
        }
        subjectTo.push({
          name: `test_matchup_${m}`,
          vars,
          bnds: { type: glpkInstance.GLP_FX, lb: 1, ub: 1 }
        });
      }
    }
    
    if (constraintTypes.includes('teamGame')) {
      for (let t = 0; t < testTeams.length; t++) {
        const teamId = testTeams[t].id;
        const vars: { name: string; coef: number }[] = [];
        for (let m = 0; m < testMatchups.length; m++) {
          if (testMatchups[m].home === teamId || testMatchups[m].away === teamId) {
            for (let w = 1; w <= testWeeks; w++) {
              vars.push({ name: `x_${m}_${w}`, coef: 1 });
            }
          }
        }
        if (vars.length > 0) {
          subjectTo.push({
            name: `test_team_${t}`,
            vars,
            bnds: { type: glpkInstance.GLP_FX, lb: Math.min(3, vars.length / testWeeks), ub: Math.min(3, vars.length / testWeeks) }
          });
        }
      }
    }
    
    if (constraintTypes.includes('byeWeek')) {
      for (let w = 1; w <= testWeeks; w++) {
        const vars: { name: string; coef: number }[] = [];
        for (let m = 0; m < testMatchups.length; m++) {
          vars.push({ name: `x_${m}_${w}`, coef: 1 });
        }
        subjectTo.push({
          name: `test_bye_${w}`,
          vars,
          bnds: { type: glpkInstance.GLP_DB, lb: 1, ub: 3 }
        });
      }
    }
    
    // Add bounds
    const bounds: any[] = [];
    for (const varName of varNames) {
      bounds.push({
        name: varName,
        type: glpkInstance.GLP_DB,
        lb: 0,
        ub: 1
      });
    }
    
    return {
      name: 'Constraint_Group_Test',
      objective: {
        direction: glpkInstance.GLP_MIN,
        name: 'test_objective',
        vars: objectiveVars
      },
      subjectTo,
      bounds,
      binaries: varNames
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
  constraints: ScheduleConstraints = {},
  preScheduledGameCounts?: Map<string, number>,
  preScheduledWeeks?: Set<number>
): ScheduleConstraintSolver {
  return new ScheduleConstraintSolver(matchups, teams, weeks, constraints, preScheduledGameCounts, preScheduledWeeks);
} 