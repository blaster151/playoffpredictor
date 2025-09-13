import { useState, useEffect, useRef, useCallback } from 'react';
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
import { generatePlayoffBrackets, getPlayoffWeekName, isPlayoffWeek, getEliminatedTeams, isRegularSeasonComplete, getPlayoffStatusMessage, arePlayoffWeeksUnlocked } from '../utils/playoffBracketGenerator';
import TeamScheduleModal from '../components/TeamScheduleModal';
import GenerationErrorModal from '../components/GenerationErrorModal';
import { getTransparentTeamBadgeStyle } from '../utils/teamColors';
import { getTeamDisplay } from '../utils/helmetIcons';

export default function Home() {
  const [currentWeek, setCurrentWeek] = useState(1);
  const [standingsViewMode, setStandingsViewMode] = useState<'conference' | 'division'>('conference');
  const [selectedSchedule, setSelectedSchedule] = useState<SavedSchedule | null>(null);
  
  // Debounced schedule setter to prevent excessive auto-saves
  const [debouncedSchedule, setDebouncedSchedule] = useState<SavedSchedule | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const setSelectedScheduleDebounced = useCallback((schedule: SavedSchedule | null) => {
    // Clear any existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Set the immediate state for UI updates
    setSelectedSchedule(schedule);
    
    // Debounce the auto-save trigger to 3 seconds
    debounceTimeoutRef.current = setTimeout(() => {
      setDebouncedSchedule(schedule);
    }, 3000);
  }, []);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);
  
  // Trigger auto-save when debounced schedule changes
  useEffect(() => {
    if (debouncedSchedule) {
      // This will trigger the auto-save mechanism
      console.log('💾 Debounced auto-save triggered');
      setShowAutoSaveIndicator(true);
    }
  }, [debouncedSchedule]);
  // Removed mainViewMode state - always show standings view
  const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showSeasonResolvedModal, setShowSeasonResolvedModal] = useState(false);
  const [showAutoSaveIndicator, setShowAutoSaveIndicator] = useState(false);
  const [resolvingGames, setResolvingGames] = useState<Set<string>>(new Set());
  const [winnerAnimations, setWinnerAnimations] = useState<Set<string>>(new Set());
  const [playoffUpdateTrigger, setPlayoffUpdateTrigger] = useState(0);
  const [showSuperBowlVictoryModal, setShowSuperBowlVictoryModal] = useState(false);
  const [superBowlWinner, setSuperBowlWinner] = useState<Team | null>(null);
  const [showTeamScheduleModal, setShowTeamScheduleModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [bulkResolveProgress, setBulkResolveProgress] = useState<{
    isActive: boolean;
    currentWeek: number;
    totalWeeks: number;
    currentGame: number;
    totalGames: number;
    message: string;
  } | null>(null);
  
  const [scheduleGenerationProgress, setScheduleGenerationProgress] = useState<{
    isActive: boolean;
    step: string;
    message: string;
    percentage: number;
  } | null>(null);
  
  const [generationError, setGenerationError] = useState<string | null>(null);
  
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
    
    // NOTE: localStorage clearing removed - issue was in useNFLData hook SSG compatibility
    
    const savedSchedules = ScheduleSaver.loadAllSchedules();
    console.log(`📂 Found ${savedSchedules.length} saved schedules`);
    
    if (savedSchedules.length > 0) {
      // Load the most recently updated schedule
      const mostRecent = savedSchedules.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )[0];
      setSelectedSchedule(mostRecent);
      console.log(`📂 Loaded saved schedule: ${mostRecent.name} (${mostRecent.metadata.totalGames} games)`);
      console.log(`📂 Week 1 games: ${mostRecent.weeks[1]?.games?.length || 0}`);
    } else {
      // Show welcome modal for first-time users
      console.log('📂 No saved schedules found, showing welcome modal');
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
          // Include all games, not just played ones, so we can see the full schedule
          scheduleGames.push({
            id: game.id,
            homeTeam: game.homeTeam,
            awayTeam: game.awayTeam,
            homeScore: game.homeScore,
            awayScore: game.awayScore,
            week: week,
            day: 'Sunday',
            date: `Week ${week}`,
            isPlayed: game.isPlayed || (game.homeScore !== undefined && game.awayScore !== undefined)
          });
        });
      }
      currentGames = scheduleGames;
      console.log(`📊 Loaded ${scheduleGames.length} games from schedule (${scheduleGames.filter(g => g.isPlayed).length} played)`);
    }
    
    const calculatedStandings = calculateStandings(currentTeams, currentGames);
    setStandings(calculatedStandings);
  }, [teams, games, selectedSchedule, currentWeek]);

  // Force re-render when playoff games are updated
  useEffect(() => {
    if (isPlayoffWeek(currentWeek)) {
      console.log(`🔄 Playoff update trigger: ${playoffUpdateTrigger}`);
    }
  }, [playoffUpdateTrigger, currentWeek]);

  // Check for Super Bowl completion when navigating to Week 22
  useEffect(() => {
    if (currentWeek === 22 && selectedSchedule && !showSuperBowlVictoryModal) {
      const superBowlKey = `playoff_${selectedSchedule.id}_22`;
      const superBowlGames = JSON.parse(localStorage.getItem(superBowlKey) || '[]');
      const completedSuperBowlGames = superBowlGames.filter((game: any) => 
        game.isPlayed && game.homeScore !== undefined && game.awayScore !== undefined
      );
      
      if (completedSuperBowlGames.length > 0) {
        const superBowlGame = completedSuperBowlGames[0];
        const winnerId = superBowlGame.homeScore > superBowlGame.awayScore ? superBowlGame.homeTeam : superBowlGame.awayTeam;
        const winnerTeam = (teams.length > 0 ? teams : fallbackTeams).find(t => t.id === winnerId);
        
        if (winnerTeam) {
          console.log(`🏆 Super Bowl Champion detected: ${winnerTeam.name}!`);
          setSuperBowlWinner(winnerTeam);
          setShowSuperBowlVictoryModal(true);
        }
      }
    }
  }, [currentWeek, selectedSchedule, showSuperBowlVictoryModal, teams]);

  const handleGameUpdate = (gameId: string, awayScore: number, homeScore: number) => {
    console.log('Game update:', { gameId, awayScore, homeScore });
    
    if (selectedSchedule) {
      // Update the schedule with the new scores
      const updatedSchedule = { ...selectedSchedule };
      
      // Check if this is a playoff game
      if (isPlayoffWeek(currentWeek)) {
        // For playoff games, we need to save them to a special playoff storage
        // and regenerate the playoff brackets
        console.log(`🏈 Updating playoff game ${gameId} for Week ${currentWeek}`);
        
        // Save playoff game result to localStorage
        const playoffKey = `playoff_${selectedSchedule.id}_${currentWeek}`;
        const existingPlayoffGames = JSON.parse(localStorage.getItem(playoffKey) || '[]');
        
        const updatedPlayoffGames = existingPlayoffGames.map((game: any) => 
          game.id === gameId 
            ? { ...game, homeScore, awayScore, isPlayed: true }
            : game
        );
        
        // If game doesn't exist, add it
        if (!existingPlayoffGames.find((g: any) => g.id === gameId)) {
          // Get the full playoff bracket for this week to ensure we have all games
          // Load all saved playoff games to get the correct bracket
          let allSavedPlayoffGames: any[] = [];
          for (let week = 19; week <= 22; week++) {
            const weekKey = `playoff_${selectedSchedule.id}_${week}`;
            const weekGames = JSON.parse(localStorage.getItem(weekKey) || '[]');
            allSavedPlayoffGames.push(...weekGames);
          }
          
          const playoffBrackets = generatePlayoffBrackets(standings, currentWeek, selectedSchedule, allSavedPlayoffGames);
          let allWeekGames: any[] = [];
          
          switch (currentWeek) {
            case 19:
              allWeekGames = playoffBrackets.wildCard;
              break;
            case 20:
              allWeekGames = playoffBrackets.divisional;
              break;
            case 21:
              allWeekGames = playoffBrackets.conferenceChampionships;
              break;
            case 22:
              allWeekGames = playoffBrackets.superBowl;
              break;
          }
          
          // Merge existing saved games with the full bracket
          const mergedGames = allWeekGames.map(bracketGame => {
            const savedGame = existingPlayoffGames.find((g: any) => g.id === bracketGame.id);
            return savedGame || bracketGame;
          });
          
          // Update the specific game that was clicked
          const updatedMergedGames = mergedGames.map(game => 
            game.id === gameId 
              ? { ...game, homeScore, awayScore, isPlayed: true }
              : game
          );
          
                  localStorage.setItem(playoffKey, JSON.stringify(updatedMergedGames));
        console.log(`💾 Playoff games merged and saved: ${updatedMergedGames.length} games`);
        
        // Force a re-render for playoff games
        setPlayoffUpdateTrigger(prev => prev + 1);
        return; // Exit early since we've already saved
        }
        
        localStorage.setItem(playoffKey, JSON.stringify(updatedPlayoffGames));
        console.log(`💾 Playoff game saved to localStorage: ${playoffKey}`);
        console.log(`💾 Updated games: ${updatedPlayoffGames.length} total, ${updatedPlayoffGames.filter((g: any) => g.homeScore !== undefined).length} with scores`);
        
        // Force a re-render for playoff games
        setPlayoffUpdateTrigger(prev => prev + 1);
        
        // Check if Super Bowl is complete and show victory modal
        if (currentWeek === 22) {
          const superBowlKey = `playoff_${selectedSchedule.id}_22`;
          const superBowlGames = JSON.parse(localStorage.getItem(superBowlKey) || '[]');
          const completedSuperBowlGames = superBowlGames.filter((game: any) => 
            game.isPlayed && game.homeScore !== undefined && game.awayScore !== undefined
          );
          
          if (completedSuperBowlGames.length > 0) {
            const superBowlGame = completedSuperBowlGames[0]; // There should only be one Super Bowl game
            const winnerId = superBowlGame.homeScore > superBowlGame.awayScore ? superBowlGame.homeTeam : superBowlGame.awayTeam;
            const winnerTeam = (teams.length > 0 ? teams : fallbackTeams).find(t => t.id === winnerId);
            
            if (winnerTeam && !showSuperBowlVictoryModal) {
              console.log(`🏆 Super Bowl Champion: ${winnerTeam.name}!`);
              setSuperBowlWinner(winnerTeam);
              setShowSuperBowlVictoryModal(true);
            }
          }
        }
      } else {
        // Regular season game - update the schedule
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
        
        // Force a re-render by creating a new object reference (debounced)
        setSelectedScheduleDebounced({ ...updatedSchedule });
      }
      
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
      // Try to load saved playoff games first
      if (selectedSchedule) {
        const playoffKey = `playoff_${selectedSchedule.id}_${currentWeek}`;
        const savedPlayoffGames = JSON.parse(localStorage.getItem(playoffKey) || '[]');
        
        // Load all saved playoff games to check completion status
        let allSavedPlayoffGames: any[] = [];
        for (let week = 19; week <= 22; week++) {
          const weekKey = `playoff_${selectedSchedule.id}_${week}`;
          const weekGames = JSON.parse(localStorage.getItem(weekKey) || '[]');
          allSavedPlayoffGames.push(...weekGames);
        }
        
        // Generate playoff brackets with progressive unlocking
        const playoffBrackets = generatePlayoffBrackets(standings, currentWeek, selectedSchedule, allSavedPlayoffGames as any);
        let allWeekGames: any[] = [];
        
        switch (currentWeek) {
          case 19:
            allWeekGames = playoffBrackets.wildCard;
            break;
          case 20:
            allWeekGames = playoffBrackets.divisional;
            break;
          case 21:
            allWeekGames = playoffBrackets.conferenceChampionships;
            break;
          case 22:
            allWeekGames = playoffBrackets.superBowl;
            break;
        }
        
        console.log(`🔍 Week ${currentWeek} playoff bracket generation:`);
        console.log(`   Wild Card: ${playoffBrackets.wildCard.length} games`);
        console.log(`   Divisional: ${playoffBrackets.divisional.length} games`);
        console.log(`   Conference: ${playoffBrackets.conferenceChampionships.length} games`);
        console.log(`   Super Bowl: ${playoffBrackets.superBowl.length} games`);
        console.log(`   Selected for week ${currentWeek}: ${allWeekGames.length} games`);
        
        // If no games are generated for this week, it's not unlocked yet
        if (allWeekGames.length === 0) {
          console.log(`🔒 Week ${currentWeek}: Playoff round not unlocked yet`);
          console.log(`   Available games: Wild Card (${playoffBrackets.wildCard.length}), Divisional (${playoffBrackets.divisional.length}), Conference (${playoffBrackets.conferenceChampionships.length}), Super Bowl (${playoffBrackets.superBowl.length})`);
          return [];
        }
        
        // Merge saved games with the generated bracket
        const mergedGames = allWeekGames.map(bracketGame => {
          const savedGame = allSavedPlayoffGames.find((g: any) => g.id === bracketGame.id);
          return savedGame || bracketGame;
        });
        
        console.log(`🏈 Week ${currentWeek}: Merged ${mergedGames.length} playoff games (${allSavedPlayoffGames.length} total saved)`);
        return mergedGames;
      }
    }
    
    // Regular season week
    const weekGames = selectedSchedule.weeks[currentWeek]?.games || [];
    console.log(`📅 Week ${currentWeek}: ${weekGames.length} games`);
    
    const mappedGames = weekGames.map(game => ({
      id: game.id,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      homeScore: game.homeScore !== undefined ? game.homeScore : undefined,
      awayScore: game.awayScore !== undefined ? game.awayScore : undefined,
      week: currentWeek,
      day: 'Sunday',
      date: `Week ${currentWeek}`,
      isPlayed: game.isPlayed || false
    }));
    
    // Debug: Check if games have undefined scores
    const unresolvedCount = mappedGames.filter(g => g.homeScore === undefined || g.awayScore === undefined).length;
    console.log(`🔍 Week ${currentWeek} unresolved games: ${unresolvedCount}/${mappedGames.length}`);
    
    return mappedGames;
  };

  const handleSubmitWeek = () => {
    // Save predictions to pool
    console.log('Submitting week predictions:', games);
  };

  const handleViewPools = () => {
    // Navigate to pools view
    console.log('Viewing pools');
  };

  const handleResolveWholeSeason = async () => {
    if (!selectedSchedule) return;

    console.log('🚀 Starting whole season resolution...');
    
    // Find all weeks with unresolved games
    const weeksWithUnresolvedGames: number[] = [];
    
    for (let week = 1; week <= 18; week++) {
      const weekGames = selectedSchedule.weeks[week]?.games || [];
      if (GameResolver.hasUnresolvedGames(weekGames)) {
        weeksWithUnresolvedGames.push(week);
      }
    }
    
    if (weeksWithUnresolvedGames.length === 0) {
      console.log('No unresolved games in the season');
      return;
    }
    
    console.log(`Found ${weeksWithUnresolvedGames.length} weeks with unresolved games:`, weeksWithUnresolvedGames);
    
    // Initialize progress tracking
    setBulkResolveProgress({
      isActive: true,
      currentWeek: 0,
      totalWeeks: weeksWithUnresolvedGames.length,
      currentGame: 0,
      totalGames: 0,
      message: 'Starting season resolution...'
    });
    
    // Process each week
    for (let weekIndex = 0; weekIndex < weeksWithUnresolvedGames.length; weekIndex++) {
      const week = weeksWithUnresolvedGames[weekIndex];
      console.log(`🔄 Switching to Week ${week}...`);
      
      // Update progress
      setBulkResolveProgress(prev => prev ? {
        ...prev,
        currentWeek: weekIndex + 1,
        message: `Processing Week ${week}...`
      } : null);
      
      // Switch to this week
      setCurrentWeek(week);
      
      // Wait 500ms for the switch to take effect and let user see the week change
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log(`✅ Now on Week ${week}`);
      
      // Get games for this week (use the current week after the change)
      const weekGames = selectedSchedule.weeks[week]?.games || [];
      
      // Count unresolved games for this week
      const unresolvedGames = weekGames.filter(g => g.homeScore === undefined || g.awayScore === undefined);
      
      // Update progress with game count
      setBulkResolveProgress(prev => prev ? {
        ...prev,
        totalGames: unresolvedGames.length,
        currentGame: 0,
        message: `Resolving ${unresolvedGames.length} games in Week ${week}...`
      } : null);
      
      // Resolve all games in this week without animations
      let workingSchedule = { ...selectedSchedule };
      const currentTeams = teams.length > 0 ? teams : fallbackTeams;
      
      // Get games in the same order they appear in the UI (AFC, Interconference, NFC)
      const afcGames = weekGames.filter(game => {
        const awayTeam = teams.find(t => t.id === game.awayTeam);
        const homeTeam = teams.find(t => t.id === game.homeTeam);
        return awayTeam?.conference === 'AFC' && homeTeam?.conference === 'AFC';
      });

      const interconferenceGames = weekGames.filter(game => {
        const awayTeam = teams.find(t => t.id === game.awayTeam);
        const homeTeam = teams.find(t => t.id === game.homeTeam);
        return awayTeam?.conference !== homeTeam?.conference;
      });

      const nfcGames = weekGames.filter(game => {
        const awayTeam = teams.find(t => t.id === game.awayTeam);
        const homeTeam = teams.find(t => t.id === game.homeTeam);
        return awayTeam?.conference === 'NFC' && homeTeam?.conference === 'NFC';
      });

      // Combine in UI display order
      const gamesInUIOrder = [...afcGames, ...interconferenceGames, ...nfcGames];

      // Process games in the exact order they appear in the UI
      for (let i = 0; i < gamesInUIOrder.length; i++) {
        const game = gamesInUIOrder[i];
        
        // Skip games that are already resolved
        if (game.homeScore !== undefined && game.awayScore !== undefined) {
          continue;
        }
        
        // Update game progress
        setBulkResolveProgress(prev => prev ? {
          ...prev,
          currentGame: i + 1,
          message: `Resolving game ${i + 1}/${unresolvedGames.length} in Week ${week}...`
        } : null);
        
        // Resolve this specific game
        const resolution = GameResolver.resolveGame(
          game.homeTeam,
          game.awayTeam,
          standings,
          (week * 10000) + (i * 100) + (game.homeTeam.charCodeAt(0) + game.awayTeam.charCodeAt(0))
        );
        
        // Update this specific game in the working schedule immediately
        Object.values(workingSchedule.weeks).forEach((weekData: any) => {
          const gameIndex = weekData.games.findIndex((g: any) => g.id === game.id);
          
          if (gameIndex !== -1) {
            const scheduleGame = weekData.games[gameIndex];
            scheduleGame.homeScore = resolution.homeScore;
            scheduleGame.awayScore = resolution.awayScore;
            scheduleGame.isPlayed = true;
            
            console.log(`🎯 Resolved: ${scheduleGame.awayTeam} ${resolution.awayScore} - ${resolution.homeScore} ${scheduleGame.homeTeam} (confidence: ${Math.round(resolution.confidence * 100)}%)`);
          }
        });
        
        // Recalculate standings immediately
        const allGames = Object.values(workingSchedule.weeks).flatMap((weekData: any) => 
          weekData.games.map((scheduleGame: any) => ({
            id: scheduleGame.id,
            homeTeam: scheduleGame.homeTeam,
            awayTeam: scheduleGame.awayTeam,
            homeScore: scheduleGame.homeScore,
            awayScore: scheduleGame.awayScore,
            week: parseInt(weekData.weekNumber.toString()),
            date: `Week ${weekData.weekNumber}`,
            time: 'TBD',
            status: scheduleGame.isPlayed ? 'final' : 'scheduled'
          }))
        );
        
        const updatedStandings = calculateStandings(currentTeams, allGames);
        setStandings(updatedStandings);
        
        // Wait 50ms between each team resolution
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // Save the resolved week to localStorage (batch save)
      const resolvedWeekGames = workingSchedule.weeks[week]?.games || [];
      const resolvedGames = resolvedWeekGames.filter(g => g.homeScore !== undefined && g.awayScore !== undefined);
      
      // Batch save all games for this week at once
      for (const game of resolvedGames) {
        if (game.homeScore !== undefined && game.awayScore !== undefined) {
          await ScheduleSaver.updateGameScore(workingSchedule.id, game.id, game.homeScore, game.awayScore);
        }
      }
      console.log(`💾 Saved ${resolvedGames.length} resolved games for Week ${week}`);
      
      // Update the schedule once per week (immediate, not debounced during bulk operations)
      setSelectedSchedule({ ...workingSchedule });
      
      // Also save the entire schedule immediately to prevent data loss
      await dataManager.immediateSave('nfl_schedules', workingSchedule, 'bulk_resolve');
      
      // Wait 1 second before proceeding to next week
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Clear progress
    setBulkResolveProgress(null);
    
    // Show completion modal
    setShowSeasonResolvedModal(true);
  };

  const handleResolveUnresolvedGames = async () => {
    if (!selectedSchedule) return;

    // Don't auto-resolve during playoff weeks
    if (isPlayoffWeek(currentWeek)) {
      console.log('Auto-resolve disabled during playoff weeks');
      return;
    }

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
      const game = gamesInUIOrder[i];
      
      // Skip games that are already resolved (no delay needed)
      if (game.homeScore !== undefined && game.awayScore !== undefined) {
        continue;
      }
      
      // Calculate current standings based on working schedule before resolving this game
      const currentAllGames = Object.values(workingSchedule.weeks).flatMap((week: any) => 
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
      const currentStandings = calculateStandings(currentTeams, currentAllGames);
      
      // Resolve this specific game with current standings
      const resolution = GameResolver.resolveGame(
        game.homeTeam,
        game.awayTeam,
        currentStandings,
        (currentWeek * 10000) + (i * 100) + (game.homeTeam.charCodeAt(0) + game.awayTeam.charCodeAt(0))
      );
      
      // Start resolving animation for this game
      setResolvingGames(prev => new Set(prev).add(game.id));
      
      // Wait 0.75 seconds for the resolving animation (only for unresolved games)
      await new Promise(resolve => setTimeout(resolve, 750));
      
      // Update this specific game in the working schedule immediately
      Object.values(workingSchedule.weeks).forEach((week: any) => {
        const gameIndex = week.games.findIndex((g: any) => g.id === game.id);
        
        if (gameIndex !== -1) {
          const scheduleGame = week.games[gameIndex];
          scheduleGame.homeScore = resolution.homeScore;
          scheduleGame.awayScore = resolution.awayScore;
          scheduleGame.isPlayed = true;
          
          console.log(`🎯 Resolved: ${scheduleGame.awayTeam} ${resolution.awayScore} - ${resolution.homeScore} ${scheduleGame.homeTeam} (confidence: ${Math.round(resolution.confidence * 100)}%)`);
        }
      });

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
      const winnerId = resolution.homeScore > resolution.awayScore ? game.homeTeam : game.awayTeam;
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
        newSet.delete(game.id);
        return newSet;
      });
    }

    // Update the schedule once at the end (immediate, not debounced during bulk operations)
    setSelectedSchedule({ ...workingSchedule });
    
    // Save all resolved games to localStorage
    const resolvedWeekGames = workingSchedule.weeks[currentWeek]?.games || [];
    const resolvedGames = resolvedWeekGames.filter(g => g.homeScore !== undefined && g.awayScore !== undefined);
    for (const game of resolvedGames) {
      if (game.homeScore !== undefined && game.awayScore !== undefined) {
        await ScheduleSaver.updateGameScore(workingSchedule.id, game.id, game.homeScore, game.awayScore);
      }
    }
    console.log(`💾 Saved ${resolvedGames.length} resolved games for Week ${currentWeek}`);
    
    // Also save any playoff games that were resolved
    if (isPlayoffWeek(currentWeek)) {
      const playoffKey = `playoff_${workingSchedule.id}_${currentWeek}`;
      const currentGames = getCurrentWeekGames();
      const resolvedPlayoffGames = currentGames.filter(game => 
        game.homeScore !== undefined && game.awayScore !== undefined
      );
      
      if (resolvedPlayoffGames.length > 0) {
        localStorage.setItem(playoffKey, JSON.stringify(resolvedPlayoffGames));
        console.log(`💾 Saved ${resolvedPlayoffGames.length} playoff games for Week ${currentWeek}`);
      }
    }

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
    setGenerationError(null); // Clear any previous errors
    setScheduleGenerationProgress({
      isActive: true,
      step: 'Initializing',
      message: 'Starting NFL schedule generation...',
      percentage: 0
    });
    console.log('🔄 Starting full NFL schedule generation with GLPK solver...');
    
    try {
      // Use the full NFL schedule generator with GLPK solver
      const currentTeams = teams.length > 0 ? teams : fallbackTeams;
      
      setScheduleGenerationProgress({
        isActive: true,
        step: 'Generating Matchups',
        message: 'Creating NFL matchups with rotational rules...',
        percentage: 20
      });
      
      const fullScheduleGames = await generateFullNFLScheduleWithGLPK(currentTeams);
      
      setScheduleGenerationProgress({
        isActive: true,
        step: 'Saving Schedule',
        message: 'Saving generated schedule to storage...',
        percentage: 80
      });
      
      // Validate the generated schedule before saving
      if (!fullScheduleGames || fullScheduleGames.length === 0) {
        throw new Error('Schedule generator returned empty results. The GLPK solver may have failed to find a valid solution.');
      }
      
      // Check if we have the expected number of games (272 total for 17 games per team)
      const expectedGames = 32 * 17 / 2; // 32 teams * 17 games / 2 (since each game involves 2 teams)
      if (fullScheduleGames.length !== expectedGames) {
        throw new Error(`Schedule validation failed: Expected ${expectedGames} games but got ${fullScheduleGames.length}. The generator may have failed to create a complete schedule.`);
      }
      
      const newSchedule = await ScheduleSaver.saveSchedule(fullScheduleGames, currentTeams, {
        name: `Full NFL Schedule - ${new Date().toLocaleString()}`,
        description: 'Generated using GLPK solver with proper NFL constraints and bye week logic',
        season: 2025,
        generatedBy: 'GLPK',
      });
      
      // Clear any existing game scores from localStorage to prevent persistence
      let clearedGameCount = 0;
      const existingSchedules = ScheduleSaver.loadAllSchedules();
      existingSchedules.forEach(schedule => {
        Object.values(schedule.weeks).forEach((week: any) => {
          week.games.forEach((game: any) => {
            if (game.homeScore !== undefined || game.awayScore !== undefined) {
              clearedGameCount++;
            }
          });
        });
      });
      
      // Clear any playoff game data that might persist
      const keysToClear = Object.keys(localStorage).filter(key => key.startsWith('playoff_'));
      keysToClear.forEach(key => {
        localStorage.removeItem(key);
      });
      
      if (clearedGameCount > 0 || keysToClear.length > 0) {
        console.log(`🧹 Cleared ${clearedGameCount} old game scores and ${keysToClear.length} playoff data entries`);
      }
      
      console.log('🆕 New schedule generated with ID:', newSchedule.id);
      console.log('📊 Schedule has', Object.keys(newSchedule.weeks).length, 'weeks');
      console.log('🎮 Total games:', Object.values(newSchedule.weeks).reduce((total: number, week: any) => total + week.games.length, 0));
      
      // Debug week distribution
      console.log('🔍 Week distribution analysis:');
      for (let week = 1; week <= 18; week++) {
        const weekGames = newSchedule.weeks[week]?.games || [];
        console.log(`  Week ${week}: ${weekGames.length} games`);
        if (weekGames.length === 0) {
          console.log(`    ⚠️  Week ${week} is empty!`);
        }
      }
      
      setScheduleGenerationProgress({
        isActive: true,
        step: 'Finalizing',
        message: 'Finalizing schedule and updating UI...',
        percentage: 95
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred during schedule generation';
      setGenerationError(errorMessage);
      
      // Show a more user-friendly error notification
      const errorDetails = `Schedule generation failed!\n\nError: ${errorMessage}\n\nThis could be due to:\n• Network connectivity issues\n• GLPK solver initialization problems\n• Memory constraints\n\nPlease try again or check the console for detailed error information.`;
      alert(errorDetails);
    } finally {
      setIsGeneratingSchedule(false);
      setScheduleGenerationProgress(null);
    }
  };

  const handleWelcomeModalClose = () => {
    setShowWelcomeModal(false);
  };

  const handleSuperBowlVictoryModalClose = () => {
    setShowSuperBowlVictoryModal(false);
    setSuperBowlWinner(null);
  };

  const handleTeamClick = (team: Team) => {
    setSelectedTeam(team);
    setShowTeamScheduleModal(true);
  };

  const handleTeamScheduleModalClose = () => {
    setShowTeamScheduleModal(false);
    setSelectedTeam(null);
  };

  const generateFullNFLScheduleWithGLPK = async (teams: Team[], retryCount: number = 0): Promise<Array<{ week: number; home: string; away: string }>> => {
    const maxRetries = 3;
    console.log(`🧮 Initializing real GLPK solver... (attempt ${retryCount + 1}/${maxRetries + 1})`);
    
    try {
      // Generate all required matchups with proper prior year standings
      const priorYearStandings: { [teamId: string]: number } = {};
      
      // Group teams by division and assign ranks
      const divisions = new Map<string, Team[]>();
      teams.forEach(team => {
        const divKey = `${team.conference}_${team.division}`;
        if (!divisions.has(divKey)) {
          divisions.set(divKey, []);
        }
        divisions.get(divKey)!.push(team);
      });
      
      // Assign ranks within each division
      divisions.forEach((divisionTeams, divisionName) => {
        // Sort teams by ID to ensure consistent ordering
        divisionTeams.sort((a, b) => a.id.localeCompare(b.id));
        divisionTeams.forEach((team, index) => {
          priorYearStandings[team.id] = index + 1; // 1-4 for each division
        });
      });
      
      // Debug: Log the prior year standings
      console.log('🔍 Prior year standings:', priorYearStandings);
      
      const config = createScheduleConfig(teams, 2025, priorYearStandings);
      const matchups = generateMatchups(config);
      console.log(`📋 Generated ${matchups.length} matchups`);
      
      // Create real GLPK solver with proper NFL constraints
      const solver = createScheduleSolver(matchups, teams, 18, {
        maxGamesPerWeek: 18, // Allow more games per week
        byeWeekDistribution: 'balanced',
        preventConsecutiveRematches: true // Enable to prevent consecutive rematches
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
        
        // Debug week distribution in GLPK solution
        console.log('🔍 GLPK solution week distribution:');
        const weekCounts: { [week: number]: number } = {};
        for (let week = 1; week <= 18; week++) {
          weekCounts[week] = 0;
        }
        games.forEach(game => {
          weekCounts[game.week]++;
        });
        for (let week = 1; week <= 18; week++) {
          console.log(`  Week ${week}: ${weekCounts[week]} games`);
          if (weekCounts[week] === 0) {
            console.log(`    ⚠️  Week ${week} is empty in GLPK solution!`);
          }
        }
        
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

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <NavigationBar />
        
        <div className="nfl-container">
          <div className="text-center mb-2">
            <div className="bg-gray-700 dark:bg-gray-800 text-white py-3 px-6 rounded-lg shadow-lg mb-1">
              <h1 className="text-4xl font-bold mb-2">
                🏈 NFL 2025-2026 SEASON
              </h1>
              <div className="text-lg opacity-90">
                Weekly Actions
              </div>
            </div>
          </div>

          {/* Navigation Bar */}
          <WeekNavigation 
            currentWeek={currentWeek}
            onWeekChange={handleWeekChange}
            onRegenerateSchedule={handleRegenerateSchedule}
            isGeneratingSchedule={isGeneratingSchedule}
            isRegularSeasonComplete={arePlayoffWeeksUnlocked(selectedSchedule)}
          />

          {/* Resolve Unresolved Games Button */}
          {selectedSchedule && (() => {
            // Check for unresolved games in the entire season and playoffs, not just current week
            let totalUnresolvedCount = 0;
            let currentWeekUnresolvedCount = 0;
            
            // Check regular season weeks (1-18)
            for (let week = 1; week <= 18; week++) {
              const weekGames = selectedSchedule.weeks[week]?.games || [];
              const weekUnresolvedCount = GameResolver.countUnresolvedGames(weekGames);
              totalUnresolvedCount += weekUnresolvedCount;
              
              if (week === currentWeek) {
                currentWeekUnresolvedCount = weekUnresolvedCount;
              }
            }
            
            // Check playoff weeks (19-22) if we're in playoffs
            if (currentWeek >= 19) {
              for (let week = 19; week <= 22; week++) {
                const weekGames = selectedSchedule.weeks[week]?.games || [];
                const weekUnresolvedCount = GameResolver.countUnresolvedGames(weekGames);
                totalUnresolvedCount += weekUnresolvedCount;
                
                if (week === currentWeek) {
                  currentWeekUnresolvedCount = weekUnresolvedCount;
                }
              }
            }
            
            if (totalUnresolvedCount > 0) {
              return (
                <div className="mb-1 p-2 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900 dark:to-orange-900 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-xl">🎲</span>
                      <div>
                        <h3 className="font-semibold text-gray-800 dark:text-white text-sm">
                          {currentWeekUnresolvedCount > 0 
                            ? `${currentWeekUnresolvedCount} Unresolved Game${currentWeekUnresolvedCount !== 1 ? 's' : ''} in Week ${currentWeek}`
                            : `${totalUnresolvedCount} Unresolved Game${totalUnresolvedCount !== 1 ? 's' : ''} in Season`
                          }
                        </h3>
                        <p className="text-xs text-gray-600 dark:text-gray-300">
                          {currentWeekUnresolvedCount > 0 
                            ? 'Auto-resolve based on team records and current standings'
                            : 'Navigate to weeks with unresolved games to resolve them'
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleResolveUnresolvedGames}
                        className="btn btn-primary bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-3 h-8 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 text-xs flex items-center justify-center"
                      >
                        🎯 Resolve This Week
                      </button>
                      <button
                        onClick={handleResolveWholeSeason}
                        className="btn btn-primary bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white px-3 h-8 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 text-xs flex items-center justify-center"
                      >
                        🚀 Resolve Whole Season
                      </button>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {/* Week Info */}
          <div className="text-center mb-6">
            <div className="text-xl font-semibold text-gray-800 dark:text-white bg-white dark:bg-gray-800 py-2 px-4 rounded-lg shadow-sm inline-block">
              {isPlayoffWeek(currentWeek) ? getPlayoffWeekName(currentWeek) : `Week ${currentWeek}`}: Sep 4th - Sep 8th
            </div>
            {selectedSchedule && (
              <div className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                📅 Using schedule: {selectedSchedule.name}
              </div>
            )}
            {loading && (
              <div className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                🔄 Loading live NFL data...
              </div>
            )}
            {error && (
              <div className="text-sm text-red-600 dark:text-red-400 mt-2">
                ⚠️ {error} (using fallback data)
              </div>
            )}
            {/* Playoff status message */}
            {isPlayoffWeek(currentWeek) && (
              <div className="text-sm text-purple-600 dark:text-purple-400 mt-2 font-medium">
                🏆 {getPlayoffStatusMessage(currentWeek)}
              </div>
            )}
          </div>

          {/* Bulk Resolve Progress Indicator */}
          {bulkResolveProgress && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200">
                  🚀 Resolving Season...
                </h3>
                <span className="text-sm text-blue-600 dark:text-blue-300">
                  {bulkResolveProgress.currentWeek}/{bulkResolveProgress.totalWeeks} weeks
                </span>
              </div>
              
              <div className="mb-2">
                <div className="flex justify-between text-sm text-blue-700 dark:text-blue-300 mb-1">
                  <span>Week Progress</span>
                  <span>{bulkResolveProgress.currentGame}/{bulkResolveProgress.totalGames} games</span>
                </div>
                <div className="w-full bg-blue-200 dark:bg-blue-700 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${bulkResolveProgress.totalGames > 0 ? (bulkResolveProgress.currentGame / bulkResolveProgress.totalGames) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
              </div>
              
              <div className="mb-2">
                <div className="flex justify-between text-sm text-blue-700 dark:text-blue-300 mb-1">
                  <span>Overall Progress</span>
                  <span>{Math.round((bulkResolveProgress.currentWeek / bulkResolveProgress.totalWeeks) * 100)}%</span>
                </div>
                <div className="w-full bg-blue-200 dark:bg-blue-700 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${(bulkResolveProgress.currentWeek / bulkResolveProgress.totalWeeks) * 100}%` 
                    }}
                  ></div>
                </div>
              </div>
              
              <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                {bulkResolveProgress.message}
              </p>
            </div>
          )}

          {/* Schedule Generation Progress Indicator */}
          {scheduleGenerationProgress && (
            <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-200">
                  🏈 Generating NFL Schedule...
                </h3>
                <span className="text-sm text-purple-600 dark:text-purple-300">
                  {scheduleGenerationProgress.percentage}%
                </span>
              </div>
              
              <div className="mb-2">
                <div className="flex justify-between text-sm text-purple-700 dark:text-purple-300 mb-1">
                  <span>Current Step</span>
                  <span>{scheduleGenerationProgress.step}</span>
                </div>
                <div className="w-full bg-purple-200 dark:bg-purple-700 rounded-full h-2">
                  <div 
                    className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${scheduleGenerationProgress.percentage}%` 
                    }}
                  ></div>
                </div>
              </div>
              
              <p className="text-sm text-purple-700 dark:text-purple-300 font-medium">
                {scheduleGenerationProgress.message}
              </p>
            </div>
          )}



          {/* Main Content - Standings View */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* AFC Standings */}
            <StandingsPanel 
              title="AFC"
              standings={standings.filter(s => s.team.conference === 'AFC')}
              viewMode={standingsViewMode}
              onViewModeChange={setStandingsViewMode}
              onTeamClick={handleTeamClick}
              eliminatedTeams={(() => {
                if (isPlayoffWeek(currentWeek)) {
                  const playoffBrackets = generatePlayoffBrackets(standings, currentWeek, selectedSchedule);
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
                currentWeek={currentWeek}
              />
            </div>

            {/* NFC Standings */}
            <StandingsPanel 
              title="NFC"
              standings={standings.filter(s => s.team.conference === 'NFC')}
              viewMode={standingsViewMode}
              onViewModeChange={setStandingsViewMode}
              onTeamClick={handleTeamClick}
              align="right"
              eliminatedTeams={(() => {
                if (isPlayoffWeek(currentWeek)) {
                  const playoffBrackets = generatePlayoffBrackets(standings, currentWeek, selectedSchedule);
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
          <div className="mt-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">Teams on BYE - Week {currentWeek}</h3>
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
                return <p className="text-gray-600 dark:text-gray-400">No schedule data for Week {currentWeek}</p>;
              }
              
              return teamsOnBye.length > 0 ? (
                <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
                  {teamsOnBye.map(team => (
                    <div key={team.id} className="flex flex-col items-center">
                      <div 
                        className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold overflow-hidden"
                        style={getTransparentTeamBadgeStyle()}
                      >
                        <img 
                          src={getTeamDisplay(team.id, false).content}
                          alt={team.abbreviation}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            // Fallback to text if image fails to load
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                        <span className="text-xs font-bold hidden">{team.abbreviation}</span>
                      </div>
                      <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {team.abbreviation}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 dark:text-gray-400">NONE</p>
              );
            })()}
          </div>

          {/* Footer - Removed Legend and Draft Order */}
        </div>
      </div>
      
              {/* Data Protection Status - Removed */}
      
      {/* Welcome Modal */}
      <WelcomeModal
        isOpen={showWelcomeModal}
        onClose={handleWelcomeModalClose}
        onGenerateSchedule={handleRegenerateSchedule}
        isGenerating={isGeneratingSchedule}
        hasExistingSchedule={selectedSchedule !== null}
      />

      {/* Generation Error Modal */}
      <GenerationErrorModal
        isOpen={!!generationError}
        error={generationError}
        onClose={() => setGenerationError(null)}
        onRetry={handleRegenerateSchedule}
      />

      {/* Auto-Save Indicator */}
      <AutoSaveIndicator
        isVisible={showAutoSaveIndicator}
        onHide={() => setShowAutoSaveIndicator(false)}
      />

      {/* Season Resolved Modal */}
      {showSeasonResolvedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Full Season Resolved!
            </h2>
            <p className="text-gray-600 mb-6">
              All regular season games have been automatically resolved. The playoff brackets are now available!
            </p>
            <button
              onClick={() => setShowSeasonResolvedModal(false)}
              className="btn btn-primary bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200"
            >
              🎉 Continue to Playoffs
            </button>
          </div>
        </div>
      )}

      {/* Super Bowl Victory Modal */}
      {showSuperBowlVictoryModal && superBowlWinner && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 rounded-2xl p-12 max-w-2xl mx-4 text-center shadow-2xl border-4 border-yellow-300">
            <div className="text-8xl mb-6 animate-bounce">🏆</div>
            <h1 className="text-4xl font-bold text-white mb-4 drop-shadow-lg">
              SUPER BOWL CHAMPIONS!
            </h1>
            <div className="bg-white rounded-xl p-6 mb-8 shadow-lg">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                {superBowlWinner.name}
              </h2>
              <p className="text-lg text-gray-600 mb-4">
                {superBowlWinner.conference} • {superBowlWinner.division}
              </p>
              <div className="text-2xl font-bold text-yellow-600">
                🎉 CONGRATULATIONS! 🎉
              </div>
            </div>
            <p className="text-white text-lg mb-8 drop-shadow-md">
              The {superBowlWinner.name} have won Super Bowl LVIII and are the 2025-2026 NFL Champions!
            </p>
            <button
              onClick={handleSuperBowlVictoryModalClose}
              className="bg-white text-yellow-600 hover:bg-gray-100 px-8 py-3 rounded-xl font-bold text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              🎊 Celebrate Victory! 🎊
            </button>
          </div>
        </div>
      )}

      {/* Team Schedule Modal */}
      <TeamScheduleModal
        isOpen={showTeamScheduleModal}
        onClose={handleTeamScheduleModalClose}
        team={selectedTeam}
        selectedSchedule={selectedSchedule}
        currentWeek={currentWeek}
      />
    </>
  );
} 