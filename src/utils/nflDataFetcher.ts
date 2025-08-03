import { Team, Game, Week, Season } from '../types/nfl';

// NFL API endpoints and data sources
const NFL_API_BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';
const ESPN_API_BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';

interface ESPNTeam {
  id: string;
  name: string;
  abbreviation: string;
  location: string;
  nickname: string;
  color: string;
  alternateColor: string;
  logos: Array<{
    href: string;
    width: number;
    height: number;
    alt: string;
    rel: string[];
  }>;
  record: {
    items: Array<{
      summary: string;
      stats: Array<{
        name: string;
        value: number;
      }>;
    }>;
  };
}

interface ESPNGame {
  id: string;
  name: string;
  shortName: string;
  date: string;
  status: {
    type: {
      id: string;
      name: string;
      state: string;
      completed: boolean;
    };
  };
  competitions: Array<{
    id: string;
    date: string;
    status: {
      type: {
        id: string;
        name: string;
        state: string;
        completed: boolean;
      };
    };
    venue?: {
      id: string;
      name: string;
      city: string;
      state: string;
      country: string;
    };
    competitors: Array<{
      id: string;
      homeAway: string;
      team: {
        id: string;
        name: string;
        abbreviation: string;
        location: string;
        nickname: string;
        color: string;
        logos: Array<{
          href: string;
        }>;
      };
      score: string;
    }>;
  }>;
}

export class NFLDataFetcher {
  private static instance: NFLDataFetcher;
  private cache: Map<string, any> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static getInstance(): NFLDataFetcher {
    if (!NFLDataFetcher.instance) {
      NFLDataFetcher.instance = new NFLDataFetcher();
    }
    return NFLDataFetcher.instance;
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

  async fetchTeams(): Promise<Team[]> {
    try {
      const data = await this.fetchWithCache<any>(
        `${ESPN_API_BASE}/teams`,
        'teams'
      );

      const teams: Team[] = [];
      
      // ESPN API returns teams in sports -> teams -> items
      const teamsData = data.sports?.[0]?.leagues?.[0]?.teams || [];
      
      for (const teamData of teamsData) {
        const team = teamData.team as ESPNTeam;
        
        // Map ESPN conference/division to our format
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
      console.error('Error fetching teams:', error);
      // Fallback to static data
      return this.getFallbackTeams();
    }
  }

  async fetchSchedule(year: string = '2025'): Promise<Game[]> {
    try {
      const data = await this.fetchWithCache<any>(
        `${ESPN_API_BASE}/scoreboard?year=${year}`,
        `schedule-${year}`
      );

      const games: Game[] = [];
      
      // ESPN API returns events in events array
      const events = data.events || [];
      
      for (const event of events) {
        const game = event as ESPNGame;
        const competition = game.competitions?.[0];
        
        if (competition) {
          const awayTeam = competition.competitors?.find(c => c.homeAway === 'away');
          const homeTeam = competition.competitors?.find(c => c.homeAway === 'home');
          
          if (awayTeam && homeTeam) {
            const gameDate = new Date(competition.date);
            const week = this.calculateWeek(gameDate, year);
            
            // Extract venue information for international games
            let venue: string | undefined;
            if (competition.venue) {
              const venueData = competition.venue;
              if (venueData.country !== 'USA') {
                // International game - create venue string
                venue = `${venueData.city}, ${venueData.country}`;
              }
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
      console.error('Error fetching schedule:', error);
      // Fallback to static data
      return this.getFallbackGames();
    }
  }

  async fetchRoster(teamId: string): Promise<any[]> {
    try {
      const data = await this.fetchWithCache<any>(
        `${ESPN_API_BASE}/teams/${teamId}/roster`,
        `roster-${teamId}`
      );

      return data.athletes || [];
    } catch (error) {
      console.error(`Error fetching roster for team ${teamId}:`, error);
      return [];
    }
  }

  async fetchTeamStats(teamId: string): Promise<any> {
    try {
      const data = await this.fetchWithCache<any>(
        `${ESPN_API_BASE}/teams/${teamId}/stats`,
        `stats-${teamId}`
      );

      return data.stats || {};
    } catch (error) {
      console.error(`Error fetching stats for team ${teamId}:`, error);
      return {};
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
    // Simple week calculation - in a real app, you'd want more sophisticated logic
    const seasonStart = new Date(`${year}-09-01`);
    const daysDiff = Math.floor((gameDate.getTime() - seasonStart.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.floor(daysDiff / 7) + 1);
  }

  private getFallbackTeams(): Team[] {
    // Return the static teams data as fallback
    return [
      // AFC Teams
      { id: 'ravens', name: 'Ravens', abbreviation: 'BAL', conference: 'AFC', division: 'North', logo: '/logos/ravens.png' },
      { id: 'browns', name: 'Browns', abbreviation: 'CLE', conference: 'AFC', division: 'North', logo: '/logos/browns.png' },
      { id: 'bengals', name: 'Bengals', abbreviation: 'CIN', conference: 'AFC', division: 'North', logo: '/logos/bengals.png' },
      { id: 'steelers', name: 'Steelers', abbreviation: 'PIT', conference: 'AFC', division: 'North', logo: '/logos/steelers.png' },
      // ... add all teams
    ];
  }

  private getFallbackGames(): Game[] {
    // Return the static games data as fallback with some international games
    return [
      { id: '1', week: 1, awayTeam: 'texans', homeTeam: 'chargers', day: 'Fri', date: '2025-09-05', isPlayed: false },
      { id: '2', week: 1, awayTeam: 'jets', homeTeam: 'dolphins', day: 'Sun', date: '2025-09-07', isPlayed: false },
      { id: '3', week: 4, awayTeam: 'jaguars', homeTeam: 'patriots', day: 'Sun', date: '2025-09-28', isPlayed: false, venue: 'London, England' },
      { id: '4', week: 5, awayTeam: 'bears', homeTeam: 'vikings', day: 'Sun', date: '2025-10-05', isPlayed: false, venue: 'Munich, Germany' },
      { id: '5', week: 7, awayTeam: 'cardinals', homeTeam: 'rams', day: 'Sun', date: '2025-10-19', isPlayed: false, venue: 'Mexico City, Mexico' },
      // ... add all games
    ];
  }

  async refreshCache(): Promise<void> {
    this.cache.clear();
    this.cacheExpiry.clear();
  }
}

export const nflDataFetcher = NFLDataFetcher.getInstance(); 