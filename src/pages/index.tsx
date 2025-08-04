import { useState, useEffect } from 'react';
import Head from 'next/head';
import { teams as fallbackTeams, week1Games as fallbackGames } from '../data/nflData';
import { calculateStandings } from '../utils/standingsCalculator';
import { Game, TeamStanding, Team } from '../types/nfl';
import WeekNavigation from '../components/WeekNavigation';
import StandingsPanel from '../components/StandingsPanel';
import GamePredictions from '../components/GamePredictions';
import NavigationBar from '../components/NavigationBar';
import ScheduleManager from '../components/ScheduleManager';
import WelcomeModal from '../components/WelcomeModal';
import AutoSaveIndicator from '../components/AutoSaveIndicator';
import { useNFLData } from '../hooks/useNFLData';
import { SavedSchedule, ScheduleSaver } from '../utils/scheduleSaver';
import { generateMatchups, createScheduleConfig } from '../utils/scheduleGenerator';
import { initializeGLPK, createGLPKScheduleSolver } from '../utils/glpkSolver';
import { dataManager } from '../utils/dataManager';
import DataStatus from '../components/DataStatus';
import { GameResolver } from '../utils/gameResolver';
import { generatePlayoffBrackets, getPlayoffWeekName, isPlayoffWeek, getEliminatedTeams, isRegularSeasonComplete, getPlayoffStatusMessage } from '../utils/playoffBracketGenerator';

export default function Home() {
  const [currentWeek, setCurrentWeek] = useState(1);
  const [standingsViewMode, setStandingsViewMode] = useState<'conference' | 'division'>('division');
  const [selectedSchedule, setSelectedSchedule] = useState<SavedSchedule | null>(null);
  // Removed mainViewMode state - always show standings view
  const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showAutoSaveIndicator, setShowAutoSaveIndicator] = useState(false);
  
  // Use live NFL data with fallback to static data
  const { teams, games, loading, error, refreshData } = useNFLData({
    autoRefresh: true,
    refreshInterval: 300000, // 5 minutes
  });
  
  const [standings, setStandings] = useState<TeamStanding[]>([]);

  // Initialize DataManager and load the most recent saved schedule on app start
  useEffect(() => {
    // Initialize the data manager with backup protection
    dataManager.initialize();
    
    const savedSchedules = ScheduleSaver.loadAllSchedules();
    if (savedSchedules.length > 0) {
      // Load the most recently updated schedule
      const mostRecent = savedSchedules.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )[0];
      setSelectedSchedule(mostRecent);
      console.log(`📂 Loaded saved schedule: ${mostRecent.name} (${mostRecent.metadata.totalGames} games)`);
    } else {
      // Show welcome modal for first-time users
      setShowWelcomeModal(true);
    }

    // Listen for auto-save events
    const handleAutoSave = (data: any) => {
      console.log('💾 Auto-save triggered:', data);
      setShowAutoSaveIndicator(true);
    };

    dataManager.on('autoSave', handleAutoSave);
    
    // Cleanup on unmount
    return () => {
      dataManager.off('autoSave', handleAutoSave);
      dataManager.destroy();
    };
  }, []);

  useEffect(() => {
    const currentTeams = teams.length > 0 ? teams : fallbackTeams;
    
    // Use schedule data if available, otherwise fallback to live data
    let currentGames = games.length > 0 ? games : fallbackGames;
    
    if (selectedSchedule) {
      // Collect all games from the schedule up to the current week
      const scheduleGames: Game[] = [];
      for (let week = 1; week <= currentWeek; week++) {
        const weekGames = selectedSchedule.weeks[week]?.games || [];
        weekGames.forEach(game => {
          if (game.isPlayed && game.homeScore !== undefined && game.awayScore !== undefined) {
            scheduleGames.push({
              id: game.id,
              homeTeam: game.homeTeam,
              awayTeam: game.awayTeam,
              homeScore: game.homeScore,
              awayScore: game.awayScore,
              week: week,
              day: 'Sunday',
              date: `Week ${week}`,
              isPlayed: true
            });
          }
        });
      }
      currentGames = scheduleGames;
    }
    
    const calculatedStandings = calculateStandings(currentTeams, currentGames);
    setStandings(calculatedStandings);
  }, [teams, games, selectedSchedule, currentWeek]);

  const handleGameUpdate = (gameId: string, awayScore: number, homeScore: number) => {
    console.log('Game update:', { gameId, awayScore, homeScore });
    
    if (selectedSchedule) {
      // Update the schedule with the new scores
      const updatedSchedule = { ...selectedSchedule };
      
      // Find and update the game in the schedule
      Object.values(updatedSchedule.weeks).forEach((week: any) => {
        const gameIndex = week.games.findIndex((g: any) => g.id === gameId);
        
        if (gameIndex !== -1) {
          const game = week.games[gameIndex];
          game.homeScore = homeScore;
          game.awayScore = awayScore;
          
          // Mark as played if scores are set
          if (homeScore !== undefined && awayScore !== undefined) {
            game.isPlayed = true;
          }
          
          console.log(`📊 Updated game ${gameId}: ${game.awayTeam} ${awayScore} - ${homeScore} ${game.homeTeam}`);
        }
      });
      
      // Update the specific game's scores in localStorage with debounced save
      ScheduleSaver.updateGameScore(updatedSchedule.id, gameId, homeScore, awayScore).catch(error => {
        console.error('Failed to save game score:', error);
      });
      
      // Force a re-render by creating a new object reference
      setSelectedSchedule({ ...updatedSchedule });
      
      // Immediately recalculate standings with updated games
      const currentTeams = teams.length > 0 ? teams : fallbackTeams;
      const allGames = Object.values(updatedSchedule.weeks).flatMap((week: any) => 
        week.games.map((game: any) => ({
          id: game.id,
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          homeScore: game.homeScore,
          awayScore: game.awayScore,
          week: parseInt(week.weekNumber.toString()),
          date: `Week ${week.weekNumber}`,
          time: 'TBD',
          status: game.isPlayed ? 'final' : 'scheduled'
        }))
      );
      
      const updatedStandings = calculateStandings(currentTeams, allGames);
      setStandings(updatedStandings);
      
      // Debug: Show some team records
      const awayTeam = allGames.find(g => g.id === gameId)?.awayTeam;
      const homeTeam = allGames.find(g => g.id === gameId)?.homeTeam;
      const awayTeamStanding = updatedStandings.find(s => s.team.id === awayTeam);
      const homeTeamStanding = updatedStandings.find(s => s.team.id === homeTeam);
      
      console.log(`🏆 Standings updated! ${awayScore > homeScore ? 'Away team wins' : homeScore > awayScore ? 'Home team wins' : 'Tie game'}`);
      console.log(`📊 All games count: ${allGames.length}, Games with scores: ${allGames.filter(g => g.homeScore !== undefined && g.awayScore !== undefined).length}`);
      console.log(`👥 ${awayTeam}: ${awayTeamStanding?.record.wins}W-${awayTeamStanding?.record.losses}L-${awayTeamStanding?.record.ties}T`);
      console.log(`👥 ${homeTeam}: ${homeTeamStanding?.record.wins}W-${homeTeamStanding?.record.losses}L-${homeTeamStanding?.record.ties}T`);
      console.log(`💾 Game scores saved to localStorage automatically!`);
    }
  };

  const handleWeekChange = (week: number) => {
    setCurrentWeek(week);
    // Week change will automatically update the displayed games via useEffect
  };

  // Get games for the current week from selected schedule
  const getCurrentWeekGames = (): Game[] => {
    if (!selectedSchedule) {
      return games; // Fallback to live data
    }
    
    // Check if this is a playoff week
    if (isPlayoffWeek(currentWeek)) {
      // Generate playoff brackets based on current standings
      const playoffBrackets = generatePlayoffBrackets(standings, currentWeek);
      
      switch (currentWeek) {
        case 19:
          return playoffBrackets.wildCard.map(game => ({
            ...game,
            homeScore: game.homeScore !== undefined ? game.homeScore : 10,
            awayScore: game.awayScore !== undefined ? game.awayScore : 10,
          }));
        case 20:
          return playoffBrackets.divisional.map(game => ({
            ...game,
            homeScore: game.homeScore !== undefined ? game.homeScore : 10,
            awayScore: game.awayScore !== undefined ? game.awayScore : 10,
          }));
        case 21:
          return playoffBrackets.conferenceChampionships.map(game => ({
            ...game,
            homeScore: game.homeScore !== undefined ? game.homeScore : 10,
            awayScore: game.awayScore !== undefined ? game.awayScore : 10,
          }));
        case 22:
          return playoffBrackets.superBowl.map(game => ({
            ...game,
            homeScore: game.homeScore !== undefined ? game.homeScore : 10,
            awayScore: game.awayScore !== undefined ? game.awayScore : 10,
          }));
        default:
          return [];
      }
    }
    
    // Regular season week
    const weekGames = selectedSchedule.weeks[currentWeek]?.games || [];
    console.log(`📅 Week ${currentWeek}: ${weekGames.length} games`);
    
    return weekGames.map(game => ({
      id: game.id,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      homeScore: game.homeScore !== undefined ? game.homeScore : 10,
      awayScore: game.awayScore !== undefined ? game.awayScore : 10,
      week: currentWeek,
      day: 'Sunday',
      date: `Week ${currentWeek}`,
      isPlayed: game.isPlayed || false
    }));
  };

  const handleSubmitWeek = () => {
    // Save predictions to pool
    console.log('Submitting week predictions:', games);
  };

  const handleViewPools = () => {
    // Navigate to pools view
    console.log('Viewing pools');
  };

  const handleResolveUnresolvedGames = () => {
    if (!selectedSchedule) return;

    const currentWeekGames = selectedSchedule.weeks[currentWeek]?.games || [];
    
    // Check if there are unresolved games
    if (!GameResolver.hasUnresolvedGames(currentWeekGames)) {
      console.log('No unresolved games to resolve');
      return;
    }

    console.log('🎲 Resolving unresolved games for Week', currentWeek);
    
    // Resolve games based on current standings
    const resolvedGames = GameResolver.resolveWeekGames(
      currentWeekGames.map(game => ({
        id: game.id,
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        homeScore: game.homeScore,
        awayScore: game.awayScore,
      })),
      standings,
      currentWeek
    );

    // Update the schedule with resolved games
    const updatedSchedule = { ...selectedSchedule };
    
    resolvedGames.forEach(resolution => {
      // Find and update the game in the schedule
      Object.values(updatedSchedule.weeks).forEach((week: any) => {
        const gameIndex = week.games.findIndex((g: any) => g.id === resolution.gameId);
        
        if (gameIndex !== -1) {
          const game = week.games[gameIndex];
          game.homeScore = resolution.homeScore;
          game.awayScore = resolution.awayScore;
          game.isPlayed = true;
          
          console.log(`🎯 Resolved: ${game.awayTeam} ${resolution.awayScore} - ${resolution.homeScore} ${game.homeTeam} (confidence: ${Math.round(resolution.confidence * 100)}%)`);
        }
      });
    });

    // Save the updated schedule
    ScheduleSaver.updateGameScore(updatedSchedule.id, 'dummy', 0, 0).catch(error => {
      console.error('Failed to save resolved games:', error);
    });

    // Update the UI
    setSelectedSchedule(updatedSchedule);
    
    // Recalculate standings
    const currentTeams = teams.length > 0 ? teams : fallbackTeams;
    const allGames = Object.values(updatedSchedule.weeks).flatMap((week: any) => 
      week.games.map((game: any) => ({
        id: game.id,
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        homeScore: game.homeScore,
        awayScore: game.awayScore,
        week: parseInt(week.weekNumber.toString()),
        date: `Week ${week.weekNumber}`,
        time: 'TBD',
        status: game.isPlayed ? 'final' : 'scheduled'
      }))
    );
    
    const updatedStandings = calculateStandings(currentTeams, allGames);
    setStandings(updatedStandings);
    
    console.log(`✅ Resolved ${resolvedGames.length} games for Week ${currentWeek}`);
  };

  const handleScheduleSelect = (schedule: SavedSchedule | null) => {
    if (schedule) {
      console.log(`📋 Selected schedule: ${schedule.name} (${schedule.metadata.totalGames} games, ${schedule.metadata.totalWeeks} weeks)`);
    }
    setSelectedSchedule(schedule);
  };



  const handleRegenerateSchedule = async () => {
    if (isGeneratingSchedule) return; // Prevent multiple calls
    
    setIsGeneratingSchedule(true);
    console.log('🔄 Starting full NFL schedule generation with GLPK solver...');
    
    try {
      // Use the full NFL schedule generator with GLPK solver
      const currentTeams = teams.length > 0 ? teams : fallbackTeams;
      const fullScheduleGames = await generateFullNFLScheduleWithGLPK(currentTeams);
      
      const newSchedule = await ScheduleSaver.saveSchedule(fullScheduleGames, currentTeams, {
        name: `Full NFL Schedule - ${new Date().toLocaleString()}`,
        description: 'Generated using GLPK solver with proper NFL constraints and bye week logic',
        season: 2025,
        generatedBy: 'GLPK',
      });
      
      setSelectedSchedule(newSchedule);
      setShowWelcomeModal(false); // Close welcome modal after successful generation
      console.log('✅ Full NFL schedule generated successfully with GLPK!');
      
      // Navigate to Week 1 if user is not already there
      if (currentWeek !== 1) {
        setCurrentWeek(1);
        console.log('📅 Navigated to Week 1 after schedule regeneration');
      }
      
    } catch (error) {
      console.error('❌ Schedule generation failed:', error);
      alert('Schedule generation failed. Please try again.');
    } finally {
      setIsGeneratingSchedule(false);
    }
  };

  const handleWelcomeModalClose = () => {
    setShowWelcomeModal(false);
  };

  const generateFullNFLScheduleWithGLPK = async (teams: Team[]) => {
    console.log('🧮 Initializing GLPK solver...');
    
    try {
      // Initialize GLPK
      const glpk = await initializeGLPK();
      console.log('✅ GLPK initialized successfully');
      
      // Create GLPK solver with proper NFL constraints
      const solver = createGLPKScheduleSolver(teams, 18, {
        maxGamesPerWeek: 16,
        maxTeamsOnBye: 6,
        byeWeekRange: { start: 5, end: 14 },
        noByeWeek: 13
      });
      
      console.log('🔧 Solving with GLPK constraints...');
      const solution = solver.solve();
      
      if (solution.status === 'optimal') {
        console.log(`✅ GLPK solved successfully! ${solution.games.length} games scheduled`);
        console.log(`📊 Solve time: ${solution.solveTime}ms`);
        console.log(`📊 Objective value: ${solution.objectiveValue}`);
        console.log(`📊 Constraints satisfied:`, solution.constraints.map(c => `${c.description} (weight: ${c.weight})`));
        
        // Convert GLPK solution to our format
        const games = solution.games.map(game => ({
          week: game.week,
          home: game.homeTeam,
          away: game.awayTeam,
        }));
        
        return games;
      } else {
        console.warn(`⚠️ GLPK solver returned status: ${solution.status}`);
        console.log('🔄 Falling back to manual distribution...');
        return generateFullNFLSchedule(teams);
      }
      
    } catch (error) {
      console.error('❌ GLPK solver failed:', error);
      console.log('🔄 Falling back to manual distribution...');
      return generateFullNFLSchedule(teams);
    }
  };

  const generateFullNFLSchedule = (teams: Team[]) => {
    // Create mock prior year standings (all teams tied for 1st in their division)
    const priorYearStandings: { [teamId: string]: number } = {};
    teams.forEach(team => {
      priorYearStandings[team.id] = 1;
    });
    
    // Create schedule config for 2025 season
    const config = createScheduleConfig(teams, 2025, priorYearStandings);
    
    // Generate all matchups
    const matchups = generateMatchups(config);
    console.log(`🎯 Generated ${matchups.length} matchups`);
    
    // Convert matchups to weekly games with proper NFL scheduling
    const games: Array<{ week: number; home: string; away: string }> = [];
    
    // Track which teams are playing in each week to avoid conflicts
    const teamsInWeek: { [week: number]: Set<string> } = {};
    const teamGamesCount: { [teamId: string]: number } = {};
    
    // Initialize team game counts
    teams.forEach(team => {
      teamGamesCount[team.id] = 0;
    });
    
    // Sort matchups with randomization to prevent predictable Week 1 games
    const sortedMatchups = [...matchups].sort((a, b) => {
      const aHomeDiv = teams.find(t => t.id === a.home)?.division;
      const aAwayDiv = teams.find(t => t.id === a.away)?.division;
      const bHomeDiv = teams.find(t => t.id === b.home)?.division;
      const bAwayDiv = teams.find(t => t.id === b.away)?.division;
      
      const aIsDivision = aHomeDiv === aAwayDiv;
      const bIsDivision = bHomeDiv === bAwayDiv;
      
      // Add randomization factor to prevent same teams always appearing first
      const aRandom = (a.home.charCodeAt(0) + a.away.charCodeAt(0) + Date.now()) % 100;
      const bRandom = (b.home.charCodeAt(0) + b.away.charCodeAt(0) + Date.now()) % 100;
      
      if (aIsDivision && !bIsDivision) return -1;
      if (!aIsDivision && bIsDivision) return 1;
      
      // Use randomization as tiebreaker
      return aRandom - bRandom;
    });
    
    console.log(`📊 Distributing ${sortedMatchups.length} games across 18 weeks`);
    
    // Calculate target games per week (272 total games / 18 weeks = ~15.1 games per week)
    const targetGamesPerWeek = Math.ceil(sortedMatchups.length / 18);
    console.log(`🎯 Target: ${targetGamesPerWeek} games per week`);
    
    sortedMatchups.forEach((matchup, index) => {
      // Find the best week for this matchup
      let bestWeek = 1;
      let bestScore = -1;
      
      for (let week = 1; week <= 18; week++) {
        if (!teamsInWeek[week]) {
          teamsInWeek[week] = new Set();
        }
        
        // Check if either team is already playing this week
        if (teamsInWeek[week].has(matchup.home) || teamsInWeek[week].has(matchup.away)) {
          continue;
        }
        
        // Check if teams have already played 17 games
        if (teamGamesCount[matchup.home] >= 17 || teamGamesCount[matchup.away] >= 17) {
          continue;
        }
        
        // Check if these teams played in the previous week (avoid consecutive matchups)
        if (week > 1 && teamsInWeek[week - 1]) {
          if (teamsInWeek[week - 1].has(matchup.home) && teamsInWeek[week - 1].has(matchup.away)) {
            continue; // Skip if both teams played each other last week
          }
        }
        
        // Check if the reverse matchup was recently scheduled (avoid same teams playing too soon)
        const reverseMatchup = `${matchup.away}-${matchup.home}`;
        const recentWeeks = [week - 1, week - 2, week - 3]; // Check last 3 weeks
        let recentlyPlayed = false;
        
        for (const recentWeek of recentWeeks) {
          if (recentWeek > 0 && teamsInWeek[recentWeek]) {
            if (teamsInWeek[recentWeek].has(matchup.home) && teamsInWeek[recentWeek].has(matchup.away)) {
              recentlyPlayed = true;
              break;
            }
          }
        }
        
        if (recentlyPlayed) {
          continue; // Skip if these teams played recently
        }
        
        // Calculate score for this week
        const homeDiv = teams.find(t => t.id === matchup.home)?.division;
        const awayDiv = teams.find(t => t.id === matchup.away)?.division;
        const isDivision = homeDiv === awayDiv;
        const gamesThisWeek = teamsInWeek[week].size / 2;
        
        let score = 0;
        
        // Strongly prefer weeks that are under the target
        if (gamesThisWeek < targetGamesPerWeek) {
          score += 100; // Big bonus for under-target weeks
        } else if (gamesThisWeek >= targetGamesPerWeek + 2) {
          score -= 50; // Penalty for over-target weeks
        }
        
        // Prefer earlier weeks for division games
        if (isDivision) {
          score += (18 - week) * 2; // Earlier weeks get higher scores
        } else {
          score += (18 - week); // Non-division games also prefer earlier weeks
        }
        
        // Small preference for weeks with fewer games (within target range)
        score -= gamesThisWeek;
        
        if (score > bestScore) {
          bestScore = score;
          bestWeek = week;
        }
      }
      
      // If we found a valid week, schedule the game
      if (bestScore > -1) {
        teamsInWeek[bestWeek].add(matchup.home);
        teamsInWeek[bestWeek].add(matchup.away);
        teamGamesCount[matchup.home]++;
        teamGamesCount[matchup.away]++;
        
        games.push({
          week: bestWeek,
          home: matchup.home,
          away: matchup.away,
        });
      } else {
        console.warn(`⚠️ Could not schedule ${matchup.away} @ ${matchup.home}`);
      }
    });
    
    // Validate the schedule
    const gamesPerTeam = Object.values(teamGamesCount);
    const avgGames = gamesPerTeam.reduce((sum, count) => sum + count, 0) / gamesPerTeam.length;
    const teamsWith17Games = gamesPerTeam.filter(count => count === 17).length;
    
    // Show distribution across weeks
    const gamesPerWeek: { [week: number]: number } = {};
    for (let week = 1; week <= 18; week++) {
      gamesPerWeek[week] = teamsInWeek[week] ? teamsInWeek[week].size / 2 : 0;
    }
    
    console.log(`📊 Final: ${games.length} games across ${games.length > 0 ? Math.max(...games.map(g => g.week)) : 0} weeks`);
    console.log(`📊 Average games per team: ${avgGames.toFixed(1)}`);
    console.log(`📊 Teams with 17 games: ${teamsWith17Games}/${teams.length}`);
    console.log(`📊 Games per week:`, gamesPerWeek);
    
    return games;
  };



  const generateDivisionSchedule = (teams: Team[]) => {
    const games: Array<{ week: number; home: string; away: string }> = [];
    const divisions = new Map<string, Team[]>();
    
    // Group teams by division
    teams.forEach(team => {
      if (!divisions.has(team.division)) {
        divisions.set(team.division, []);
      }
      divisions.get(team.division)!.push(team);
    });
    
    // Generate division games (each team plays division opponents twice)
    let week = 1;
    const maxWeeks = 18; // NFL season has 18 weeks
    
    divisions.forEach((divisionTeams, divisionName) => {
      for (let i = 0; i < divisionTeams.length; i++) {
        for (let j = i + 1; j < divisionTeams.length; j++) {
          // Home game
          if (week <= maxWeeks) {
            games.push({
              week,
              home: divisionTeams[i].id,
              away: divisionTeams[j].id,
            });
            week++;
          }
          
          // Away game
          if (week <= maxWeeks) {
            games.push({
              week,
              home: divisionTeams[j].id,
              away: divisionTeams[i].id,
            });
            week++;
          }
        }
      }
    });
    
    console.log(`🔧 Generated ${games.length} division games across ${games.length > 0 ? Math.max(...games.map(g => g.week)) : 0} weeks`);
    return games;
  };

  return (
    <>
      <Head>
        <title>NFL Playoff Predictors</title>
        <meta name="description" content="Interactive NFL playoff predictor allowing users to manipulate game outcomes" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏈</text></svg>" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <NavigationBar />
        
        <div className="nfl-container">
          <WeekNavigation 
            currentWeek={currentWeek}
            onWeekChange={handleWeekChange}
            onUpdate={refreshData}
          />

          {/* Resolve Unresolved Games Button */}
          {selectedSchedule && (() => {
            const currentWeekGames = selectedSchedule.weeks[currentWeek]?.games || [];
            const unresolvedCount = GameResolver.countUnresolvedGames(currentWeekGames);
            
            if (unresolvedCount > 0) {
              return (
                <div className="mb-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">🎲</span>
                      <div>
                        <h3 className="font-semibold text-gray-800">
                          {unresolvedCount} Unresolved Game{unresolvedCount !== 1 ? 's' : ''} in Week {currentWeek}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Auto-resolve based on team records and current standings
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleResolveUnresolvedGames}
                      className="btn btn-primary bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105"
                    >
                      🎯 Resolve Games
                    </button>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          <div className="text-center mb-6">
            <div className="bg-gradient-to-r from-blue-600 to-red-600 text-white py-4 px-6 rounded-lg shadow-lg mb-4">
              <h1 className="text-4xl font-bold mb-2">
                🏈 NFL 2025-2026 SEASON
              </h1>
              <div className="text-lg opacity-90">
                Weekly Actions
              </div>
            </div>
            <div className="text-xl font-semibold text-gray-800 bg-white py-2 px-4 rounded-lg shadow-sm inline-block">
              {isPlayoffWeek(currentWeek) ? getPlayoffWeekName(currentWeek) : `Week ${currentWeek}`}: Sep 4th - Sep 8th
            </div>
            {selectedSchedule && (
              <div className="text-sm text-blue-600 mt-2">
                📅 Using schedule: {selectedSchedule.name}
              </div>
            )}
            {loading && (
              <div className="text-sm text-blue-600 mt-2">
                🔄 Loading live NFL data...
              </div>
            )}
            {error && (
              <div className="text-sm text-red-600 mt-2">
                ⚠️ {error} (using fallback data)
              </div>
            )}
            {/* Playoff status message */}
            {isPlayoffWeek(currentWeek) && (
              <div className="text-sm text-purple-600 mt-2 font-medium">
                🏆 {getPlayoffStatusMessage(currentWeek)}
              </div>
            )}
            <div className="mt-4 flex justify-center">
              <button
                onClick={handleRegenerateSchedule}
                disabled={isGeneratingSchedule}
                className={`btn transition-all duration-200 transform hover:scale-105 min-w-[200px] min-h-[44px] ${
                  isGeneratingSchedule 
                    ? 'btn-secondary opacity-50 cursor-not-allowed' 
                    : 'btn-primary bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600'
                }`}
              >
                {isGeneratingSchedule ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  '🔄 Regenerate Schedule'
                )}
              </button>
            </div>
          </div>

          {/* Main Content - Standings View */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* AFC Standings */}
            <StandingsPanel 
              title="AFC"
              standings={standings.filter(s => s.team.conference === 'AFC')}
              viewMode={standingsViewMode}
              onViewModeChange={setStandingsViewMode}
              eliminatedTeams={(() => {
                if (isPlayoffWeek(currentWeek)) {
                  const playoffBrackets = generatePlayoffBrackets(standings, currentWeek);
                  const allPlayoffGames = [
                    ...playoffBrackets.wildCard,
                    ...playoffBrackets.divisional,
                    ...playoffBrackets.conferenceChampionships,
                    ...playoffBrackets.superBowl
                  ];
                  return getEliminatedTeams(standings, currentWeek, allPlayoffGames);
                }
                return new Set<string>();
              })()}
            />

            {/* Game Predictions */}
            <div className="lg:col-span-1">
              <GamePredictions 
                games={getCurrentWeekGames()}
                onGameUpdate={handleGameUpdate}
                onSubmitWeek={handleSubmitWeek}
                onViewPools={handleViewPools}
              />
            </div>

            {/* NFC Standings */}
            <StandingsPanel 
              title="NFC"
              standings={standings.filter(s => s.team.conference === 'NFC')}
              viewMode={standingsViewMode}
              onViewModeChange={setStandingsViewMode}
              eliminatedTeams={(() => {
                if (isPlayoffWeek(currentWeek)) {
                  const playoffBrackets = generatePlayoffBrackets(standings, currentWeek);
                  const allPlayoffGames = [
                    ...playoffBrackets.wildCard,
                    ...playoffBrackets.divisional,
                    ...playoffBrackets.conferenceChampionships,
                    ...playoffBrackets.superBowl
                  ];
                  return getEliminatedTeams(standings, currentWeek, allPlayoffGames);
                }
                return new Set<string>();
              })()}
            />
          </div>

          {/* Teams on BYE */}
          <div className="mt-6 p-4 bg-white rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Teams on BYE - Week {currentWeek}</h3>
            {(() => {
              let weekGames: any[] = [];
              
              if (selectedSchedule) {
                // Use schedule data
                weekGames = selectedSchedule.weeks[currentWeek]?.games || [];
              } else {
                // Use live data for current week
                weekGames = games.filter(game => game.week === currentWeek);
              }
              
              const teamsPlaying = new Set();
              weekGames.forEach((game: any) => {
                teamsPlaying.add(game.homeTeam);
                teamsPlaying.add(game.awayTeam);
              });
              
              const allTeams = teams.length > 0 ? teams : fallbackTeams;
              const teamsOnBye = allTeams.filter(team => !teamsPlaying.has(team.id));
              
              console.log(`🏈 Week ${currentWeek}: ${weekGames.length} games, ${teamsPlaying.size} teams playing, ${teamsOnBye.length} teams on BYE`);
              
              // Only show BYE teams if we have games for this week
              if (weekGames.length === 0) {
                return <p className="text-gray-600">No schedule data for Week {currentWeek}</p>;
              }
              
              return teamsOnBye.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {teamsOnBye.map(team => (
                    <div key={team.id} className="text-sm text-gray-600">
                      {team.abbreviation}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">NONE</p>
              );
            })()}
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-gray-500">
            <div className="flex justify-center gap-8">
              <span>Legend</span>
              <span>Draft Order</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Data Protection Status */}
      <DataStatus />
      
      {/* Welcome Modal */}
      <WelcomeModal
        isOpen={showWelcomeModal}
        onClose={handleWelcomeModalClose}
        onGenerateSchedule={handleRegenerateSchedule}
        isGenerating={isGeneratingSchedule}
      />

      {/* Auto-Save Indicator */}
      <AutoSaveIndicator
        isVisible={showAutoSaveIndicator}
        onHide={() => setShowAutoSaveIndicator(false)}
      />
    </>
  );
} 