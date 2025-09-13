import { useState, useEffect } from 'react';
import { Team, Game } from '../types/nfl';
import { loadLocalTeams, loadLocalSchedule, loadLocalScheduleStructured, getDataInfo } from '../utils/localDataLoader';
import { SavedSchedule } from '../utils/scheduleSaver';

interface UseNFLDataOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseNFLDataReturn {
  teams: Team[];
  games: Game[];
  schedule: SavedSchedule | null;
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  refreshTeams: () => Promise<void>;
  refreshSchedule: () => Promise<void>;
}

// Client-side ESPN API fetcher
class ClientNFLDataFetcher {
  private static instance: ClientNFLDataFetcher;
  private cache: Map<string, any> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static getInstance(): ClientNFLDataFetcher {
    if (!ClientNFLDataFetcher.instance) {
      ClientNFLDataFetcher.instance = new ClientNFLDataFetcher();
    }
    return ClientNFLDataFetcher.instance;
  }

  private async fetchWithCache<T>(url: string, cacheKey: string): Promise<T> {
    const now = Date.now();
    const expiry = this.cacheExpiry.get(cacheKey) || 0;

    if (this.cache.has(cacheKey) && now < expiry) {
      return this.cache.get(cacheKey);
    }

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'NFL-Playoff-Predictor/1.0',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      this.cache.set(cacheKey, data);
      this.cacheExpiry.set(cacheKey, now + this.CACHE_DURATION);
      
      return data;
    } catch (error) {
      console.error(`Error fetching ${url}:`, error);
      throw error;
    }
  }

  async fetchTeamsFromESPN(): Promise<Team[]> {
    try {
      const data = await this.fetchWithCache<any>(
        'https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams',
        'teams'
      );

      const teams: Team[] = [];
      const teamsData = data.sports?.[0]?.leagues?.[0]?.teams || [];
      
      for (const teamData of teamsData) {
        const team = teamData.team;
        const conference = this.mapConference(teamData.groups?.conference?.name);
        const division = this.mapDivision(teamData.groups?.division?.name);
        
        if (conference && division) {
          teams.push({
            id: team.id,
            name: team.name,
            abbreviation: team.abbreviation,
            conference,
            division,
            logo: team.logos?.[0]?.href || `/logos/${team.abbreviation.toLowerCase()}.png`,
          });
        }
      }

      return teams;
    } catch (error) {
      console.error('Error fetching teams from ESPN:', error);
      throw error;
    }
  }

  async fetchScheduleFromESPN(year: string = '2025'): Promise<Game[]> {
    try {
      const data = await this.fetchWithCache<any>(
        `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?year=${year}`,
        `schedule-${year}`
      );

      const games: Game[] = [];
      const events = data.events || [];
      
      for (const event of events) {
        const game = event;
        const competition = game.competitions?.[0];
        
        if (competition) {
          const awayTeam = competition.competitors?.find((c: any) => c.homeAway === 'away');
          const homeTeam = competition.competitors?.find((c: any) => c.homeAway === 'home');
          
          if (awayTeam && homeTeam) {
            const gameDate = new Date(competition.date);
            const week = this.calculateWeek(gameDate, year);
            
            let venue: string | undefined;
            if (competition.venue && competition.venue.country !== 'USA') {
              venue = `${competition.venue.city}, ${competition.venue.country}`;
            }
            
            games.push({
              id: game.id,
              week,
              awayTeam: awayTeam.team.id,
              homeTeam: homeTeam.team.id,
              awayScore: awayTeam.score ? parseInt(awayTeam.score) : undefined,
              homeScore: homeTeam.score ? parseInt(homeTeam.score) : undefined,
              day: gameDate.toLocaleDateString('en-US', { weekday: 'short' }),
              date: gameDate.toISOString().split('T')[0],
              isPlayed: competition.status.type.completed,
              venue,
            });
          }
        }
      }

      return games;
    } catch (error) {
      console.error('Error fetching schedule from ESPN:', error);
      throw error;
    }
  }

  private mapConference(espnConference: string): 'AFC' | 'NFC' | null {
    if (!espnConference) return null;
    
    const conferenceMap: Record<string, 'AFC' | 'NFC'> = {
      'American Football Conference': 'AFC',
      'National Football Conference': 'NFC',
      'AFC': 'AFC',
      'NFC': 'NFC',
    };
    
    return conferenceMap[espnConference] || null;
  }

  private mapDivision(espnDivision: string): 'North' | 'South' | 'East' | 'West' | null {
    if (!espnDivision) return null;
    
    const divisionMap: Record<string, 'North' | 'South' | 'East' | 'West'> = {
      'North': 'North',
      'South': 'South',
      'East': 'East',
      'West': 'West',
    };
    
    return divisionMap[espnDivision] || null;
  }

  private calculateWeek(gameDate: Date, year: string): number {
    const seasonStart = new Date(`${year}-09-01`);
    const daysDiff = Math.floor((gameDate.getTime() - seasonStart.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.floor(daysDiff / 7) + 1);
  }

  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }
}

const clientFetcher = ClientNFLDataFetcher.getInstance();

export function useNFLData(options: UseNFLDataOptions = {}): UseNFLDataReturn {
  const { autoRefresh = true, refreshInterval = 300000 } = options; // 5 minutes default
  
  // Initialize with empty state to avoid hydration mismatch
  const [teams, setTeams] = useState<Team[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [schedule, setSchedule] = useState<SavedSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeams = async (): Promise<Team[]> => {
    try {
      // Try local data first
      const localTeams = await loadLocalTeams();
      if (localTeams.length > 0) {
        return localTeams;
      }
      
      // Fallback to ESPN API (client-side)
      return await clientFetcher.fetchTeamsFromESPN();
    } catch (err) {
      console.error('Error fetching teams:', err);
      throw err;
    }
  };

  const fetchSchedule = async (year: string = '2025'): Promise<{ games: Game[]; schedule: SavedSchedule }> => {
    try {
      // Try local data first
      const localSchedule = await loadLocalScheduleStructured(year);
      if (Object.keys(localSchedule.weeks).length > 0) {
        // Convert to SavedSchedule format
        const savedSchedule: SavedSchedule = {
          id: 'static_schedule',
          name: 'Static Schedule',
          description: 'Static fallback schedule',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          season: parseInt(year),
          weeks: {},
          metadata: {
            totalGames: localSchedule.weeks[1]?.games.length || 0,
            totalWeeks: 18,
            teams: localSchedule.teams.map(t => t.id),
            generatedBy: 'import'
          }
        };

        // Convert weeks to SavedSchedule format
        Object.entries(localSchedule.weeks).forEach(([weekNum, weekData]) => {
          const week = parseInt(weekNum);
          savedSchedule.weeks[week] = {
            games: weekData.games.map(game => ({
              id: game.id,
              homeTeam: game.homeTeam,
              awayTeam: game.awayTeam,
              homeTeamName: localSchedule.teams.find(t => t.id === game.homeTeam)?.name || game.homeTeam,
              awayTeamName: localSchedule.teams.find(t => t.id === game.awayTeam)?.name || game.awayTeam,
              homeTeamAbbr: localSchedule.teams.find(t => t.id === game.homeTeam)?.abbreviation || game.homeTeam,
              awayTeamAbbr: localSchedule.teams.find(t => t.id === game.awayTeam)?.abbreviation || game.awayTeam,
              homeScore: game.homeScore,
              awayScore: game.awayScore,
              winner: game.homeScore !== undefined && game.awayScore !== undefined 
                ? (game.homeScore > game.awayScore ? game.homeTeam : game.awayTeam)
                : undefined,
              isPlayed: game.isPlayed,
              isPredicted: false
            })),
            weekNumber: week,
            isComplete: false
          };
        });

        return {
          games: localSchedule.weeks[1]?.games || [],
          schedule: savedSchedule
        };
      }
      
      // Fallback to ESPN API (client-side)
      const espnGames = await clientFetcher.fetchScheduleFromESPN(year);
      // Convert ESPN games to SavedSchedule format
      const savedSchedule: SavedSchedule = {
        id: 'espn_schedule',
        name: 'ESPN Schedule',
        description: 'Live schedule from ESPN',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        season: parseInt(year),
        weeks: {},
        metadata: {
          totalGames: espnGames.length,
          totalWeeks: 18,
          teams: [],
                      generatedBy: 'import'
        }
      };

      espnGames.forEach(game => {
        if (!savedSchedule.weeks[game.week]) {
          savedSchedule.weeks[game.week] = {
            games: [],
            weekNumber: game.week,
            isComplete: false
          };
        }
        savedSchedule.weeks[game.week].games.push({
          id: game.id,
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          homeTeamName: game.homeTeam,
          awayTeamName: game.awayTeam,
          homeTeamAbbr: game.homeTeam,
          awayTeamAbbr: game.awayTeam,
          homeScore: game.homeScore,
          awayScore: game.awayScore,
          winner: game.homeScore !== undefined && game.awayScore !== undefined 
            ? (game.homeScore > game.awayScore ? game.homeTeam : game.awayTeam)
            : undefined,
          isPlayed: game.isPlayed,
          isPredicted: false
        });
      });
      
      return {
        games: espnGames,
        schedule: savedSchedule
      };
    } catch (err) {
      console.error('Error fetching schedule:', err);
      throw err;
    }
  };

  const refreshTeams = async (): Promise<void> => {
    try {
      setError(null);
      const teamsData = await fetchTeams();
      setTeams(teamsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch teams');
    }
  };

  const refreshSchedule = async (): Promise<void> => {
    try {
      setError(null);
      const scheduleData = await fetchSchedule();
      setGames(scheduleData.games);
      setSchedule(scheduleData.schedule);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch schedule');
    }
  };

  const refreshData = async (): Promise<void> => {
    setLoading(true);
    try {
      setError(null);
      const [teamsData, scheduleData] = await Promise.all([
        fetchTeams(),
        fetchSchedule(),
      ]);
      setTeams(teamsData);
      setGames(scheduleData.games);
      setSchedule(scheduleData.schedule);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  // Initial data load
  useEffect(() => {
    // Always run refreshData to ensure we have data
    refreshData();
  }, []);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refreshData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  return {
    teams,
    games,
    schedule,
    loading,
    error,
    refreshData,
    refreshTeams,
    refreshSchedule,
  };
}

export function useTeamRoster(teamId: string) {
  const [roster, setRoster] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRoster = async () => {
    if (!teamId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/nfl-data?type=roster&teamId=${teamId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setRoster(data.roster || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch roster');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoster();
  }, [teamId]);

  return { roster, loading, error, refreshRoster: fetchRoster };
}

export function useTeamStats(teamId: string) {
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    if (!teamId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/nfl-data?type=stats&teamId=${teamId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setStats(data.stats || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [teamId]);

  return { stats, loading, error, refreshStats: fetchStats };
} 