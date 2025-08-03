import { useState, useEffect } from 'react';
import { Team, Game } from '../types/nfl';
import { loadLocalTeams, loadLocalSchedule, getDataInfo } from '../utils/localDataLoader';

interface UseNFLDataOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseNFLDataReturn {
  teams: Team[];
  games: Game[];
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  refreshTeams: () => Promise<void>;
  refreshSchedule: () => Promise<void>;
}

export function useNFLData(options: UseNFLDataOptions = {}): UseNFLDataReturn {
  const { autoRefresh = true, refreshInterval = 300000 } = options; // 5 minutes default
  
  const [teams, setTeams] = useState<Team[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeams = async (): Promise<Team[]> => {
    try {
      // Try local data first, then API as fallback
      const localTeams = await loadLocalTeams();
      if (localTeams.length > 0) {
        return localTeams;
      }
      
      // Fallback to API
      const response = await fetch('/api/nfl-data?type=teams');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.teams || [];
    } catch (err) {
      console.error('Error fetching teams:', err);
      throw err;
    }
  };

  const fetchSchedule = async (year: string = '2025'): Promise<Game[]> => {
    try {
      // Try local data first, then API as fallback
      const localSchedule = await loadLocalSchedule(year);
      if (localSchedule.length > 0) {
        return localSchedule;
      }
      
      // Fallback to API
      const response = await fetch(`/api/nfl-data?type=schedule&year=${year}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.schedule || [];
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
      setGames(scheduleData);
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
      setGames(scheduleData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

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