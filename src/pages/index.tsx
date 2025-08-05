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
import { createScheduleSolver } from '../utils/scheduleConstraintSolver';
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
  const [resolvingGames, setResolvingGames] = useState<Set<string>>(new Set());
  const [winnerAnimations, setWinnerAnimations] = useState<Set<string>>(new Set());
  
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

  const handleResolveUnresolvedGames = async () => {
    if (!selectedSchedule) return;

    const currentWeekGames = selectedSchedule.weeks[currentWeek]?.games || [];
    
    // Check if there are unresolved games
    if (!GameResolver.hasUnresolvedGames(currentWeekGames)) {
      console.log('No unresolved games to resolve');
      return;
    }

    console.log('🎲 Resolving unresolved games for Week', currentWeek);
    
    // Create a working copy of the schedule that we'll update incrementally
    let workingSchedule = { ...selectedSchedule };
    const currentTeams = teams.length > 0 ? teams : fallbackTeams;

    // Get games in the same order they appear in the UI (AFC, Interconference, NFC)
    const afcGames = currentWeekGames.filter(game => {
      const awayTeam = teams.find(t => t.id === game.awayTeam);
      const homeTeam = teams.find(t => t.id === game.homeTeam);
      return awayTeam?.conference === 'AFC' && homeTeam?.conference === 'AFC';
    });

    const interconferenceGames = currentWeekGames.filter(game => {
      const awayTeam = teams.find(t => t.id === game.awayTeam);
      const homeTeam = teams.find(t => t.id === game.homeTeam);
      return awayTeam?.conference !== homeTeam?.conference;
    });

    const nfcGames = currentWeekGames.filter(game => {
      const awayTeam = teams.find(t => t.id === game.awayTeam);
      const homeTeam = teams.find(t => t.id === game.homeTeam);
      return awayTeam?.conference === 'NFC' && homeTeam?.conference === 'NFC';
    });

    // Combine in UI display order
    const gamesInUIOrder = [...afcGames, ...interconferenceGames, ...nfcGames];

    // Process games in the exact order they appear in the UI
    for (let i = 0; i < gamesInUIOrder.length; i++) {
      const currentGame = gamesInUIOrder[i];
      
      // Skip games that are already resolved (no delay needed)
      if (currentGame.homeScore !== undefined && currentGame.awayScore !== undefined) {
        continue;
      }
      
      // Resolve this specific game
      const resolution = GameResolver.resolveGame(
        currentGame.homeTeam,
        currentGame.awayTeam,
        standings,
        (currentWeek * 10000) + (i * 100) + (currentGame.homeTeam.charCodeAt(0) + currentGame.awayTeam.charCodeAt(0))
      );
      
      // Start resolving animation for this game
      setResolvingGames(prev => new Set(prev).add(currentGame.id));
      
      // Wait 0.75 seconds for the resolving animation (only for unresolved games)
      await new Promise(resolve => setTimeout(resolve, 750));
      
      // Update this specific game in the working schedule immediately
      Object.values(workingSchedule.weeks).forEach((week: any) => {
        const gameIndex = week.games.findIndex((g: any) => g.id === currentGame.id);
        
        if (gameIndex !== -1) {
          const scheduleGame = week.games[gameIndex];
          scheduleGame.homeScore = resolution.homeScore;
          scheduleGame.awayScore = resolution.awayScore;
          scheduleGame.isPlayed = true;
          
          console.log(`🎯 Resolved: ${scheduleGame.awayTeam} ${resolution.awayScore} - ${resolution.homeScore} ${scheduleGame.homeTeam} (confidence: ${Math.round(resolution.confidence * 100)}%)`);
        }
      });

      // Update the UI immediately so "___ wins!" appears right away
      setSelectedSchedule({ ...workingSchedule });
      
      // Recalculate standings immediately so they're updated for the next game
      const allGames = Object.values(workingSchedule.weeks).flatMap((week: any) => 
        week.games.map((scheduleGame: any) => ({
          id: scheduleGame.id,
          homeTeam: scheduleGame.homeTeam,
          awayTeam: scheduleGame.awayTeam,
          homeScore: scheduleGame.homeScore,
          awayScore: scheduleGame.awayScore,
          week: parseInt(week.weekNumber.toString()),
          date: `Week ${week.weekNumber}`,
          time: 'TBD',
          status: scheduleGame.isPlayed ? 'final' : 'scheduled'
        }))
      );
      
      const updatedStandings = calculateStandings(currentTeams, allGames);
      setStandings(updatedStandings);
      
      // Determine winner and trigger winner animation
      const winnerId = resolution.homeScore > resolution.awayScore ? currentGame.homeTeam : currentGame.awayTeam;
      setWinnerAnimations(prev => new Set(prev).add(winnerId));
      
      // Remove winner animation after 1 second
      setTimeout(() => {
        setWinnerAnimations(prev => {
          const newSet = new Set(prev);
          newSet.delete(winnerId);
          return newSet;
        });
      }, 1000);
      
      // Stop resolving animation for this game
      setResolvingGames(prev => {
        const newSet = new Set(prev);
        newSet.delete(currentGame.id);
        return newSet;
      });
    }

    // Save the final updated schedule
    ScheduleSaver.updateGameScore(workingSchedule.id, 'dummy', 0, 0).catch(error => {
      console.error('Failed to save resolved games:', error);
    });

    console.log(`✅ Resolved games for Week ${currentWeek}`);
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
      alert(`Schedule generation failed: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease check the console for detailed error information.`);
    } finally {
      setIsGeneratingSchedule(false);
    }
  };

  const handleWelcomeModalClose = () => {
    setShowWelcomeModal(false);
  };

  const generateFullNFLScheduleWithGLPK = async (teams: Team[], retryCount: number = 0): Promise<Array<{ week: number; home: string; away: string }>> => {
    const maxRetries = 3;
    console.log(`🧮 Initializing real GLPK solver... (attempt ${retryCount + 1}/${maxRetries + 1})`);
    
    try {
      // Generate all required matchups
      const priorYearStandings: { [teamId: string]: number } = {};
      teams.forEach(team => {
        priorYearStandings[team.id] = 1;
      });
      const config = createScheduleConfig(teams, 2025, priorYearStandings);
      const matchups = generateMatchups(config);
      console.log(`📋 Generated ${matchups.length} matchups`);
      
      // Create real GLPK solver with proper NFL constraints
      const solver = createScheduleSolver(matchups, teams, 18, {
        maxGamesPerWeek: 16,
        byeWeekDistribution: 'balanced'
      });
      
      console.log('🔧 Solving with real GLPK constraints...');
      const solution = await solver.solve();
      
      if (solution.status === 'optimal') {
        console.log(`✅ Real GLPK solved successfully! ${solution.games.length} games scheduled`);
        console.log(`📊 Solve time: ${solution.solveTime}ms`);
        console.log(`📊 Objective value: ${solution.objective}`);
        console.log(`📊 Constraints satisfied:`, solution.constraints);
        
        // Convert GLPK solution to our format
        const games = solution.games.map(game => ({
          week: game.week,
          home: game.homeTeam,
          away: game.awayTeam,
          day: 'Sunday', // Default to Sunday
        }));
        
        return games;
      } else {
        console.error(`❌ Real GLPK solver returned status: ${solution.status}`);
        console.error(`📊 Solve time: ${solution.solveTime}ms`);
        console.error(`📊 Objective value: ${solution.objective}`);
        console.error(`📊 Constraints attempted:`, solution.constraints);
        
        if (retryCount < maxRetries) {
          console.log(`🔄 Retrying real GLPK solver... (${retryCount + 1}/${maxRetries} retries used)`);
          // Add a small delay before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
          return generateFullNFLScheduleWithGLPK(teams, retryCount + 1);
        } else {
          console.error(`💥 Real GLPK solver failed after ${maxRetries + 1} attempts. This is a critical error!`);
          console.error(`💥 No fallback - GLPK should work!`);
          console.error(`💥 Please check GLPK installation and constraints.`);
          throw new Error(`Real GLPK solver failed after ${maxRetries + 1} attempts with status: ${solution.status}`);
        }
      }
      
    } catch (error) {
      console.error('❌ Real GLPK solver error:', error);
      
      if (retryCount < maxRetries) {
        console.log(`🔄 Retrying real GLPK solver after error... (${retryCount + 1}/${maxRetries} retries used)`);
        // Add a small delay before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
        return generateFullNFLScheduleWithGLPK(teams, retryCount + 1);
      } else {
        console.error(`💥 Real GLPK solver failed after ${maxRetries + 1} attempts due to error:`, error);
        console.error(`💥 No fallback - GLPK should work!`);
        console.error(`💥 Please check GLPK installation and constraints.`);
        throw new Error(`Real GLPK solver failed after ${maxRetries + 1} attempts: ${error}`);
      }
    }
  };

  // Manual fallback function removed - GLPK should work or fail



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
          <div className="text-center mb-6">
            <div className="bg-gradient-to-r from-blue-600 to-red-600 text-white py-4 px-6 rounded-lg shadow-lg mb-4">
              <h1 className="text-4xl font-bold mb-2">
                🏈 NFL 2025-2026 SEASON
              </h1>
              <div className="text-lg opacity-90">
                Weekly Actions
              </div>
            </div>
          </div>

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

          {/* Navigation Bar */}
          <WeekNavigation 
            currentWeek={currentWeek}
            onWeekChange={handleWeekChange}
            onUpdate={refreshData}
            onRegenerateSchedule={handleRegenerateSchedule}
            isGeneratingSchedule={isGeneratingSchedule}
          />

          {/* Week Info */}
          <div className="text-center mb-6">
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
                resolvingGames={resolvingGames}
                winnerAnimations={winnerAnimations}
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