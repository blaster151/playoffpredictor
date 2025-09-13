import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useNFLData } from '../hooks/useNFLData';
import { teams } from '../data/nflData';

describe('useNFLData Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Schedule Loading', () => {
    it('should load static schedule with proper structure', async () => {
      const { result } = renderHook(() => useNFLData({ autoRefresh: false }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should have teams
      expect(result.current.teams).toHaveLength(32);
      expect(result.current.teams).toEqual(teams);

      // Should have schedule
      expect(result.current.schedule).toBeDefined();
      expect(result.current.schedule).not.toBeNull();

      if (result.current.schedule) {
        // Should have week 1 with games
        expect(result.current.schedule.weeks[1]).toBeDefined();
        expect(result.current.schedule.weeks[1].games).toHaveLength(16);

        // Should have all 18 weeks
        for (let week = 1; week <= 18; week++) {
          expect(result.current.schedule.weeks[week]).toBeDefined();
        }

        // Only week 1 should have games
        expect(result.current.schedule.weeks[1].games).toHaveLength(16);
        for (let week = 2; week <= 18; week++) {
          expect(result.current.schedule.weeks[week].games).toHaveLength(0);
        }
      }
    });

    it('should have all 32 teams playing in week 1', async () => {
      const { result } = renderHook(() => useNFLData({ autoRefresh: false }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.schedule).toBeDefined();
      });

      if (result.current.schedule) {
        const week1Teams = new Set<string>();
        result.current.schedule.weeks[1].games.forEach(game => {
          week1Teams.add(game.homeTeam);
          week1Teams.add(game.awayTeam);
        });

        expect(week1Teams.size).toBe(32);
        
        // All teams should be playing
        teams.forEach(team => {
          expect(week1Teams.has(team.id)).toBe(true);
        });
      }
    });

    it('should return proper SavedSchedule structure', async () => {
      const { result } = renderHook(() => useNFLData({ autoRefresh: false }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.schedule).toBeDefined();
      });

      if (result.current.schedule) {
        // Check SavedSchedule structure
        expect(result.current.schedule.id).toBeDefined();
        expect(result.current.schedule.name).toBeDefined();
        expect(result.current.schedule.createdAt).toBeDefined();
        expect(result.current.schedule.updatedAt).toBeDefined();
        expect(result.current.schedule.season).toBe(2025);
        expect(result.current.schedule.weeks).toBeDefined();
        expect(result.current.schedule.metadata).toBeDefined();

        // Check metadata
        expect(result.current.schedule.metadata.totalGames).toBe(16);
        expect(result.current.schedule.metadata.totalWeeks).toBe(18);
        expect(result.current.schedule.metadata.teams).toHaveLength(32);
        expect(result.current.schedule.metadata.generatedBy).toBe('import');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully', async () => {
      // Mock fetch to fail
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useNFLData({ autoRefresh: false }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should still have teams (from static data)
      expect(result.current.teams).toHaveLength(32);
      
      // Should have error
      expect(result.current.error).toBeDefined();
    });
  });

  describe('Data Consistency', () => {
    it('should maintain consistent data between games and schedule', async () => {
      const { result } = renderHook(() => useNFLData({ autoRefresh: false }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.schedule).toBeDefined();
      });

      // Games array should match week 1 games from schedule
      expect(result.current.games).toHaveLength(16);
      
      if (result.current.schedule) {
        const week1Games = result.current.schedule.weeks[1].games;
        expect(result.current.games).toHaveLength(week1Games.length);

        // Game IDs should match
        const gameIds = result.current.games.map(g => g.id).sort();
        const week1GameIds = week1Games.map(g => g.id).sort();
        expect(gameIds).toEqual(week1GameIds);
      }
    });
  });

  describe('Static Generation Compatibility', () => {
    it.skip('should work during static generation', async () => {
      // Skip this test since testing library requires window
      // The actual fix is in the useState initializers
    });
  });
});
