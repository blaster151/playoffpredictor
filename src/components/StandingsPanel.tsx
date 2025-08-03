import React from 'react';
import { TeamStanding } from '../types/nfl';
import { getTeamDisplay } from '../utils/helmetIcons';
import { getTeamById } from '../data/nflData';

interface StandingsPanelProps {
  title: string;
  standings: TeamStanding[];
  viewMode: 'conference' | 'division';
  onViewModeChange: (mode: 'conference' | 'division') => void;
  eliminatedTeams?: Set<string>;
}

const StandingsPanel: React.FC<StandingsPanelProps> = ({ 
  title, 
  standings, 
  viewMode, 
  onViewModeChange,
  eliminatedTeams = new Set()
}) => {
  const divisions = ['North', 'South', 'East', 'West'];
  
  const getDivisionTeams = (division: string) => {
    return standings.filter(s => s.team.division === division);
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center">
          {title === 'AFC' && (
            <img 
              src="/icons/afc.png" 
              alt="AFC" 
              className="w-6 h-6 mr-2"
            />
          )}
          {title === 'NFC' && (
            <img 
              src="/icons/nfc.png" 
              alt="NFC" 
              className="w-6 h-6 mr-2"
            />
          )}
          {title}
        </h2>
        <div className="flex space-x-1">
          <button
            className={`px-3 py-1 text-sm rounded ${
              viewMode === 'conference' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700'
            }`}
            onClick={() => onViewModeChange('conference')}
          >
            Conference
          </button>
          <button
            className={`px-3 py-1 text-sm rounded ${
              viewMode === 'division' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700'
            }`}
            onClick={() => onViewModeChange('division')}
          >
            Division
          </button>
        </div>
      </div>

      {viewMode === 'division' ? (
        <div className="space-y-4">
          {divisions.map(division => {
            const divisionTeams = getDivisionTeams(division);
            if (divisionTeams.length === 0) return null;

            return (
              <div key={division}>
                <h3 className="font-semibold text-gray-700 mb-2">
                  {division} #{divisionTeams.length}
                </h3>
                <table className="standings-table w-full">
                  <thead>
                    <tr>
                      <th>Team</th>
                      <th>Rec</th>
                      <th>Div</th>
                    </tr>
                  </thead>
                  <tbody>
                    {divisionTeams.map((standing, index) => {
                      const isEliminated = eliminatedTeams.has(standing.team.id);
                      return (
                        <tr key={standing.team.id} className={`${index % 2 === 0 ? 'bg-gray-50' : ''} ${isEliminated ? 'opacity-50' : ''}`}>
                          <td className="flex items-center space-x-2">
                            <div className={`w-6 h-6 rounded flex items-center justify-center text-xs overflow-hidden ${isEliminated ? 'bg-gray-400' : 'bg-gray-300'}`}>
                              <img 
                                src={getTeamDisplay(standing.team.id, false).content}
                                alt={standing.team.abbreviation}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  // Fallback to text if image fails to load
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  target.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                              <span className="text-xs font-bold hidden">{standing.team.abbreviation}</span>
                            </div>
                            <span className={`font-medium ${isEliminated ? 'text-gray-500' : ''}`}>{standing.team.name}</span>
                          </td>
                          <td className={isEliminated ? 'text-gray-500' : ''}>
                            {standing.record.wins}-{standing.record.losses} {standing.record.ties > 0 && `-${standing.record.ties}`}
                          </td>
                          <td className={isEliminated ? 'text-gray-500' : ''}>
                            {standing.record.divisionWins}-{standing.record.divisionLosses} {standing.record.divisionTies > 0 && `-${standing.record.divisionTies}`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      ) : (
        <table className="standings-table w-full">
          <thead>
            <tr>
              <th>Seed</th>
              <th>Team</th>
              <th>Rec</th>
              <th>Div</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((standing, index) => {
              const isEliminated = eliminatedTeams.has(standing.team.id);
              return (
                <tr key={standing.team.id} className={`${index % 2 === 0 ? 'bg-gray-50' : ''} ${isEliminated ? 'opacity-50' : ''}`}>
                  <td className={`text-center ${isEliminated ? 'text-gray-500' : ''}`}>
                    {standing.playoffSeed || '-'}
                  </td>
                  <td className="flex items-center space-x-2">
                    <div className={`w-6 h-6 rounded flex items-center justify-center text-xs overflow-hidden ${isEliminated ? 'bg-gray-400' : 'bg-gray-300'}`}>
                      <img 
                        src={getTeamDisplay(standing.team.id, false).content}
                        alt={standing.team.abbreviation}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          // Fallback to text if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <span className="text-xs font-bold hidden">{standing.team.abbreviation}</span>
                    </div>
                    <span className={`font-medium ${isEliminated ? 'text-gray-500' : ''}`}>{standing.team.name}</span>
                  </td>
                  <td className={isEliminated ? 'text-gray-500' : ''}>
                    {standing.record.wins}-{standing.record.losses} {standing.record.ties > 0 && `-${standing.record.ties}`}
                  </td>
                  <td className={isEliminated ? 'text-gray-500' : ''}>
                    {standing.record.divisionWins}-{standing.record.divisionLosses} {standing.record.divisionTies > 0 && `-${standing.record.divisionTies}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default StandingsPanel; 