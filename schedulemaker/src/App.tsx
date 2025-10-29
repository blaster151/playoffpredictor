/**
 * Main App Component
 * Entry point with layered layout: Header > ConstraintBar > Body > StatusBar
 */

import { useScheduleStore } from './store/scheduleStore';
import { WeekByWeekView } from './components/WeekByWeekView';
import { TeamByTeamView } from './components/TeamByTeamView';
import { Header } from './components/Header';
import { ConstraintBar } from './components/ConstraintBar';
import { StatusBar } from './components/StatusBar';
import { useEffect } from 'react';

function App() {
  const { mode, undo, redo } = useScheduleStore();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo: Ctrl+Z (Cmd+Z on Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Redo: Ctrl+Shift+Z (Cmd+Shift+Z on Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header />
      <ConstraintBar />
      
      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6 pb-12 overflow-hidden">
        {mode === 'week-by-week' ? <WeekByWeekView /> : <TeamByTeamView />}
      </main>

      <StatusBar />
    </div>
  );
}

export default App;

