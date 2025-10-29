/**
 * Week-by-Week View Component
 * Timeline-based schedule builder
 */

import { useState } from 'react';
import { useScheduleStore } from '@/store/scheduleStore';
import { Game, Timeslot, TeamId } from '@/types';
import { TeamCard, GameCard } from './TeamCard';
import { FeasibilityPanel } from './FeasibilityPanel';
import clsx from 'clsx';

export function WeekByWeekView() {
  const { currentWeek, setWeek, schedule, feasibility, placeGame, removeGame } = useScheduleStore();
  const [selectedHome, setSelectedHome] = useState<TeamId | null>(null);
  const [selectedAway, setSelectedAway] = useState<TeamId | null>(null);

  const weekState = schedule.weeks.get(currentWeek);
  const availableTeams = getAvailableTeams();

  function getAvailableTeams(): TeamId[] {
    const available: TeamId[] = [];
    for (const [teamId, teamState] of schedule.teams.entries()) {
      if (!teamState.busy.has(currentWeek) && teamState.remain.total > 0) {
        available.push(teamId);
      }
    }
    return available.sort();
  }

  function handlePlaceGame() {
    if (!selectedHome || !selectedAway || !weekState) return;

    // Determine game category (simplified)
    const game: Game = {
      id: `${currentWeek}-${selectedHome}-${selectedAway}`,
      week: currentWeek,
      homeTeam: selectedHome,
      awayTeam: selectedAway,
      category: 'INTRA', // Simplified - would need to determine from teams
      timeslot: 'SUN_1PM', // Default slot
    };

    placeGame(game);
    setSelectedHome(null);
    setSelectedAway(null);
  }

  if (!weekState) return null;

  const canPlaceGame = selectedHome && selectedAway && selectedHome !== selectedAway;

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Week Navigation */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow">
        <button
          onClick={() => setWeek(Math.max(1, currentWeek - 1))}
          disabled={currentWeek === 1}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ← Previous Week
        </button>
        
        <div className="text-center">
          <div className="text-2xl font-bold">Week {currentWeek}</div>
          <div className="text-sm text-gray-600">
            {weekState.slots.filled} / {weekState.slots.total} games scheduled
          </div>
        </div>

        <button
          onClick={() => setWeek(Math.min(schedule.rules.totalWeeks, currentWeek + 1))}
          disabled={currentWeek === schedule.rules.totalWeeks}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next Week →
        </button>
      </div>

      <div className="flex-1 grid grid-cols-3 gap-4 overflow-hidden">
        {/* Available Teams */}
        <div className="bg-white rounded-lg shadow p-4 overflow-y-auto">
          <h3 className="font-semibold mb-3">Available Teams</h3>
          <div className="space-y-2">
            {availableTeams.map(teamId => {
              const teamState = schedule.teams.get(teamId);
              return (
                <TeamCard
                  key={teamId}
                  teamId={teamId}
                  showStatus
                  remainingGames={teamState?.remain.total}
                  className={clsx(
                    selectedHome === teamId && 'ring-2 ring-blue-500',
                    selectedAway === teamId && 'ring-2 ring-green-500'
                  )}
                  onClick={() => {
                    if (!selectedHome) {
                      setSelectedHome(teamId);
                    } else if (!selectedAway && teamId !== selectedHome) {
                      setSelectedAway(teamId);
                    } else {
                      setSelectedHome(null);
                      setSelectedAway(null);
                    }
                  }}
                />
              );
            })}
          </div>

          {/* Game Builder */}
          {selectedHome && (
            <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
              <div className="text-sm font-medium mb-2">Building Game:</div>
              <div className="text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Away:</span>
                  <span className="font-medium">{selectedAway || 'Select away team...'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Home:</span>
                  <span className="font-medium">{selectedHome}</span>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handlePlaceGame}
                  disabled={!canPlaceGame}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Place Game
                </button>
                <button
                  onClick={() => {
                    setSelectedHome(null);
                    setSelectedAway(null);
                  }}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded text-sm"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Week Schedule */}
        <div className="bg-white rounded-lg shadow p-4 overflow-y-auto">
          <h3 className="font-semibold mb-3">Week {currentWeek} Schedule</h3>
          
          {weekState.games.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              No games scheduled yet
            </div>
          ) : (
            <div className="space-y-2">
              {weekState.games.map(game => (
                <div key={game.id} className="relative group">
                  <GameCard
                    homeTeamId={game.homeTeam}
                    awayTeamId={game.awayTeam}
                  />
                  <button
                    onClick={() => removeGame(game.id)}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Byes */}
          {weekState.byes.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Bye Week:</h4>
              <div className="space-y-1">
                {weekState.byes.map(bye => (
                  <div key={bye.teamId} className="text-sm text-gray-600">
                    {bye.teamId}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Feasibility Feedback */}
        <div className="bg-white rounded-lg shadow p-4 overflow-y-auto">
          <h3 className="font-semibold mb-3">Constraints</h3>
          <FeasibilityPanel results={feasibility} />
        </div>
      </div>
    </div>
  );
}

