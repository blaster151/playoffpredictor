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

export class SimpleScheduleSolver {
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
      maxGamesPerWeek: 16,
      byeWeekDistribution: 'balanced',
      ...constraints,
    };
  }

  // Simple greedy algorithm for now - can be enhanced with GLPK later
  solve(): ScheduleSolution {
    const startTime = Date.now();
    
    try {
      const games = this.greedySchedule();
      const solveTime = Date.now() - startTime;
      
      return {
        games,
        objective: this.calculateObjective(games),
        status: 'optimal',
        solveTime,
        constraints: this.calculateConstraints(games),
      };
    } catch (error) {
      console.error('Schedule solve error:', error);
      return {
        games: [],
        objective: 0,
        status: 'error',
        solveTime: Date.now() - startTime,
        constraints: { totalGames: 0, weeksUsed: 0, teamsWithByes: 0 },
      };
    }
  }

  private greedySchedule(): ScheduledGame[] {
    const games: ScheduledGame[] = [];
    const teamGames: { [teamId: string]: number } = {};
    const teamWeeks: { [teamId: string]: number[] } = {};
    
    // Initialize tracking
    for (const team of this.teams) {
      teamGames[team.id] = 0;
      teamWeeks[team.id] = [];
    }

    // Sort matchups by priority (division games first, then conference, then inter-conference)
    const sortedMatchups = [...this.matchups].sort((a, b) => {
      const aPriority = this.getMatchupPriority(a);
      const bPriority = this.getMatchupPriority(b);
      return bPriority - aPriority; // Higher priority first
    });

    // Try to schedule each matchup
    for (const matchup of sortedMatchups) {
      const week = this.findBestWeek(matchup, teamGames, teamWeeks);
      
      if (week > 0) {
        games.push({
          matchup,
          week,
          homeTeam: matchup.home,
          awayTeam: matchup.away,
        });
        
        teamGames[matchup.home]++;
        teamGames[matchup.away]++;
        teamWeeks[matchup.home].push(week);
        teamWeeks[matchup.away].push(week);
      }
    }

    return games.sort((a, b) => a.week - b.week);
  }

  private getMatchupPriority(matchup: Matchup): number {
    const homeTeam = this.teams.find(t => t.id === matchup.home);
    const awayTeam = this.teams.find(t => t.id === matchup.away);
    
    if (!homeTeam || !awayTeam) return 0;

    // Division games get highest priority
    if (homeTeam.division === awayTeam.division && homeTeam.conference === awayTeam.conference) {
      return 100;
    }
    
    // Conference games get medium priority
    if (homeTeam.conference === awayTeam.conference) {
      return 50;
    }
    
    // Inter-conference games get lowest priority
    return 10;
  }

  private findBestWeek(
    matchup: Matchup,
    teamGames: { [teamId: string]: number },
    teamWeeks: { [teamId: string]: number[] }
  ): number {
    const homeTeam = this.teams.find(t => t.id === matchup.home);
    const awayTeam = this.teams.find(t => t.id === matchup.away);
    
    if (!homeTeam || !awayTeam) return -1;

    // Check if teams can still play (haven't reached 17 games)
    if (teamGames[matchup.home] >= 17 || teamGames[matchup.away] >= 17) {
      return -1;
    }

    // Bye weeks are typically in weeks 5-14 (avoiding early season weeks 1-4 and late weeks 15-18)
    // Teams play 17 games over 18 weeks, so each team gets exactly 1 bye week
    // We need to ensure teams don't get scheduled in ALL 18 weeks
    
    // Find the earliest week where both teams are available
    for (let week = 1; week <= this.weeks; week++) {
      if (this.canScheduleInWeek(matchup, week, teamWeeks, teamGames)) {
        return week;
      }
    }

    return -1; // No available week found
  }

  private canScheduleInWeek(
    matchup: Matchup,
    week: number,
    teamWeeks: { [teamId: string]: number[] },
    teamGames: { [teamId: string]: number }
  ): boolean {
    // Check if either team is already playing this week
    if (teamWeeks[matchup.home].includes(week) || teamWeeks[matchup.away].includes(week)) {
      return false;
    }

    // Bye week logic: Ensure teams get a bye week
    // If a team has played 16 games and this is their 17th, they should have at least one week off
    const homeGamesPlayed = teamGames[matchup.home];
    const awayGamesPlayed = teamGames[matchup.away];
    
    // If a team is approaching 17 games (16 games played), ensure they haven't played all 17 weeks yet
    if (homeGamesPlayed >= 16 && teamWeeks[matchup.home].length >= 17) {
      return false; // Home team has no bye week left
    }
    if (awayGamesPlayed >= 16 && teamWeeks[matchup.away].length >= 17) {
      return false; // Away team has no bye week left
    }

    // Check if this would create too many consecutive games
    if (this.hasTooManyConsecutiveGames(matchup.home, week, teamWeeks) ||
        this.hasTooManyConsecutiveGames(matchup.away, week, teamWeeks)) {
      return false;
    }

    return true;
  }

  private hasTooManyConsecutiveGames(
    teamId: string,
    week: number,
    teamWeeks: { [teamId: string]: number[] }
  ): boolean {
    const teamWeekList = teamWeeks[teamId];
    const consecutiveWeeks = [week - 1, week, week + 1];
    
    let consecutiveCount = 0;
    for (const w of consecutiveWeeks) {
      if (teamWeekList.includes(w)) {
        consecutiveCount++;
      }
    }

    return consecutiveCount > (this.constraints.maxConsecutiveHome || 3);
  }

  private calculateObjective(games: ScheduledGame[]): number {
    let objective = 0;
    
    for (const game of games) {
      // Base cost
      objective += 1;
      
      // Add cost for prime time games
      if (this.constraints.primeTimeGames?.includes(`${game.homeTeam}-${game.awayTeam}`)) {
        objective += 10;
      }
      
      // Add cost for rivalry weeks
      if (this.constraints.rivalryWeeks?.[game.week]?.includes(`${game.homeTeam}-${game.awayTeam}`)) {
        objective += 5;
      }
    }
    
    return objective;
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
    
    // Count teams with byes
    const teamsWithByes = Object.values(teamGames).filter(count => count === 17).length;
    
    return {
      totalGames: games.length,
      weeksUsed: Object.values(gamesPerWeek).filter(count => count > 0).length,
      teamsWithByes,
    };
  }

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
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// Utility function to create a solver instance
export function createSimpleScheduleSolver(
  matchups: Matchup[],
  teams: Team[],
  weeks: number = 18,
  constraints: ScheduleConstraints = {}
): SimpleScheduleSolver {
  return new SimpleScheduleSolver(matchups, teams, weeks, constraints);
} 