/**
 * Bottom status bar
 * Shows save status, stats, and keyboard shortcuts
 */

import { useScheduleStore } from '@/store/scheduleStore';
import { useEffect, useState } from 'react';

export function StatusBar() {
  const { schedule, historyIndex } = useScheduleStore();
  const [lastSaved, setLastSaved] = useState<Date>(new Date());
  const [showHints, setShowHints] = useState(false);

  useEffect(() => {
    // Auto-save to localStorage on state changes
    const timer = setTimeout(() => {
      localStorage.setItem('nfl-schedule', JSON.stringify(schedule));
      setLastSaved(new Date());
    }, 1000);

    return () => clearTimeout(timer);
  }, [schedule]);

  const stats = {
    totalGames: schedule.games.length,
    totalByes: schedule.byes.length,
    teamsComplete: Array.from(schedule.teams.values()).filter(t => t.remain.total === 0).length,
  };

  const timeSince = formatTimeSince(lastSaved);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-800 text-gray-200 text-xs border-t border-gray-700">
      <div className="container mx-auto px-4 py-2 flex items-center justify-between">
        {/* Left: Stats */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span>Saved {timeSince}</span>
          </div>
          <div className="text-gray-400">|</div>
          <span>{stats.totalGames} games scheduled</span>
          <span className="text-gray-400">•</span>
          <span>{stats.totalByes} byes assigned</span>
          <span className="text-gray-400">•</span>
          <span>{stats.teamsComplete} / 32 teams complete</span>
        </div>

        {/* Right: Keyboard hints */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowHints(!showHints)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            {showHints ? 'Hide' : 'Show'} shortcuts
          </button>
          
          {showHints && (
            <div className="flex items-center gap-3">
              <kbd className="px-2 py-0.5 bg-gray-700 rounded border border-gray-600">Ctrl+Z</kbd>
              <span className="text-gray-400">Undo</span>
              <kbd className="px-2 py-0.5 bg-gray-700 rounded border border-gray-600">Ctrl+Shift+Z</kbd>
              <span className="text-gray-400">Redo</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTimeSince(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

