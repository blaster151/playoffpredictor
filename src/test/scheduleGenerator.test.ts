import { describe, it, expect, beforeEach } from 'vitest';
import { teams } from '../data/nflData';
import { loadLocalScheduleStructured } from '../utils/localDataLoader';
import { validateMatchups } from '../utils/scheduleGenerator';

describe('Schedule Generator', () => {
  describe('Static Data Structure', () => {
    it('should load week 1 with all 32 teams playing', async () => {
      const schedule = await loadLocalScheduleStructured('2025');
      
      // Check that week 1 exists and has games
      expect(schedule.weeks[1]).toBeDefined();
      expect(schedule.weeks[1].games).toBeDefined();
      
      // Week 1 should have 16 games (32 teams playing)
      expect(schedule.weeks[1].games.length).toBe(16);
      
      // All teams should be playing in week 1
      const week1Teams = new Set<string>();
      schedule.weeks[1].games.forEach(game => {
        week1Teams.add(game.homeTeam);
        week1Teams.add(game.awayTeam);
      });
      
      expect(week1Teams.size).toBe(32);
      expect(week1Teams).toEqual(new Set(teams.map(team => team.id)));
    });

    it('should have proper week structure for all 18 weeks', async () => {
      const schedule = await loadLocalScheduleStructured('2025');
      
      // Should have weeks 1-18
      for (let week = 1; week <= 18; week++) {
        expect(schedule.weeks[week]).toBeDefined();
        expect(schedule.weeks[week].games).toBeDefined();
      }
      
      // Only week 1 should have games
      expect(schedule.weeks[1].games.length).toBe(16);
      for (let week = 2; week <= 18; week++) {
        expect(schedule.weeks[week].games.length).toBe(0);
      }
    });

    it('should have valid game structure', async () => {
      const schedule = await loadLocalScheduleStructured('2025');
      
      schedule.weeks[1].games.forEach(game => {
        expect(game.id).toBeDefined();
        expect(game.homeTeam).toBeDefined();
        expect(game.awayTeam).toBeDefined();
        expect(game.homeTeam).not.toBe(game.awayTeam);
        
        // Verify teams exist in our team list
        const homeTeam = teams.find(t => t.id === game.homeTeam);
        const awayTeam = teams.find(t => t.id === game.awayTeam);
        expect(homeTeam).toBeDefined();
        expect(awayTeam).toBeDefined();
      });
    });
  });

  describe('Bye Week Constraints', () => {
    it('should not have any bye weeks in week 1', async () => {
      const schedule = await loadLocalScheduleStructured('2025');
      
      // Get all teams playing in week 1
      const week1Teams = new Set<string>();
      schedule.weeks[1].games.forEach(game => {
        week1Teams.add(game.homeTeam);
        week1Teams.add(game.awayTeam);
      });
      
      // All 32 teams should be playing
      expect(week1Teams.size).toBe(32);
      
      // Check that no team is missing
      teams.forEach(team => {
        expect(week1Teams.has(team.id)).toBe(true);
      });
    });

    it('should have exactly 16 games in week 1', async () => {
      const schedule = await loadLocalScheduleStructured('2025');
      expect(schedule.weeks[1].games.length).toBe(16);
    });

    it('should not have duplicate matchups in week 1', async () => {
      const schedule = await loadLocalScheduleStructured('2025');
      const matchups = new Set<string>();
      
      schedule.weeks[1].games.forEach(game => {
        const matchup1 = `${game.homeTeam}-${game.awayTeam}`;
        const matchup2 = `${game.awayTeam}-${game.homeTeam}`;
        
        expect(matchups.has(matchup1)).toBe(false);
        expect(matchups.has(matchup2)).toBe(false);
        
        matchups.add(matchup1);
        matchups.add(matchup2);
      });
    });
  });

  describe('Schedule Validation', () => {
    it('should pass validation for week 1 games', async () => {
      const schedule = await loadLocalScheduleStructured('2025');
      
      // Convert to matchup format for validation
      const matchups = schedule.weeks[1].games.map(game => ({
        home: game.homeTeam,
        away: game.awayTeam
      }));
      
      const validation = validateMatchups(matchups, teams);
      
      // For week 1 only, we expect 1 game per team, not 17
      // The validation function is designed for full season schedules
      // So we'll check the specific stats we care about for week 1
      
      // Should have 16 total games
      expect(validation.stats.totalGames).toBe(16);
      
      // Each team should have exactly 1 game in week 1
      teams.forEach(team => {
        expect(validation.stats.gamesPerTeam[team.id]).toBe(1);
      });
      
      // Should not have duplicate matchups
      expect(validation.errors.filter(e => e.includes('Duplicate matchup'))).toHaveLength(0);
      
      // Should not have invalid team references
      expect(validation.errors.filter(e => e.includes('not found'))).toHaveLength(0);
    });
  });

  describe('Data Consistency', () => {
    it('should have consistent team references', async () => {
      const schedule = await loadLocalScheduleStructured('2025');
      
      // All team IDs in games should exist in teams array
      const teamIds = new Set(teams.map(t => t.id));
      
      schedule.weeks[1].games.forEach(game => {
        expect(teamIds.has(game.homeTeam)).toBe(true);
        expect(teamIds.has(game.awayTeam)).toBe(true);
      });
    });

    it('should have proper conference and division distribution', async () => {
      const schedule = await loadLocalScheduleStructured('2025');
      
      // Count teams by conference
      const afcTeams = teams.filter(t => t.conference === 'AFC');
      const nfcTeams = teams.filter(t => t.conference === 'NFC');
      
      expect(afcTeams.length).toBe(16);
      expect(nfcTeams.length).toBe(16);
      
      // Count teams playing in week 1 by conference
      const week1AfcTeams = new Set<string>();
      const week1NfcTeams = new Set<string>();
      
      schedule.weeks[1].games.forEach(game => {
        const homeTeam = teams.find(t => t.id === game.homeTeam)!;
        const awayTeam = teams.find(t => t.id === game.awayTeam)!;
        
        if (homeTeam.conference === 'AFC') {
          week1AfcTeams.add(game.homeTeam);
        } else {
          week1NfcTeams.add(game.homeTeam);
        }
        
        if (awayTeam.conference === 'AFC') {
          week1AfcTeams.add(game.awayTeam);
        } else {
          week1NfcTeams.add(game.awayTeam);
        }
      });
      
      expect(week1AfcTeams.size).toBe(16);
      expect(week1NfcTeams.size).toBe(16);
    });
  });

  describe('Schedule Generator Integration', () => {
    it('should not use schedule generator for static data', async () => {
      const schedule = await loadLocalScheduleStructured('2025');
      
      // The static data should not be generated by the schedule generator
      // It should come from the static week1Games
      expect(schedule.weeks[1].games.length).toBe(16);
      
      // Check that we're using the actual static data
      const { week1Games } = await import('../data/nflData');
      expect(schedule.weeks[1].games.length).toBe(week1Games.length);
      
      // Verify the games match the static data
      const staticGameIds = week1Games.map(g => g.id).sort();
      const loadedGameIds = schedule.weeks[1].games.map(g => g.id).sort();
      expect(loadedGameIds).toEqual(staticGameIds);
    });

    it('should have correct team distribution in week 1', async () => {
      const schedule = await loadLocalScheduleStructured('2025');
      
      // Count teams by conference
      const afcTeams = new Set<string>();
      const nfcTeams = new Set<string>();
      
      schedule.weeks[1].games.forEach(game => {
        const homeTeam = teams.find(t => t.id === game.homeTeam)!;
        const awayTeam = teams.find(t => t.id === game.awayTeam)!;
        
        if (homeTeam.conference === 'AFC') {
          afcTeams.add(game.homeTeam);
        } else {
          nfcTeams.add(game.homeTeam);
        }
        
        if (awayTeam.conference === 'AFC') {
          afcTeams.add(game.awayTeam);
        } else {
          nfcTeams.add(game.awayTeam);
        }
      });
      
      // Should have 16 AFC teams and 16 NFC teams
      expect(afcTeams.size).toBe(16);
      expect(nfcTeams.size).toBe(16);
      
      // All teams should be playing
      expect(afcTeams.size + nfcTeams.size).toBe(32);
    });
  });
});
