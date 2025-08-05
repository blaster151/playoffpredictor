import React, { useState } from 'react';
import { Game } from '../types/nfl';
import { getTeamById } from '../data/nflData';
import { getTeamBadgeStyle, getTransparentTeamBadgeStyle } from '../utils/teamColors';
import { GameResolver } from '../utils/gameResolver';
import { getTeamDisplay } from '../utils/helmetIcons';

interface GamePredictionsProps {
  games: Game[];
  onGameUpdate: (gameId: string, awayScore: number, homeScore: number) => void;
  onSubmitWeek: () => void;
  onViewPools: () => void;
  resolvingGames?: Set<string>;
  winnerAnimations?: Set<string>;
}

const GamePredictions: React.FC<GamePredictionsProps> = ({ 
  games, 
  onGameUpdate, 
  onSubmitWeek, 
  onViewPools,
  resolvingGames = new Set(),
  winnerAnimations = new Set()
}) => {
  // Local state for input values to allow immediate typing
  const [inputScores, setInputScores] = useState<Record<string, { away: number; home: number }>>({});

  const handleScoreChange = (gameId: string, team: 'away' | 'home', value: number) => {
    // Update local state immediately for responsive typing
    setInputScores(prev => ({
      ...prev,
      [gameId]: {
        ...prev[gameId],
        [team]: value
      }
    }));
    
    // Also update the parent immediately for real-time standings updates
    const currentInputs = inputScores[gameId] || {};
    const game = games.find(g => g.id === gameId);
    if (!game) return;
    
    const currentAwayScore = game.awayScore !== undefined ? game.awayScore : 10;
    const currentHomeScore = game.homeScore !== undefined ? game.homeScore : 10;
    
    const newAwayScore = team === 'away' ? value : (currentInputs.away !== undefined ? currentInputs.away : currentAwayScore);
    const newHomeScore = team === 'home' ? value : (currentInputs.home !== undefined ? currentInputs.home : currentHomeScore);
    
    // Call the parent's update function immediately
    onGameUpdate(gameId, newAwayScore, newHomeScore);
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

    return { afcGames, nfcGames, interconferenceGames };
  };

  const { afcGames, nfcGames, interconferenceGames } = groupGamesByType();

  const renderGameSection = (title: string, games: Game[]) => {
    if (games.length === 0) return null;

    return (
      <div className="mb-6">
        <h3 className="font-semibold text-gray-700 mb-3 flex items-center">
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
        <div className="space-y-3">
          {games.map(game => {
            const awayTeam = getTeamById(game.awayTeam);
            const homeTeam = getTeamById(game.homeTeam);
            
            // Use local input state if available, otherwise use actual game scores
            const currentInputs = inputScores[game.id] || {};
            const awayScore = currentInputs.away !== undefined ? currentInputs.away : (game.awayScore !== undefined ? game.awayScore : 10);
            const homeScore = currentInputs.home !== undefined ? currentInputs.home : (game.homeScore !== undefined ? game.homeScore : 10);
            
            // Check if user has modified the scores from default
            const hasUserModifiedScores = currentInputs.away !== undefined || currentInputs.home !== undefined || 
                                         (game.awayScore !== undefined && game.awayScore !== 10) || 
                                         (game.homeScore !== undefined && game.homeScore !== 10);
            
            // Determine winner
            const awayWins = awayScore > homeScore;
            const homeWins = homeScore > awayScore;
            const isTie = awayScore === homeScore && hasUserModifiedScores;

            return (
              <div key={game.id} className={`game-prediction rounded-lg p-3 transition-all duration-300 ${
                resolvingGames.has(game.id) 
                  ? 'bg-yellow-100 border-2 border-yellow-400 shadow-lg' 
                  : game.day === 'Monday' 
                    ? 'bg-blue-50 border-2 border-blue-200' 
                    : 'bg-gray-50'
              }`}>
                <div className="flex items-center justify-between space-x-2">
                  <div className={`flex items-center space-x-2 ${awayWins ? 'font-bold text-green-600' : ''}`}>
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
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                      value={awayScore}
                      onChange={(e) => handleScoreChange(game.id, 'away', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  
                  <span className="text-gray-500 font-medium">vs</span>
                  
                  <div className={`flex items-center space-x-2 ${homeWins ? 'font-bold text-green-600' : ''}`}>
                    <input
                      type="number"
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                      value={homeScore}
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
                  
                  <span className={`text-sm ml-2 ${game.day === 'Monday' ? 'text-blue-600 font-semibold' : 'text-gray-500'}`}>
                    {game.day === 'Monday' ? '🌙 MNF' : game.day}
                  </span>
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
                  <div className="text-xs text-gray-500 font-medium mt-1">
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
    <>
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          75% { transform: translateX(2px); }
        }
        
        @keyframes winnerScale {
          0% { transform: scale(1); }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
      `}</style>
      <div className="bg-white rounded-lg shadow-lg p-4 border-l-4 border-blue-500">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center">
          <span className="mr-2">🎯</span>
          Game Predictions
        </h2>
        <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center">
          <span className="mr-1">💾</span>
          Auto-saved
        </div>
      </div>
      
            {renderGameSection('AFC', afcGames)}
      {renderGameSection('A vs N', interconferenceGames)}
      {renderGameSection('NFC', nfcGames)}

      {/* Pool buttons hidden - not needed for this implementation */}
    </div>
    </>
  );
};

export default GamePredictions; 