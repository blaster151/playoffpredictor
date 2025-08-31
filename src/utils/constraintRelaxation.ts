/**
 * Constraint relaxation strategies for NFL schedule optimization
 * 
 * These strategies help find feasible solutions while maintaining
 * core NFL scheduling requirements.
 */

export interface RelaxationStrategy {
  name: string;
  description: string;
  priority: number; // Lower number = try first
  apply: (constraints: any) => any;
}

export const relaxationStrategies: RelaxationStrategy[] = [
  {
    name: 'relaxByeWeekTiming',
    description: 'Expand bye week window from weeks 4-14 to weeks 3-15',
    priority: 1,
    apply: (constraints) => {
      return {
        ...constraints,
        byeWeekStart: 3,
        byeWeekEnd: 15,
      };
    }
  },
  {
    name: 'relaxInterConferenceLimit',
    description: 'Increase max inter-conference games per week from 6 to 8',
    priority: 2,
    apply: (constraints) => {
      return {
        ...constraints,
        maxInterConferencePerWeek: 8,
      };
    }
  },
  {
    name: 'relaxConsecutiveConstraints',
    description: 'Allow up to 4 consecutive home/away games instead of 3',
    priority: 3,
    apply: (constraints) => {
      return {
        ...constraints,
        maxConsecutiveHome: 4,
        maxConsecutiveAway: 4,
      };
    }
  },
  {
    name: 'relaxMaxTeamsOnBye',
    description: 'Allow up to 8 teams on bye per week instead of 6',
    priority: 4,
    apply: (constraints) => {
      return {
        ...constraints,
        maxTeamsOnBye: 8,
      };
    }
  },
];

/**
 * Try solving with progressively relaxed constraints
 */
export async function solveWithRelaxation(
  solver: any,
  maxAttempts: number = 5
): Promise<{ solution: any; relaxationsUsed: string[] }> {
  let relaxationsUsed: string[] = [];
  let currentConstraints = solver.constraints;
  
  // First attempt with original constraints
  console.log('🎯 Attempting solve with original constraints...');
  let solution = await solver.solve();
  
  if (solution.status === 'optimal' && solution.games.length > 0) {
    return { solution, relaxationsUsed };
  }
  
  // Try progressive relaxation
  for (let i = 0; i < Math.min(relaxationStrategies.length, maxAttempts - 1); i++) {
    const strategy = relaxationStrategies[i];
    console.log(`🔄 Applying relaxation: ${strategy.name}`);
    
    currentConstraints = strategy.apply(currentConstraints);
    solver.constraints = currentConstraints;
    relaxationsUsed.push(strategy.name);
    
    solution = await solver.solve();
    
    if (solution.status === 'optimal' && solution.games.length > 0) {
      console.log(`✅ Found solution with ${relaxationsUsed.length} relaxations`);
      return { solution, relaxationsUsed };
    }
  }
  
  // If still no solution, return the last attempt
  console.warn('⚠️ Could not find optimal solution even with relaxations');
  return { solution, relaxationsUsed };
}

/**
 * Analyze why a problem might be infeasible
 */
export function analyzeInfeasibility(
  matchups: any[],
  teams: any[],
  weeks: number
): string[] {
  const issues: string[] = [];
  
  // Check total games vs available slots
  const totalGames = matchups.length;
  const maxGamesPerWeek = 16;
  const totalSlots = weeks * maxGamesPerWeek;
  
  if (totalGames > totalSlots) {
    issues.push(`Too many games: ${totalGames} games but only ${totalSlots} time slots`);
  }
  
  // Check if each team has exactly 17 games
  const teamGameCount: { [id: string]: number } = {};
  teams.forEach(t => teamGameCount[t.id] = 0);
  
  matchups.forEach(m => {
    if (teamGameCount[m.home] !== undefined) teamGameCount[m.home]++;
    if (teamGameCount[m.away] !== undefined) teamGameCount[m.away]++;
  });
  
  Object.entries(teamGameCount).forEach(([teamId, count]) => {
    if (count !== 17) {
      issues.push(`Team ${teamId} has ${count} games instead of 17`);
    }
  });
  
  // Check bye week math
  const totalTeamWeeks = teams.length * weeks;
  const totalTeamGames = teams.length * 17;
  const totalByeWeeks = totalTeamWeeks - totalTeamGames;
  const avgByesPerWeek = totalByeWeeks / weeks;
  
  if (avgByesPerWeek > 6) {
    issues.push(`Average ${avgByesPerWeek.toFixed(1)} teams on bye per week (max 6 typical)`);
  }
  
  return issues;
}