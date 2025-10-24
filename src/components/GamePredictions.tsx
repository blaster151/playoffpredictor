import React, { useState } from 'react';
import { Game } from '../types/nfl';
import { getTeamById } from '../data/nflData';
import { getTeamBadgeStyle, getTransparentTeamBadgeStyle } from '../utils/teamColors';
import { GameResolver } from '../utils/gameResolver';
import { getTeamDisplay } from '../utils/helmetIcons';
import { isPlayoffWeek } from '../utils/playoffBracketGenerator';

interface GamePredictionsProps {
  games: Game[];
  onGameUpdate: (gameId: string, awayScore: number, homeScore: number) => void;
  onSubmitWeek: () => void;
  onViewPools: () => void;
  resolvingGames?: Set<string>;
  winnerAnimations?: Set<string>;
  currentWeek?: number;
}

const GamePredictions: React.FC<GamePredictionsProps> = ({ 
  games, 
  onGameUpdate, 
  onSubmitWeek, 
  onViewPools,
  resolvingGames = new Set(),
  winnerAnimations = new Set(),
  currentWeek
}) => {
  // Local state for input values to allow immediate typing
  const [inputScores, setInputScores] = useState<Record<string, { away: number; home: number }>>({});

  const handleScoreChange = (gameId: string, team: 'away' | 'home', value: number) => {
    // Prevent negative scores
    const validValue = Math.max(0, value);
    
    // Update local state immediately for responsive typing
    setInputScores(prev => ({
      ...prev,
      [gameId]: {
        ...prev[gameId],
        [team]: validValue
      }
    }));
    
    // Also update the parent immediately for real-time standings updates
    const currentInputs = inputScores[gameId] || {};
    const game = games.find(g => g.id === gameId);
    if (!game) return;
    
    const currentAwayScore = game.awayScore !== undefined ? game.awayScore : undefined;
    const currentHomeScore = game.homeScore !== undefined ? game.homeScore : undefined;
    
    const newAwayScore = team === 'away' ? validValue : (currentInputs.away !== undefined ? currentInputs.away : currentAwayScore);
    const newHomeScore = team === 'home' ? validValue : (currentInputs.home !== undefined ? currentInputs.home : currentHomeScore);
    
    // Only call the parent's update function if both scores are defined
    if (newAwayScore !== undefined && newHomeScore !== undefined) {
      onGameUpdate(gameId, newAwayScore, newHomeScore);
    }
  };

  const handleAutoWin = (gameId: string, winningTeamId: string, homeTeamId: string, awayTeamId: string) => {
    // Generate auto-win scores using realistic NFL distribution
    const scores = GameResolver.generateAutoWinScores(winningTeamId, homeTeamId, awayTeamId, Date.now());
    
    // Update the game with new scores
    onGameUpdate(gameId, scores.awayScore, scores.homeScore);
    
    // Clear any pending input scores for this game
    setInputScores(prev => {
      const newScores = { ...prev };
      delete newScores[gameId];
      return newScores;
    });
  };



  const groupGamesByType = () => {
    // For playoff weeks, show all games together
    if (currentWeek && isPlayoffWeek(currentWeek)) {
      return { 
        afcGames: [], 
        nfcGames: [], 
        interconferenceGames: games,
        playoffGames: games 
      };
    }

    // For regular season, categorize by conference
    const afcGames = games.filter(game => {
      const awayTeam = getTeamById(game.awayTeam);
      const homeTeam = getTeamById(game.homeTeam);
      return awayTeam?.conference === 'AFC' && homeTeam?.conference === 'AFC';
    });

    const nfcGames = games.filter(game => {
      const awayTeam = getTeamById(game.awayTeam);
      const homeTeam = getTeamById(game.homeTeam);
      return awayTeam?.conference === 'NFC' && homeTeam?.conference === 'NFC';
    });

    const interconferenceGames = games.filter(game => {
      const awayTeam = getTeamById(game.awayTeam);
      const homeTeam = getTeamById(game.homeTeam);
      return awayTeam?.conference !== homeTeam?.conference;
    });

    return { afcGames, nfcGames, interconferenceGames, playoffGames: [] };
  };

  const { afcGames, nfcGames, interconferenceGames, playoffGames } = groupGamesByType();

  const renderGameSection = (title: string, games: Game[]) => {
    if (games.length === 0) return null;

    return (
      <div className="mb-3">
        <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center text-sm">
          {title === 'AFC' && (
            <img 
              src="/icons/afc.png" 
              alt="AFC" 
              className="w-5 h-5 mr-2"
            />
          )}
          {title === 'NFC' && (
            <img 
              src="/icons/nfc.png" 
              alt="NFC" 
              className="w-5 h-5 mr-2"
            />
          )}
          {title === 'A vs N' && <span className="mr-2">⚔️</span>}
          {title}
        </h3>
        <div className="space-y-2">
          {games.map(game => {
            const awayTeam = getTeamById(game.awayTeam);
            const homeTeam = getTeamById(game.homeTeam);
            
            // Use local input state if available, otherwise use actual game scores
            const currentInputs = inputScores[game.id] || {};
            const awayScore = currentInputs.away !== undefined ? currentInputs.away : (game.awayScore !== undefined ? game.awayScore : undefined);
            const homeScore = currentInputs.home !== undefined ? currentInputs.home : (game.homeScore !== undefined ? game.homeScore : undefined);
            
            // Check if user has modified the scores from default
            const hasUserModifiedScores = currentInputs.away !== undefined || currentInputs.home !== undefined || 
                                         game.awayScore !== undefined || game.homeScore !== undefined;
            
            // Determine winner
            const awayWins = awayScore !== undefined && homeScore !== undefined && awayScore > homeScore;
            const homeWins = homeScore !== undefined && awayScore !== undefined && homeScore > awayScore;
            const isTie = awayScore !== undefined && homeScore !== undefined && awayScore === homeScore && hasUserModifiedScores;

            return (
              <div key={game.id} className={`game-prediction rounded-lg p-2 transition-all duration-300 ${
                resolvingGames.has(game.id) 
                  ? 'bg-yellow-100 dark:bg-yellow-900 border-2 border-yellow-400 shadow-lg' 
                  : game.day === 'Monday' 
                    ? 'bg-blue-50 dark:bg-blue-900 border-2 border-blue-200 dark:border-blue-700' 
                    : 'bg-gray-50 dark:bg-gray-700'
              }`}>
                <div className="flex items-center justify-between space-x-1">
                                      <div className={`flex items-center space-x-1 ${awayWins ? 'font-bold text-green-600' : ''}`}>
                    <div 
                      className={`w-10 h-10 rounded flex items-center justify-center text-xs font-bold cursor-pointer hover:scale-110 transition-all duration-200 overflow-hidden ${
                        resolvingGames.has(game.id) ? 'animate-pulse' : ''
                      } ${
                        winnerAnimations.has(game.awayTeam) ? 'scale-115' : ''
                      }`}
                      style={{
                        ...getTransparentTeamBadgeStyle(),
                        animation: resolvingGames.has(game.id) ? 'shake 0.5s ease-in-out infinite' : winnerAnimations.has(game.awayTeam) ? 'winnerScale 1s ease-in-out' : 'none'
                      }}
                      onClick={() => handleAutoWin(game.id, game.awayTeam, game.homeTeam, game.awayTeam)}
                      title={`Click to give ${awayTeam?.abbreviation} an auto-win`}
                    >
                      <img 
                        src={getTeamDisplay(awayTeam?.id || '', false).content}
                        alt={awayTeam?.abbreviation || 'Team'}
                        className="w-full h-full object-contain"
                        style={{ imageRendering: 'crisp-edges' }}
                        onError={(e) => {
                          // Fallback to text if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <span className="text-xs font-bold hidden">{awayTeam?.abbreviation}</span>
                    </div>
                    <input
                      type="number"
                      className="w-12 px-1 py-1 border border-gray-300 dark:border-gray-600 rounded text-center bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs"
                      value={awayScore === undefined ? '' : awayScore}
                      onChange={(e) => handleScoreChange(game.id, 'away', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  
                  <div className="relative flex items-center justify-center">
                    <span className={`absolute -top-4 text-xs ${game.day === 'Monday' ? 'text-blue-600 dark:text-blue-400 font-semibold' : game.day === 'Thursday' ? 'text-purple-600 dark:text-purple-400 font-semibold' : 'text-gray-500 dark:text-gray-400'}`}>
                      {game.day === 'Monday' ? '🌙' : game.day === 'Thursday' ? '📺' : game.day}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 font-medium">vs</span>
                    {game.time && (
                      <span className="absolute -bottom-4 text-xs text-gray-500 dark:text-gray-400">
                        {game.time}
                      </span>
                    )}
                  </div>
                  
                  <div className={`flex items-center space-x-1 ${homeWins ? 'font-bold text-green-600' : ''}`}>
                    <input
                      type="number"
                      className="w-12 px-1 py-1 border border-gray-300 dark:border-gray-600 rounded text-center bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs"
                      value={homeScore === undefined ? '' : homeScore}
                      onChange={(e) => handleScoreChange(game.id, 'home', parseInt(e.target.value) || 0)}
                    />
                    <div 
                      className={`w-10 h-10 rounded flex items-center justify-center text-xs font-bold cursor-pointer hover:scale-110 transition-all duration-200 overflow-hidden ${
                        resolvingGames.has(game.id) ? 'animate-pulse' : ''
                      } ${
                        winnerAnimations.has(game.homeTeam) ? 'scale-115' : ''
                      }`}
                      style={{
                        ...getTransparentTeamBadgeStyle(),
                        animation: resolvingGames.has(game.id) ? 'shake 0.5s ease-in-out infinite' : winnerAnimations.has(game.homeTeam) ? 'winnerScale 1s ease-in-out' : 'none'
                      }}
                      onClick={() => handleAutoWin(game.id, game.homeTeam, game.homeTeam, game.awayTeam)}
                      title={`Click to give ${homeTeam?.abbreviation} an auto-win`}
                    >
                      <img 
                        src={getTeamDisplay(homeTeam?.id || '', true).content}
                        alt={homeTeam?.abbreviation || 'Team'}
                        className="w-full h-full object-contain"
                        style={{ imageRendering: 'crisp-edges' }}
                        onError={(e) => {
                          // Fallback to text if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <span className="text-xs font-bold hidden">{homeTeam?.abbreviation}</span>
                    </div>
                  </div>
                </div>
                
                {awayWins && (
                  <div className="text-xs text-green-600 font-medium mt-1">
                    {awayTeam?.abbreviation} wins!
                  </div>
                )}
                {homeWins && (
                  <div className="text-xs text-green-600 font-medium mt-1">
                    {homeTeam?.abbreviation} wins!
                  </div>
                )}
                {isTie && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">
                    Tie game
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
            <span className="mr-2">🎯</span>
            Game Predictions
          </h2>
          <div className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900 px-2 py-1 rounded-full flex items-center">
            <span className="mr-1">💾</span>
            Auto-saved
          </div>
        </div>
        
        {currentWeek && isPlayoffWeek(currentWeek) ? (
          renderGameSection('Playoff Games', playoffGames)
        ) : (
          <div className="grid gap-6 w-full" style={{ gridTemplateColumns: `repeat(${[afcGames, interconferenceGames, nfcGames].filter(games => games.length > 0).length}, minmax(0, 1fr))` }}>
            {/* AFC Games Column */}
            {afcGames.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 min-w-0">
                {renderGameSection('AFC', afcGames)}
              </div>
            )}
            
            {/* Interconference Games Column */}
            {interconferenceGames.length > 0 && (
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 min-w-0">
                {renderGameSection('A vs N', interconferenceGames)}
              </div>
            )}
            
            {/* NFC Games Column */}
            {nfcGames.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 min-w-0">
                {renderGameSection('NFC', nfcGames)}
              </div>
            )}
          </div>
        )}

        {/* Pool buttons hidden - not needed for this implementation */}
      </div>
  );
};

export default GamePredictions; 