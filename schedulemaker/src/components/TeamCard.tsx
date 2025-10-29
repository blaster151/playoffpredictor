/**
 * Team card component
 * Displays team info with logo, colors, and status
 */

import { Team } from '@/types';
import { TEAMS_BY_ID } from '@/data/teams';
import clsx from 'clsx';

interface TeamCardProps {
  teamId: string;
  className?: string;
  onClick?: () => void;
  showStatus?: boolean;
  remainingGames?: number;
}

export function TeamCard({ 
  teamId, 
  className, 
  onClick,
  showStatus = false,
  remainingGames,
}: TeamCardProps) {
  const team = TEAMS_BY_ID.get(teamId);
  
  if (!team) {
    return (
      <div className={clsx('p-2 border rounded bg-gray-100', className)}>
        Unknown Team
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'p-3 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md',
        className
      )}
      style={{
        borderColor: team.colors.primary,
        backgroundColor: `${team.colors.primary}15`,
      }}
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
          style={{ backgroundColor: team.colors.primary }}
        >
          {team.abbreviation.substring(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{team.abbreviation}</div>
          <div className="text-xs text-gray-600 truncate">{team.name}</div>
        </div>
        {showStatus && remainingGames !== undefined && (
          <div className="text-xs bg-white px-2 py-1 rounded">
            {remainingGames} left
          </div>
        )}
      </div>
    </div>
  );
}

interface GameCardProps {
  homeTeamId: string;
  awayTeamId: string;
  className?: string;
  onClick?: () => void;
}

export function GameCard({ homeTeamId, awayTeamId, className, onClick }: GameCardProps) {
  const homeTeam = TEAMS_BY_ID.get(homeTeamId);
  const awayTeam = TEAMS_BY_ID.get(awayTeamId);

  if (!homeTeam || !awayTeam) return null;

  return (
    <div
      className={clsx(
        'p-3 rounded-lg border bg-white shadow-sm hover:shadow-md transition-all cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Away Team */}
        <div className="flex items-center gap-2 flex-1">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs"
            style={{ backgroundColor: awayTeam.colors.primary }}
          >
            {awayTeam.abbreviation.substring(0, 2)}
          </div>
          <div className="text-sm font-medium">{awayTeam.abbreviation}</div>
        </div>

        {/* @ symbol */}
        <div className="text-gray-400 text-xs">@</div>

        {/* Home Team */}
        <div className="flex items-center gap-2 flex-1 justify-end">
          <div className="text-sm font-medium">{homeTeam.abbreviation}</div>
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs"
            style={{ backgroundColor: homeTeam.colors.primary }}
          >
            {homeTeam.abbreviation.substring(0, 2)}
          </div>
        </div>
      </div>
    </div>
  );
}

