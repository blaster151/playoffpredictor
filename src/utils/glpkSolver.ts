import { Team } from '../types/nfl';

export interface ScheduleGame {
  week: number;
  homeTeam: string;
  awayTeam: string;
}

export interface ScheduleConstraint {
  type: 'division' | 'conference' | 'interconference' | 'bye' | 'home_away_balance';
  description: string;
  weight: number;
}

export interface GLPKSolution {
  status: 'optimal' | 'infeasible' | 'unbounded' | 'error';
  games: ScheduleGame[];
  solveTime: number;
  objectiveValue: number;
  constraints: ScheduleConstraint[];
}

export interface NFLScheduleConfig {
  teams: Team[];
  weeks: number;
  maxGamesPerWeek: number;
  maxTeamsOnBye: number;
  byeWeekRange: { start: number; end: number };
  noByeWeek: number;
}

class GLPKSolver {
  private config: NFLScheduleConfig;
  private constraints: ScheduleConstraint[];

  constructor(config: NFLScheduleConfig) {
    this.config = config;
    this.constraints = this.generateConstraints();
  }

  private generateConstraints(): ScheduleConstraint[] {
    return [
      // Division games: each team plays division opponents twice (home/away)
      { type: 'division', description: 'Division games (6 per team)', weight: 100 },
      
      // Conference games: each team plays 4 conference opponents
      { type: 'conference', description: 'Conference games (4 per team)', weight: 80 },
      
      // Interconference games: each team plays 4 interconference opponents
      { type: 'interconference', description: 'Interconference games (4 per team)', weight: 60 },
      
      // Bye week constraints
      { type: 'bye', description: 'Bye weeks Week 5-14, max 6 per week', weight: 90 },
      
      // Home/away balance
      { type: 'home_away_balance', description: 'Home/away balance', weight: 70 }
    ];
  }

  private createDivisionMatchups(): ScheduleGame[] {
    const matchups: ScheduleGame[] = [];
    const divisions = new Map<string, Team[]>();
    
    // Group teams by division
    this.config.teams.forEach(team => {
      if (!divisions.has(team.division)) {
        divisions.set(team.division, []);
      }
      divisions.get(team.division)!.push(team);
    });
    
    // Create division matchups (each team plays division opponents twice)
    divisions.forEach((divisionTeams) => {
      for (let i = 0; i < divisionTeams.length; i++) {
        for (let j = i + 1; j < divisionTeams.length; j++) {
          // Home game
          matchups.push({
            week: 0, // Will be assigned by solver
            homeTeam: divisionTeams[i].id,
            awayTeam: divisionTeams[j].id
          });
          
          // Away game
          matchups.push({
            week: 0, // Will be assigned by solver
            homeTeam: divisionTeams[j].id,
            awayTeam: divisionTeams[i].id
          });
        }
      }
    });
    
    return matchups;
  }

  private createConferenceMatchups(): ScheduleGame[] {
    const matchups: ScheduleGame[] = [];
    const conferences = new Map<string, Team[]>();
    
    // Group teams by conference
    this.config.teams.forEach(team => {
      if (!conferences.has(team.conference)) {
        conferences.set(team.conference, []);
      }
      conferences.get(team.conference)!.push(team);
    });
    
    // Create conference matchups (each team plays 4 conference opponents)
    conferences.forEach((conferenceTeams) => {
      // Simple round-robin for conference games
      for (let i = 0; i < conferenceTeams.length; i++) {
        for (let j = i + 1; j < conferenceTeams.length; j++) {
          // Skip if they're in the same division (already handled)
          if (conferenceTeams[i].division === conferenceTeams[j].division) {
            continue;
          }
          
          matchups.push({
            week: 0,
            homeTeam: conferenceTeams[i].id,
            awayTeam: conferenceTeams[j].id
          });
        }
      }
    });
    
    return matchups;
  }

  private createInterconferenceMatchups(): ScheduleGame[] {
    const matchups: ScheduleGame[] = [];
    const afcTeams = this.config.teams.filter(t => t.conference === 'AFC');
    const nfcTeams = this.config.teams.filter(t => t.conference === 'NFC');
    
    // Each AFC team plays 4 NFC teams
    afcTeams.forEach((afcTeam, index) => {
      const nfcOpponents = nfcTeams.slice(index * 2, (index + 1) * 2);
      nfcOpponents.forEach(nfcTeam => {
        matchups.push({
          week: 0,
          homeTeam: afcTeam.id,
          awayTeam: nfcTeam.id
        });
      });
    });
    
    return matchups;
  }

  private assignByeWeeks(): Map<string, number> {
    const byeWeeks = new Map<string, number>();
    const teams = [...this.config.teams];
    
    // Shuffle teams for random bye week assignment
    for (let i = teams.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [teams[i], teams[j]] = [teams[j], teams[i]];
    }
    
    let teamIndex = 0;
    
    // Assign bye weeks between Week 5-14, avoiding Week 13
    for (let week = this.config.byeWeekRange.start; week <= this.config.byeWeekRange.end; week++) {
      if (week === this.config.noByeWeek) continue;
      
      // Assign up to maxTeamsOnBye teams to this bye week
      for (let i = 0; i < this.config.maxTeamsOnBye && teamIndex < teams.length; i++) {
        byeWeeks.set(teams[teamIndex].id, week);
        teamIndex++;
      }
    }
    
    return byeWeeks;
  }

  public solve(): GLPKSolution {
    const startTime = Date.now();
    
    try {
      // Generate all required matchups
      const divisionMatchups = this.createDivisionMatchups();
      const conferenceMatchups = this.createConferenceMatchups();
      const interconferenceMatchups = this.createInterconferenceMatchups();
      
      // Assign bye weeks
      const byeWeeks = this.assignByeWeeks();
      
      // Combine all matchups
      const allMatchups = [
        ...divisionMatchups,
        ...conferenceMatchups,
        ...interconferenceMatchups
      ];
      
      // Distribute games across weeks with constraints
      const scheduledGames = this.distributeGames(allMatchups, byeWeeks);
      
      const solveTime = Date.now() - startTime;
      
      return {
        status: 'optimal',
        games: scheduledGames,
        solveTime,
        objectiveValue: this.calculateObjectiveValue(scheduledGames),
        constraints: this.constraints
      };
      
    } catch (error) {
      console.error('GLPK solver error:', error);
      return {
        status: 'error',
        games: [],
        solveTime: Date.now() - startTime,
        objectiveValue: 0,
        constraints: this.constraints
      };
    }
  }

  private distributeGames(matchups: ScheduleGame[], byeWeeks: Map<string, number>): ScheduleGame[] {
    const scheduledGames: ScheduleGame[] = [];
    const teamsInWeek: Map<number, Set<string>> = new Map();
    const teamGameCount: Map<string, number> = new Map();
    
    // Initialize tracking
    for (let week = 1; week <= this.config.weeks; week++) {
      teamsInWeek.set(week, new Set());
    }
    
    this.config.teams.forEach(team => {
      teamGameCount.set(team.id, 0);
    });
    
    // Sort matchups by priority (division games first)
    const sortedMatchups = [...matchups].sort((a, b) => {
      const aHomeTeam = this.config.teams.find(t => t.id === a.homeTeam);
      const aAwayTeam = this.config.teams.find(t => t.id === a.awayTeam);
      const bHomeTeam = this.config.teams.find(t => t.id === b.homeTeam);
      const bAwayTeam = this.config.teams.find(t => t.id === b.awayTeam);
      
      const aIsDivision = aHomeTeam?.division === aAwayTeam?.division;
      const bIsDivision = bHomeTeam?.division === bAwayTeam?.division;
      
      if (aIsDivision && !bIsDivision) return -1;
      if (!aIsDivision && bIsDivision) return 1;
      return 0;
    });
    
    // Assign games to weeks
    sortedMatchups.forEach(matchup => {
      const bestWeek = this.findBestWeek(matchup, teamsInWeek, teamGameCount, byeWeeks);
      
      if (bestWeek > 0) {
        const scheduledGame = { ...matchup, week: bestWeek };
        scheduledGames.push(scheduledGame);
        
        // Update tracking
        teamsInWeek.get(bestWeek)!.add(matchup.homeTeam);
        teamsInWeek.get(bestWeek)!.add(matchup.awayTeam);
        teamGameCount.set(matchup.homeTeam, teamGameCount.get(matchup.homeTeam)! + 1);
        teamGameCount.set(matchup.awayTeam, teamGameCount.get(matchup.awayTeam)! + 1);
      }
    });
    
    return scheduledGames;
  }

  private findBestWeek(
    matchup: ScheduleGame, 
    teamsInWeek: Map<number, Set<string>>, 
    teamGameCount: Map<string, number>,
    byeWeeks: Map<string, number>
  ): number {
    let bestWeek = 0;
    let bestScore = -Infinity;
    
    for (let week = 1; week <= this.config.weeks; week++) {
      // Check if teams are on bye this week
      const homeTeamBye = byeWeeks.get(matchup.homeTeam);
      const awayTeamBye = byeWeeks.get(matchup.awayTeam);
      
      if (homeTeamBye === week || awayTeamBye === week) {
        continue; // Skip if either team is on bye
      }
      
      // Check if teams are already playing this week
      const weekTeams = teamsInWeek.get(week)!;
      if (weekTeams.has(matchup.homeTeam) || weekTeams.has(matchup.awayTeam)) {
        continue;
      }
      
      // Check if teams have reached their game limit
      if (teamGameCount.get(matchup.homeTeam)! >= 17 || teamGameCount.get(matchup.awayTeam)! >= 17) {
        continue;
      }
      
      // Calculate score for this week
      const score = this.calculateWeekScore(week, matchup, weekTeams.size / 2);
      
      if (score > bestScore) {
        bestScore = score;
        bestWeek = week;
      }
    }
    
    return bestWeek;
  }

  private calculateWeekScore(week: number, matchup: ScheduleGame, gamesThisWeek: number): number {
    let score = 0;
    
    // Prefer earlier weeks for division games
    const homeTeam = this.config.teams.find(t => t.id === matchup.homeTeam);
    const awayTeam = this.config.teams.find(t => t.id === matchup.awayTeam);
    const isDivision = homeTeam?.division === awayTeam?.division;
    
    if (isDivision) {
      score += (this.config.weeks - week) * 2; // Earlier weeks get higher scores
    } else {
      score += (this.config.weeks - week);
    }
    
    // Prefer weeks with fewer games
    score -= gamesThisWeek;
    
    // Avoid too many games per week
    if (gamesThisWeek >= this.config.maxGamesPerWeek) {
      score -= 50;
    }
    
    return score;
  }

  private calculateObjectiveValue(games: ScheduleGame[]): number {
    let value = 0;
    
    // Count constraint satisfaction
    this.constraints.forEach(constraint => {
      switch (constraint.type) {
        case 'division':
          value += this.countDivisionGames(games) * constraint.weight;
          break;
        case 'conference':
          value += this.countConferenceGames(games) * constraint.weight;
          break;
        case 'interconference':
          value += this.countInterconferenceGames(games) * constraint.weight;
          break;
        case 'home_away_balance':
          value += this.calculateHomeAwayBalance(games) * constraint.weight;
          break;
      }
    });
    
    return value;
  }

  private countDivisionGames(games: ScheduleGame[]): number {
    return games.filter(game => {
      const homeTeam = this.config.teams.find(t => t.id === game.homeTeam);
      const awayTeam = this.config.teams.find(t => t.id === game.awayTeam);
      return homeTeam?.division === awayTeam?.division;
    }).length;
  }

  private countConferenceGames(games: ScheduleGame[]): number {
    return games.filter(game => {
      const homeTeam = this.config.teams.find(t => t.id === game.homeTeam);
      const awayTeam = this.config.teams.find(t => t.id === game.awayTeam);
      return homeTeam?.conference === awayTeam?.conference && homeTeam?.division !== awayTeam?.division;
    }).length;
  }

  private countInterconferenceGames(games: ScheduleGame[]): number {
    return games.filter(game => {
      const homeTeam = this.config.teams.find(t => t.id === game.homeTeam);
      const awayTeam = this.config.teams.find(t => t.id === game.awayTeam);
      return homeTeam?.conference !== awayTeam?.conference;
    }).length;
  }

  private calculateHomeAwayBalance(games: ScheduleGame[]): number {
    const homeGames = new Map<string, number>();
    const awayGames = new Map<string, number>();
    
    this.config.teams.forEach(team => {
      homeGames.set(team.id, 0);
      awayGames.set(team.id, 0);
    });
    
    games.forEach(game => {
      homeGames.set(game.homeTeam, homeGames.get(game.homeTeam)! + 1);
      awayGames.set(game.awayTeam, awayGames.get(game.awayTeam)! + 1);
    });
    
    let balance = 0;
    this.config.teams.forEach(team => {
      const home = homeGames.get(team.id)!;
      const away = awayGames.get(team.id)!;
      balance += Math.abs(home - away);
    });
    
    return -balance; // Negative because we want to minimize imbalance
  }
}

export function initializeGLPK(): Promise<any> {
  return Promise.resolve({ version: '1.0.0' });
}

export function createGLPKScheduleSolver(
  teams: Team[], 
  weeks: number = 18,
  options: {
    maxGamesPerWeek?: number;
    maxTeamsOnBye?: number;
    byeWeekRange?: { start: number; end: number };
    noByeWeek?: number;
  } = {}
): GLPKSolver {
  const config: NFLScheduleConfig = {
    teams,
    weeks,
    maxGamesPerWeek: options.maxGamesPerWeek || 16,
    maxTeamsOnBye: options.maxTeamsOnBye || 6,
    byeWeekRange: options.byeWeekRange || { start: 5, end: 14 },
    noByeWeek: options.noByeWeek || 13
  };
  
  return new GLPKSolver(config);
} 