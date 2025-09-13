import React, { useState, useMemo } from 'react';
import { TeamStanding } from '../types/nfl';
import { getTeamDisplay } from '../utils/helmetIcons';
import { getTransparentTeamBadgeStyle } from '../utils/teamColors';
import { getTeamById } from '../data/nflData';

interface StandingsPanelProps {
  title: string;
  standings: TeamStanding[];
  viewMode: 'conference' | 'division';
  onViewModeChange: (mode: 'conference' | 'division') => void;
  eliminatedTeams?: Set<string>;
  align?: 'left' | 'right';
  onTeamClick?: (team: any) => void;
}

type SortField = 'seed' | 'team' | 'record' | 'division';
type SortDirection = 'asc' | 'desc';

const StandingsPanel: React.FC<StandingsPanelProps> = ({ 
  title, 
  standings, 
  viewMode, 
  onViewModeChange,
  eliminatedTeams = new Set(),
  align = 'left',
  onTeamClick
}) => {
  const divisions = ['North', 'South', 'East', 'West'];
  const [sortField, setSortField] = useState<SortField>('seed');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  const getDivisionTeams = (division: string) => {
    return standings.filter(s => s.team.division === division);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortStandings = (teams: TeamStanding[]) => {
    return [...teams].sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'seed':
          aValue = a.playoffSeed || 999;
          bValue = b.playoffSeed || 999;
          break;
        case 'team':
          aValue = a.team.name.toLowerCase();
          bValue = b.team.name.toLowerCase();
          break;
        case 'record':
          // Sort by wins (first number) descending
          aValue = a.record.wins;
          bValue = b.record.wins;
          break;
        case 'division':
          // Sort by division wins (first number) descending
          aValue = a.record.divisionWins;
          bValue = b.record.divisionWins;
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '↕️';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const sortedStandings = useMemo(() => sortStandings(standings), [standings, sortField, sortDirection]);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-3 max-w-xs ${align === 'right' ? 'ml-auto' : ''}`}>
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
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
                : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
            }`}
            onClick={() => onViewModeChange('conference')}
          >
            Conference
          </button>
          <button
            className={`px-3 py-1 text-sm rounded ${
              viewMode === 'division' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
            }`}
            onClick={() => onViewModeChange('division')}
          >
            Division
          </button>
        </div>
      </div>

      {viewMode === 'division' ? (
        <div className="space-y-3">
          {divisions.map(division => {
            const divisionTeams = getDivisionTeams(division);
            if (divisionTeams.length === 0) return null;

            const sortedDivisionTeams = sortStandings(divisionTeams);

            return (
              <div key={division}>
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-1 text-sm">
                  {division} #{divisionTeams.length}
                </h3>
                <table className="standings-table w-full text-xs table-fixed">
                  <thead>
                    <tr>
                      <th 
                        className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 text-center text-sm w-4"
                        onClick={() => handleSort('seed')}
                      >
                        Seed {getSortIcon('seed')}
                      </th>
                      <th 
                        className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 text-left text-sm w-12"
                        onClick={() => handleSort('team')}
                      >
                        Team {getSortIcon('team')}
                      </th>
                      <th 
                        className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 text-left text-sm w-6"
                        onClick={() => handleSort('record')}
                      >
                        Rec {getSortIcon('record')}
                      </th>
                      <th 
                        className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 text-left text-sm w-6"
                        onClick={() => handleSort('division')}
                      >
                        Div {getSortIcon('division')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedDivisionTeams.map((standing, index) => {
                      const isEliminated = eliminatedTeams.has(standing.team.id);
                      return (
                        <tr 
                          key={standing.team.id} 
                          className={`${index % 2 === 0 ? 'bg-gray-50' : ''} dark:bg-gray-800 ${isEliminated ? 'opacity-50' : ''} ${onTeamClick ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700' : ''}`}
                          onClick={() => onTeamClick && onTeamClick(standing.team)}
                        >
                          <td className={`text-center ${isEliminated ? 'text-gray-500' : ''}`}>
                            <span className={`${
                              standing.playoffSeed && standing.playoffSeed <= 7 
                                ? 'text-green-600 font-bold' 
                                : standing.playoffSeed 
                                  ? 'text-red-500 font-normal' 
                                  : 'text-gray-500'
                            }`}>
                              {standing.playoffSeed || '-'}
                            </span>
                          </td>
                          <td className="flex items-center space-x-0.5">
                            <div 
                              className={`w-6 h-6 rounded flex items-center justify-center text-xs overflow-hidden ${isEliminated ? 'opacity-50' : ''}`}
                              style={getTransparentTeamBadgeStyle()}
                            >
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
                            <span className={`font-medium text-sm ${isEliminated ? 'text-gray-500' : ''}`}>
                              {standing.team.abbreviation}
                            </span>
                          </td>
                          <td className={`${isEliminated ? 'text-gray-500' : ''} px-0.5`}>
                            {standing.record.wins}-{standing.record.losses} {standing.record.ties > 0 && `-${standing.record.ties}`}
                          </td>
                          <td className={`${isEliminated ? 'text-gray-500' : ''} px-0.5`}>
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
        <table className="standings-table w-full text-xs table-fixed">
          <thead>
            <tr>
              <th 
                className="cursor-pointer hover:bg-gray-100 p-1 text-center text-sm w-4"
                onClick={() => handleSort('seed')}
              >
                Seed {getSortIcon('seed')}
              </th>
              <th 
                className="cursor-pointer hover:bg-gray-100 p-1 text-left text-sm w-8"
                onClick={() => handleSort('team')}
              >
                Team {getSortIcon('team')}
              </th>
              <th 
                className="cursor-pointer hover:bg-gray-100 p-1 text-left text-sm w-6"
                onClick={() => handleSort('record')}
              >
                Rec {getSortIcon('record')}
              </th>
              <th 
                className="cursor-pointer hover:bg-gray-100 p-1 text-left text-sm w-6"
                onClick={() => handleSort('division')}
              >
                Div {getSortIcon('division')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedStandings.map((standing, index) => {
              const isEliminated = eliminatedTeams.has(standing.team.id);
              return (
                <tr 
                  key={standing.team.id} 
                  className={`${index % 2 === 0 ? 'bg-gray-50' : ''} dark:bg-gray-800 ${isEliminated ? 'opacity-50' : ''} ${onTeamClick ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700' : ''}`}
                  onClick={() => onTeamClick && onTeamClick(standing.team)}
                >
                  <td className={`text-center ${isEliminated ? 'text-gray-500' : ''}`}>
                    <span className={`${
                      standing.playoffSeed && standing.playoffSeed <= 7 
                        ? 'text-green-600 font-bold' 
                        : standing.playoffSeed 
                          ? 'text-red-500 font-normal' 
                          : 'text-gray-500'
                    }`}>
                      {standing.playoffSeed || '-'}
                    </span>
                  </td>
                  <td className="flex items-center space-x-0.5">
                    <div 
                      className={`w-5 h-5 rounded flex items-center justify-center text-xs overflow-hidden ${isEliminated ? 'opacity-50' : ''}`}
                      style={getTransparentTeamBadgeStyle()}
                    >
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
                    <span className={`font-medium text-xs ${isEliminated ? 'text-gray-500' : ''}`}>
                      {standing.team.abbreviation}
                    </span>
                  </td>
                  <td className={`${isEliminated ? 'text-gray-500' : ''} px-0.5`}>
                    {standing.record.wins}-{standing.record.losses} {standing.record.ties > 0 && `-${standing.record.ties}`}
                  </td>
                  <td className={`${isEliminated ? 'text-gray-500' : ''} px-0.5`}>
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