/**
 * Team-by-Team View Component
 * Focus on building one team's schedule at a time
 */

import { useScheduleStore } from '@/store/scheduleStore';
import { TeamCard, GameCard } from './TeamCard';
import { FeasibilityPanel } from './FeasibilityPanel';
import { NFL_TEAMS } from '@/data/teams';
import { Game } from '@/types';

export function TeamByTeamView() {
  const { currentTeam, setTeam, schedule, feasibility, placeGame, removeGame } = useScheduleStore();

  const teamState = currentTeam ? schedule.teams.get(currentTeam) : null;
  const teamGames = currentTeam ? getTeamGames(currentTeam) : [];

  function getTeamGames(teamId: string): Game[] {
    return schedule.games
      .filter(g => g.homeTeam === teamId || g.awayTeam === teamId)
      .sort((a, b) => a.week - b.week);
  }

  if (!currentTeam || !teamState) {
    return (
      <div className="flex flex-col h-full">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Select a Team</h2>
          <div className="grid grid-cols-4 gap-3">
            {NFL_TEAMS.map(team => (
              <TeamCard
                key={team.id}
                teamId={team.id}
                onClick={() => setTeam(team.id)}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Team Header */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setTeam(null)}
              className="px-3 py-2 bg-gray-200 text-gray-700 rounded text-sm"
            >
              ← Back
            </button>
            <div>
              <h2 className="text-2xl font-bold">{currentTeam}</h2>
              <div className="text-sm text-gray-600">
                {teamState.remain.total} games remaining
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="font-medium">{teamState.remain.div}</div>
              <div className="text-gray-600">Division</div>
            </div>
            <div className="text-center">
              <div className="font-medium">{teamState.remain.home} / {teamState.remain.away}</div>
              <div className="text-gray-600">Home / Away</div>
            </div>
            <div className="text-center">
              <div className="font-medium">{teamState.remain.bye === 1 ? 'Needed' : 'Assigned'}</div>
              <div className="text-gray-600">Bye Week</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-3 gap-4 overflow-hidden">
        {/* Team Schedule */}
        <div className="col-span-2 bg-white rounded-lg shadow p-4 overflow-y-auto">
          <h3 className="font-semibold mb-3">17-Game Schedule</h3>
          
          <div className="space-y-2">
            {Array.from({ length: 17 }, (_, i) => i + 1).map(gameNum => {
              const game = teamGames[gameNum - 1];
              
              return (
                <div key={gameNum} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded text-sm font-medium">
                    {gameNum}
                  </div>
                  
                  {game ? (
                    <div className="flex-1 relative group">
                      <GameCard
                        homeTeamId={game.homeTeam}
                        awayTeamId={game.awayTeam}
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        Week {game.week}
                      </div>
                      <button
                        onClick={() => removeGame(game.id)}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 text-center text-gray-400 py-4">
                      Not scheduled
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Feasibility Panel */}
        <div className="bg-white rounded-lg shadow p-4 overflow-y-auto">
          <h3 className="font-semibold mb-3">Constraints</h3>
          <FeasibilityPanel results={feasibility} />
          
          <div className="mt-6">
            <h4 className="text-sm font-semibold mb-2">Schedule Info</h4>
            <div className="text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Home Streak:</span>
                <span className="font-medium">{teamState.streaks.home}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Away Streak:</span>
                <span className="font-medium">{teamState.streaks.away}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

