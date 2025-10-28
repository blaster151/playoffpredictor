import { Team, Game } from '../types/nfl';
import { dataManager } from './dataManager';

export interface SavedSchedule {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  season: number;
  weeks: {
    [week: number]: {
      games: Array<{
        id: string;
        homeTeam: string;
        awayTeam: string;
        homeTeamName: string;
        awayTeamName: string;
        homeTeamAbbr: string;
        awayTeamAbbr: string;
        homeScore?: number;
        awayScore?: number;
        winner?: string;
        day?: string; // Day of week (e.g., "Sunday", "Monday", "Thursday")
        date?: string; // Date string (e.g., "2026-09-13")
        time?: string; // Game time (e.g., "8:15 PM")
        venue?: string; // Stadium/venue information
        isPlayed: boolean;
        isPredicted: boolean;
      }>;
      weekNumber: number;
      isComplete: boolean;
    };
  };
  metadata: {
    totalGames: number;
    totalWeeks: number;
    teams: string[];
    generatedBy: 'GLPK' | 'manual' | 'import';
  };
}

export interface ScheduleGame {
  week: number;
  home: string;
  away: string;
}

export class ScheduleSaver {
  private static STORAGE_KEY = 'nfl_schedules';

  /**
   * Save a schedule to localStorage with debouncing and backup protection
   */
  static async saveSchedule(
    schedule: ScheduleGame[],
    teams: Team[],
    options: {
      name: string;
      description?: string;
      season?: number;
      generatedBy?: 'GLPK' | 'manual' | 'import';
      startingPointGames?: { [weekNumber: number]: { games: Game[] } }; // Pre-scheduled games with rich data
    }
  ): Promise<SavedSchedule> {
    const teamMap = new Map(teams.map(team => [team.id, team]));
    
    // Group games by week
    const weeks: SavedSchedule['weeks'] = {};
    
    // Find the maximum week number in the schedule
    const maxWeek = Math.max(...schedule.map(game => game.week));
    
    for (let week = 1; week <= maxWeek; week++) {
      // Check if this week has pre-scheduled games with rich data (day, time, etc.)
      const startingPointWeek = options.startingPointGames?.[week];
      
      if (startingPointWeek) {
        // Use pre-scheduled games with all their rich data
        weeks[week] = {
          games: startingPointWeek.games.map(game => ({
            ...game,
            homeTeamName: teamMap.get(game.homeTeam)?.name || game.homeTeam,
            awayTeamName: teamMap.get(game.awayTeam)?.name || game.awayTeam,
            homeTeamAbbr: teamMap.get(game.homeTeam)?.abbreviation || game.homeTeam,
            awayTeamAbbr: teamMap.get(game.awayTeam)?.abbreviation || game.awayTeam,
          })),
          weekNumber: week,
          isComplete: false,
        };
      } else {
        // Use solver-generated games (generic format)
        const weekGames = schedule.filter(game => game.week === week);
        
        weeks[week] = {
          games: weekGames.map(game => {
            const homeTeam = teamMap.get(game.home);
            const awayTeam = teamMap.get(game.away);
            
            return {
              id: `${game.home}-${game.away}-week${week}`,
              homeTeam: game.home,
              awayTeam: game.away,
              homeTeamName: homeTeam?.name || game.home,
              awayTeamName: awayTeam?.name || game.away,
              homeTeamAbbr: homeTeam?.abbreviation || game.home,
              awayTeamAbbr: awayTeam?.abbreviation || game.away,
              day: 'Sunday', // Default for solver-generated games
              date: `Week ${week}`,
              isPlayed: false,
              isPredicted: false,
            };
          }),
          weekNumber: week,
          isComplete: false,
        };
      }
    }

    const savedSchedule: SavedSchedule = {
      id: `schedule_${Date.now()}`,
      name: options.name,
      description: options.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      season: options.season || 2025,
      weeks,
      metadata: {
        totalGames: schedule.length,
        totalWeeks: Math.max(...schedule.map(game => game.week)),
        teams: teams.map(team => team.id),
        generatedBy: options.generatedBy || 'GLPK',
      },
    };

    // Save to localStorage with debouncing and backup protection
    await this.saveToStorage(savedSchedule);

    return savedSchedule;
  }

  /**
   * Load all saved schedules from localStorage with backup recovery
   */
  static loadAllSchedules(): SavedSchedule[] {
    try {
      const schedules = dataManager.loadData<SavedSchedule[]>(this.STORAGE_KEY);
      
      // Ensure we always return an array
      if (!schedules) {
        console.log('No schedules found in storage, returning empty array');
        return [];
      }
      
      if (!Array.isArray(schedules)) {
        console.error('Schedules data is not an array:', typeof schedules, schedules);
        return [];
      }
      
      return schedules;
    } catch (error) {
      console.error('Error loading schedules:', error);
      return [];
    }
  }

  /**
   * Load a specific schedule by ID
   */
  static loadSchedule(id: string): SavedSchedule | null {
    const schedules = this.loadAllSchedules();
    return schedules.find(schedule => schedule.id === id) || null;
  }

  /**
   * Update a specific schedule with debounced save
   */
  static async updateSchedule(id: string, updates: Partial<SavedSchedule>): Promise<boolean> {
    const schedules = this.loadAllSchedules();
    const index = schedules.findIndex(schedule => schedule.id === id);
    
    if (index === -1) return false;
    
    schedules[index] = {
      ...schedules[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    return await this.saveAllToStorage(schedules);
  }

  /**
   * Update a specific game's scores with debounced save
   */
  static async updateGameScore(scheduleId: string, gameId: string, homeScore: number, awayScore: number): Promise<boolean> {
    const schedules = this.loadAllSchedules();
    const scheduleIndex = schedules.findIndex(schedule => schedule.id === scheduleId);
    
    if (scheduleIndex === -1) return false;
    
    const schedule = schedules[scheduleIndex];
    let gameFound = false;
    
    // Find and update the game
    Object.values(schedule.weeks).forEach(week => {
      week.games.forEach(game => {
        if (game.id === gameId) {
          game.homeScore = homeScore;
          game.awayScore = awayScore;
          game.isPlayed = true;
          game.winner = homeScore > awayScore ? game.homeTeam : awayScore > homeScore ? game.awayTeam : undefined;
          gameFound = true;
        }
      });
    });
    
    if (gameFound) {
      schedule.updatedAt = new Date().toISOString();
      return await this.saveAllToStorage(schedules);
    }
    
    return false;
  }

  /**
   * Delete a schedule
   */
  static deleteSchedule(id: string): boolean {
    const schedules = this.loadAllSchedules();
    const filtered = schedules.filter(schedule => schedule.id !== id);
    
    if (filtered.length === schedules.length) return false;
    
    this.saveAllToStorage(filtered);
    return true;
  }

  /**
   * Convert saved schedule back to simple format for GLPK solver
   */
  static toScheduleGames(schedule: SavedSchedule): ScheduleGame[] {
    const games: ScheduleGame[] = [];
    
    Object.values(schedule.weeks).forEach(week => {
      week.games.forEach(game => {
        games.push({
          week: week.weekNumber,
          home: game.homeTeam,
          away: game.awayTeam,
        });
      });
    });
    
    return games;
  }

  /**
   * Get games for a specific week
   */
  static getWeekGames(schedule: SavedSchedule, week: number) {
    return schedule.weeks[week]?.games || [];
  }

  /**
   * Check if a week is complete (all games have scores)
   */
  static isWeekComplete(schedule: SavedSchedule, week: number): boolean {
    const weekData = schedule.weeks[week];
    if (!weekData) return false;
    
    return weekData.games.every(game => 
      typeof game.homeScore === 'number' && 
      typeof game.awayScore === 'number'
    );
  }

  /**
   * Get team's schedule for the season
   */
  static getTeamSchedule(schedule: SavedSchedule, teamId: string) {
    const teamGames: Array<{
      week: number;
      opponent: string;
      opponentName: string;
      opponentAbbr: string;
      isHome: boolean;
      homeScore?: number;
      awayScore?: number;
      winner?: string;
    }> = [];
    
    Object.values(schedule.weeks).forEach(week => {
      week.games.forEach(game => {
        if (game.homeTeam === teamId) {
          teamGames.push({
            week: week.weekNumber,
            opponent: game.awayTeam,
            opponentName: game.awayTeamName,
            opponentAbbr: game.awayTeamAbbr,
            isHome: true,
            homeScore: game.homeScore,
            awayScore: game.awayScore,
            winner: game.winner,
          });
        } else if (game.awayTeam === teamId) {
          teamGames.push({
            week: week.weekNumber,
            opponent: game.homeTeam,
            opponentName: game.homeTeamName,
            opponentAbbr: game.homeTeamAbbr,
            isHome: false,
            homeScore: game.homeScore,
            awayScore: game.awayScore,
            winner: game.winner,
          });
        }
      });
    });
    
    return teamGames.sort((a, b) => a.week - b.week);
  }

  private static async saveToStorage(schedule: SavedSchedule): Promise<boolean> {
    const schedules = this.loadAllSchedules();
    const existingIndex = schedules.findIndex(s => s.id === schedule.id);
    
    if (existingIndex >= 0) {
      schedules[existingIndex] = schedule;
    } else {
      schedules.push(schedule);
    }
    
    return await this.saveAllToStorage(schedules);
  }

  private static async saveAllToStorage(schedules: SavedSchedule[]): Promise<boolean> {
    try {
      return await dataManager.debouncedSave(this.STORAGE_KEY, schedules, 'schedule_save');
    } catch (error) {
      console.error('Error saving schedules:', error);
      return false;
    }
  }
} 