import { Team, Game } from '../types/nfl';

// Try to load generated data, fall back to static data
export async function loadLocalTeams(): Promise<Team[]> {
  // For now, skip trying to load generated data to avoid build issues
  // Fallback to static data
  const { teams } = await import('../data/nflData');
  return teams;
}

export async function loadLocalSchedule(year: string = '2025'): Promise<Game[]> {
  // For now, skip trying to load generated data to avoid build issues
  // Fallback to static data
  const { week1Games } = await import('../data/nflData');
  return week1Games;
}

export async function loadLocalRoster(teamId: string): Promise<any[]> {
  // For now, skip trying to load generated data to avoid build issues
  return [];
}

export async function loadLocalTeamStats(teamId: string): Promise<any> {
  // For now, skip trying to load generated data to avoid build issues
  return {};
}

// Check if local data exists
export async function hasLocalData(): Promise<{
  teams: boolean;
  schedule2024: boolean;
  schedule2025: boolean;
}> {
  // For now, just return false to avoid import issues
  // The individual loaders will handle missing files gracefully
  return {
    teams: false,
    schedule2024: false,
    schedule2025: false,
  };
}

// Get data freshness info
export async function getDataInfo(): Promise<{
  hasLocalData: boolean;
  lastUpdated?: string;
  dataSources: string[];
}> {
  const localData = await hasLocalData();
  const hasAnyLocalData = Object.values(localData).some(Boolean);
  
  let lastUpdated: string | undefined;
  let dataSources: string[] = [];

  if (hasAnyLocalData && typeof window === 'undefined') {
    try {
      // Try to get file stats for last updated info (server-side only)
      const fs = require('fs');
      const path = require('path');
      const teamsPath = path.join(process.cwd(), 'src', 'data', 'generated', 'teams.json');
      
      if (fs.existsSync(teamsPath)) {
        const stats = fs.statSync(teamsPath);
        lastUpdated = stats.mtime.toISOString();
      }
    } catch (error) {
      // Can't get file stats
    }
    
    dataSources.push('Local JSON files');
  }

  if (!hasAnyLocalData) {
    dataSources.push('Static fallback data');
  }

  return {
    hasLocalData: hasAnyLocalData,
    lastUpdated,
    dataSources,
  };
} 