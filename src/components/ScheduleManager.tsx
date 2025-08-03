import React, { useState, useEffect } from 'react';
import { SavedSchedule, ScheduleSaver } from '../utils/scheduleSaver';
import { Team } from '../types/nfl';
import { generateMatchups, createScheduleConfig } from '../utils/scheduleGenerator';

interface ScheduleManagerProps {
  teams: Team[];
  onScheduleSelect?: (schedule: SavedSchedule | null) => void;
  currentWeek: number;
  onWeekChange: (week: number) => void;
  className?: string;
}

const ScheduleManager: React.FC<ScheduleManagerProps> = ({ 
  teams, 
  onScheduleSelect,
  currentWeek,
  onWeekChange,
  className = '' 
}) => {
  const [schedules, setSchedules] = useState<SavedSchedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<SavedSchedule | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newScheduleName, setNewScheduleName] = useState('');
  const [newScheduleDescription, setNewScheduleDescription] = useState('');
  const [editableScores, setEditableScores] = useState<{[gameId: string]: {away: number | '', home: number | ''}}>({});

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = () => {
    const savedSchedules = ScheduleSaver.loadAllSchedules();
    setSchedules(savedSchedules);
    
    // Auto-select the first schedule if none selected
    if (!selectedSchedule && savedSchedules.length > 0) {
      setSelectedSchedule(savedSchedules[0]);
      onScheduleSelect?.(savedSchedules[0]);
    }
  };

  const handleScheduleSelect = (schedule: SavedSchedule) => {
    setSelectedSchedule(schedule);
    onScheduleSelect?.(schedule);
  };

  const handleCreateSchedule = async () => {
    if (!newScheduleName.trim()) return;

    console.log('🔧 Generating full NFL schedule...');
    const fullScheduleGames = generateFullNFLSchedule(teams);
    console.log(`📊 Generated ${fullScheduleGames.length} games`);
    
    try {
      const newSchedule = await ScheduleSaver.saveSchedule(fullScheduleGames, teams, {
        name: newScheduleName,
        description: newScheduleDescription,
        season: 2025,
        generatedBy: 'manual',
      });

      setSchedules(prev => [...prev, newSchedule]);
      setSelectedSchedule(newSchedule);
      onScheduleSelect?.(newSchedule);
      
      // Navigate to Week 1 if user is not already there
      if (currentWeek !== 1) {
        onWeekChange?.(1);
        console.log('📅 Navigated to Week 1 after schedule creation');
      }
      
      // Reset form
      setNewScheduleName('');
      setNewScheduleDescription('');
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create schedule:', error);
      alert('Failed to create schedule. Please try again.');
    }
  };

  const handleDeleteSchedule = (scheduleId: string) => {
    if (ScheduleSaver.deleteSchedule(scheduleId)) {
      setSchedules(prev => prev.filter(s => s.id !== scheduleId));
      
      if (selectedSchedule?.id === scheduleId) {
        const remaining = schedules.filter(s => s.id !== scheduleId);
        if (remaining.length > 0) {
          setSelectedSchedule(remaining[0]);
          onScheduleSelect?.(remaining[0]);
        } else {
          setSelectedSchedule(null);
          onScheduleSelect?.(null);
        }
      }
    }
  };

  const handleScoreUpdate = (gameId: string, team: 'away' | 'home', value: string) => {
    const numValue = value === '' ? '' : parseInt(value);
    setEditableScores(prev => ({
      ...prev,
      [gameId]: {
        ...prev[gameId],
        [team]: numValue
      }
    }));
  };

  const handleSaveScores = (gameId: string) => {
    const scores = editableScores[gameId];
    if (scores && typeof scores.away === 'number' && typeof scores.home === 'number') {
      console.log(`Saving scores for game ${gameId}: Away ${scores.away}, Home ${scores.home}`);
      // Clear the editable scores for this game
      setEditableScores(prev => {
        const newScores = { ...prev };
        delete newScores[gameId];
        return newScores;
      });
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
    
    // Convert matchups to weekly games (distribute across 18 weeks)
    // NFL has 18 weeks but teams play 17 games (1 bye week each)
    const games: Array<{ week: number; home: string; away: string }> = [];
    const totalGames = matchups.length;
    const gamesPerWeek = Math.ceil(totalGames / 18); // Use 18 weeks to distribute games
    
    console.log(`📊 Distributing ${totalGames} games across 18 weeks (~${gamesPerWeek} per week)`);
    
    matchups.forEach((matchup, index) => {
      const week = Math.floor(index / gamesPerWeek) + 1;
      // Ensure we don't exceed 18 weeks
      if (week <= 18) {
        games.push({
          week,
          home: matchup.home,
          away: matchup.away,
        });
      }
    });
    
    console.log(`📊 Final: ${games.length} games across ${games.length > 0 ? Math.max(...games.map(g => g.week)) : 0} weeks`);
    return games;
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">Schedule Manager</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn btn-primary"
        >
          {showCreateForm ? 'Cancel' : 'Create Schedule'}
        </button>
      </div>



      {showCreateForm && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Schedule Name
            </label>
            <input
              type="text"
              value={newScheduleName}
              onChange={(e) => setNewScheduleName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter schedule name..."
            />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <textarea
              value={newScheduleDescription}
              onChange={(e) => setNewScheduleDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter description..."
              rows={2}
            />
          </div>
          <button
            onClick={handleCreateSchedule}
            disabled={!newScheduleName.trim()}
            className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Full NFL Schedule
          </button>
        </div>
      )}

      <div className="space-y-2">
        {schedules.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            No schedules saved. Create your first schedule above.
          </p>
        ) : (
          schedules.map((schedule) => (
            <div
              key={schedule.id}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedSchedule?.id === schedule.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleScheduleSelect(schedule)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">{schedule.name}</h3>
                  {schedule.description && (
                    <p className="text-sm text-gray-600 mt-1">{schedule.description}</p>
                  )}
                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                    <span>Season: {schedule.season}</span>
                    <span>Games: {schedule.metadata.totalGames}</span>
                    <span>Generated: {schedule.metadata.generatedBy}</span>
                    <span>Created: {new Date(schedule.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSchedule(schedule.id);
                  }}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedSchedule && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-3">
            Selected: {selectedSchedule.name} - Week {currentWeek}
          </h3>
          <div className="bg-white p-4 rounded border">
            <div className="flex justify-between items-center mb-3">
              <span className="font-medium text-lg">Week {currentWeek} Matchups</span>
              <span className={`text-sm px-3 py-1 rounded ${
                ScheduleSaver.isWeekComplete(selectedSchedule, currentWeek) 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {ScheduleSaver.isWeekComplete(selectedSchedule, currentWeek) 
                  ? 'Complete' 
                  : `${ScheduleSaver.getWeekGames(selectedSchedule, currentWeek).length} games`
                }
              </span>
            </div>
            <div className="space-y-2">
              {ScheduleSaver.getWeekGames(selectedSchedule, currentWeek).map((game) => {
                const isEditing = editableScores[game.id];
                const awayScore = isEditing ? editableScores[game.id].away : game.awayScore;
                const homeScore = isEditing ? editableScores[game.id].home : game.homeScore;
                const awayWins = typeof awayScore === 'number' && typeof homeScore === 'number' && awayScore > homeScore;
                const homeWins = typeof awayScore === 'number' && typeof homeScore === 'number' && homeScore > awayScore;
                
                return (
                  <div key={game.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className={`flex items-center space-x-2 ${awayWins ? 'text-lg font-bold text-green-600' : 'text-base font-medium text-gray-800'}`}>
                        <span>{game.awayTeamAbbr}</span>
                        {isEditing ? (
                          <input
                            type="number"
                            value={editableScores[game.id]?.away || ''}
                            onChange={(e) => handleScoreUpdate(game.id, 'away', e.target.value)}
                            className="w-16 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0"
                            min="0"
                          />
                        ) : (
                          <span className="text-lg font-bold">{game.awayScore || 'TBD'}</span>
                        )}
                      </div>
                      <span className="text-gray-500 text-lg">@</span>
                      <div className={`flex items-center space-x-2 ${homeWins ? 'text-lg font-bold text-green-600' : 'text-base font-medium text-gray-800'}`}>
                        <span>{game.homeTeamAbbr}</span>
                        {isEditing ? (
                          <input
                            type="number"
                            value={editableScores[game.id]?.home || ''}
                            onChange={(e) => handleScoreUpdate(game.id, 'home', e.target.value)}
                            className="w-16 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0"
                            min="0"
                          />
                        ) : (
                          <span className="text-lg font-bold">{game.homeScore || 'TBD'}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {isEditing ? (
                        <button
                          onClick={() => handleSaveScores(game.id)}
                          className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                        >
                          Save
                        </button>
                      ) : (
                        <button
                          onClick={() => setEditableScores(prev => ({ ...prev, [game.id]: { away: '', home: '' } }))}
                          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {ScheduleSaver.getWeekGames(selectedSchedule, currentWeek).length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  No games scheduled for Week {currentWeek}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleManager; 