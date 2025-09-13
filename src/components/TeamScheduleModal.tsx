import React from 'react';
import { Team, Game } from '../types/nfl';
import { getTeamById } from '../data/nflData';
import { getTeamDisplay } from '../utils/helmetIcons';

interface TeamScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: Team | null;
  selectedSchedule: any;
  currentWeek: number;
}

const TeamScheduleModal: React.FC<TeamScheduleModalProps> = ({
  isOpen,
  onClose,
  team,
  selectedSchedule,
  currentWeek
}) => {
  if (!isOpen || !team || !selectedSchedule) return null;

  // Get all games for this team from the schedule
  const getTeamGames = (): Array<{
    week: number;
    game: any;
    isHome: boolean;
    opponent: Team | null;
    result: 'win' | 'loss' | 'tie' | 'upcoming' | 'bye';
  }> => {
    const teamGames: Array<{
      week: number;
      game: any;
      isHome: boolean;
      opponent: Team | null;
      result: 'win' | 'loss' | 'tie' | 'upcoming' | 'bye';
    }> = [];

    // Check each week for games involving this team
    for (let week = 1; week <= 18; week++) {
      const weekGames = selectedSchedule.weeks[week]?.games || [];
      const teamGame = weekGames.find((game: any) => 
        game.homeTeam === team.id || game.awayTeam === team.id
      );

      if (teamGame) {
        const isHome = teamGame.homeTeam === team.id;
        const opponentId = isHome ? teamGame.awayTeam : teamGame.homeTeam;
        const opponent = getTeamById(opponentId) || null;

        let result: 'win' | 'loss' | 'tie' | 'upcoming' | 'bye';
        if (teamGame.homeScore !== undefined && teamGame.awayScore !== undefined) {
          const teamScore = isHome ? teamGame.homeScore : teamGame.awayScore;
          const opponentScore = isHome ? teamGame.awayScore : teamGame.homeScore;
          
          if (teamScore > opponentScore) result = 'win';
          else if (teamScore < opponentScore) result = 'loss';
          else result = 'tie';
        } else {
          result = 'upcoming';
        }

        teamGames.push({
          week,
          game: teamGame,
          isHome,
          opponent,
          result
        });
      } else {
        // Team has a bye week
        teamGames.push({
          week,
          game: null,
          isHome: false,
          opponent: null,
          result: 'bye'
        });
      }
    }

    return teamGames;
  };

  const teamGames = getTeamGames();
  const playedGames = teamGames.filter(g => g.result !== 'upcoming' && g.result !== 'bye');
  const upcomingGames = teamGames.filter(g => g.result === 'upcoming');
  const byeWeeks = teamGames.filter(g => g.result === 'bye');

  const getResultColor = (result: string) => {
    switch (result) {
      case 'win': return 'text-green-600 dark:text-green-400';
      case 'loss': return 'text-red-600 dark:text-red-400';
      case 'tie': return 'text-yellow-600 dark:text-yellow-400';
      case 'upcoming': return 'text-gray-600 dark:text-gray-400';
      case 'bye': return 'text-gray-500 dark:text-gray-500';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getResultText = (result: string) => {
    switch (result) {
      case 'win': return 'W';
      case 'loss': return 'L';
      case 'tie': return 'T';
      case 'upcoming': return 'TBD';
      case 'bye': return 'BYE';
      default: return 'TBD';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded flex items-center justify-center overflow-hidden">
              <img 
                src={getTeamDisplay(team.id, false).content}
                alt={team.abbreviation}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {team.name}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {team.conference} • {team.division}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Season Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Games Played</h3>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {playedGames.length}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Upcoming Games</h3>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {upcomingGames.length}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Bye Week</h3>
              <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                {byeWeeks.length}
              </p>
            </div>
          </div>

                     {/* Weekly Schedule */}
           <div className="space-y-4">
             <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
               Weekly Schedule
             </h3>
             
             <div className="overflow-x-auto">
               <table className="w-full border-collapse">
                 <thead>
                   <tr className="border-b border-gray-200 dark:border-gray-700">
                     <th className="text-left py-2 px-3 font-semibold text-gray-900 dark:text-white">Week</th>
                     <th className="text-left py-2 px-3 font-semibold text-gray-900 dark:text-white">Opponent</th>
                     <th className="text-center py-2 px-3 font-semibold text-gray-900 dark:text-white">Result</th>
                     <th className="text-center py-2 px-3 font-semibold text-gray-900 dark:text-white">Score</th>
                   </tr>
                 </thead>
                 <tbody>
                   {teamGames.map(({ week, game, isHome, opponent, result }) => (
                     <tr 
                       key={week}
                       className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                         week === currentWeek 
                           ? 'bg-blue-50 dark:bg-blue-900/20' 
                           : ''
                       }`}
                     >
                       <td className="py-3 px-3 font-medium text-gray-900 dark:text-white">
                         Week {week}
                       </td>
                       <td className="py-3 px-3">
                         {result === 'bye' ? (
                           <span className="text-gray-500 dark:text-gray-400">Bye Week</span>
                         ) : opponent ? (
                           <div className="flex items-center space-x-2">
                             <div className="w-6 h-6 rounded flex items-center justify-center overflow-hidden">
                               <img 
                                 src={getTeamDisplay(opponent.id, false).content}
                                 alt={opponent.abbreviation}
                                 className="w-full h-full object-contain"
                               />
                             </div>
                             <span className="text-gray-900 dark:text-white">
                               {isHome ? 'vs' : '@'} {opponent.abbreviation}
                             </span>
                           </div>
                         ) : (
                           <span className="text-gray-500 dark:text-gray-400">TBD</span>
                         )}
                       </td>
                       <td className="py-3 px-3 text-center">
                         <span className={`font-bold ${getResultColor(result)}`}>
                           {getResultText(result)}
                         </span>
                       </td>
                       <td className="py-3 px-3 text-center text-gray-600 dark:text-gray-400">
                         {game && game.homeScore !== undefined && game.awayScore !== undefined ? (
                           `${game.awayScore} - ${game.homeScore}`
                         ) : (
                           '-'
                         )}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default TeamScheduleModal;

