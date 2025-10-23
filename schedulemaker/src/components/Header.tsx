/**
 * Main header component
 * Mode toggle, undo/redo, and primary controls
 */

import { useScheduleStore } from '@/store/scheduleStore';
import clsx from 'clsx';

export function Header() {
  const { mode, setMode, undo, redo, reset, historyIndex, history, runFeasibilityCheck } = useScheduleStore();

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <header className="bg-gradient-to-r from-blue-900 to-blue-700 text-white shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">NFL Schedule Builder</h1>
            <p className="text-blue-200 text-sm mt-1">
              Manual scheduling with real-time feasibility checking
            </p>
          </div>

          {/* Mode Toggle - Segmented Control */}
          <div className="flex gap-1 bg-blue-800/50 rounded-lg p-1 backdrop-blur-sm">
            <button
              onClick={() => setMode('week-by-week')}
              className={clsx(
                'px-6 py-2.5 rounded-md transition-all font-medium text-sm',
                mode === 'week-by-week'
                  ? 'bg-white text-blue-900 shadow-md'
                  : 'text-blue-100 hover:text-white hover:bg-blue-700/50'
              )}
            >
              <div className="flex flex-col items-center">
                <span>Week View</span>
                <span className="text-xs opacity-75 mt-0.5">Season Flow</span>
              </div>
            </button>
            <button
              onClick={() => setMode('team-by-team')}
              className={clsx(
                'px-6 py-2.5 rounded-md transition-all font-medium text-sm',
                mode === 'team-by-team'
                  ? 'bg-white text-blue-900 shadow-md'
                  : 'text-blue-100 hover:text-white hover:bg-blue-700/50'
              )}
            >
              <div className="flex flex-col items-center">
                <span>Team View</span>
                <span className="text-xs opacity-75 mt-0.5">Franchise Planner</span>
              </div>
            </button>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-blue-600/30">
          {/* History Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={undo}
              disabled={!canUndo}
              className={clsx(
                'px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2',
                canUndo
                  ? 'bg-blue-600 hover:bg-blue-500 shadow-sm'
                  : 'bg-blue-800/50 cursor-not-allowed opacity-50'
              )}
              title="Undo (Ctrl+Z)"
            >
              <span>←</span>
              <span>Undo</span>
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className={clsx(
                'px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2',
                canRedo
                  ? 'bg-blue-600 hover:bg-blue-500 shadow-sm'
                  : 'bg-blue-800/50 cursor-not-allowed opacity-50'
              )}
              title="Redo (Ctrl+Shift+Z)"
            >
              <span>Redo</span>
              <span>→</span>
            </button>
            <div className="text-xs text-blue-300 ml-2">
              Step {historyIndex} / {history.length - 1}
            </div>
          </div>

          <div className="flex-1" />

          {/* Action Buttons */}
          <button
            onClick={() => runFeasibilityCheck(true)}
            className="px-4 py-1.5 bg-green-600 hover:bg-green-500 rounded-md text-sm font-medium shadow-sm transition-all"
            title="Run full feasibility check (all stages)"
          >
            Full Check
          </button>
          <button
            onClick={reset}
            className="px-4 py-1.5 bg-red-600/80 hover:bg-red-600 rounded-md text-sm font-medium shadow-sm transition-all"
            title="Reset schedule"
          >
            Reset
          </button>
        </div>
      </div>
    </header>
  );
}

