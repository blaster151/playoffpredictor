/**
 * Always-visible constraint status bar
 * Shows quick-glance health of the schedule
 */

import { useScheduleStore } from '@/store/scheduleStore';
import { generateNarration, NarrativeMessage } from '@/lib/feasibility/narration';
import clsx from 'clsx';
import { useState } from 'react';

export function ConstraintBar() {
  const { schedule, feasibility } = useScheduleStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const messages = generateNarration(schedule, feasibility);
  
  // Show only the most important messages (up to 5)
  const prioritized = messages
    .sort((a, b) => {
      const severityOrder = { fail: 0, warn: 1, ok: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    })
    .slice(0, 5);

  if (prioritized.length === 0) {
    return (
      <div className="bg-green-50 border-b border-green-200 px-4 py-2">
        <div className="container mx-auto flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="text-sm text-green-800 font-medium">All constraints healthy</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2">
      <div className="container mx-auto">
        <div className="flex items-center gap-2 flex-wrap">
          {prioritized.map((msg) => (
            <ConstraintChip
              key={msg.id}
              message={msg}
              expanded={expandedId === msg.id}
              onToggle={() => setExpandedId(expandedId === msg.id ? null : msg.id)}
            />
          ))}
          
          {messages.length > 5 && (
            <span className="text-xs text-gray-500">
              +{messages.length - 5} more
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

interface ConstraintChipProps {
  message: NarrativeMessage;
  expanded: boolean;
  onToggle: () => void;
}

function ConstraintChip({ message, expanded, onToggle }: ConstraintChipProps) {
  const styles = {
    fail: {
      bg: 'bg-red-100',
      border: 'border-red-300',
      text: 'text-red-800',
      indicator: 'bg-red-500',
    },
    warn: {
      bg: 'bg-yellow-100',
      border: 'border-yellow-300',
      text: 'text-yellow-800',
      indicator: 'bg-yellow-500',
    },
    ok: {
      bg: 'bg-green-100',
      border: 'border-green-300',
      text: 'text-green-800',
      indicator: 'bg-green-500',
    },
  };

  const style = styles[message.severity];

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={clsx(
          'flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-sm',
          style.bg,
          style.border,
          style.text,
          'hover:shadow-md cursor-pointer'
        )}
        title={message.tooltip}
      >
        <div className={clsx('w-2 h-2 rounded-full', style.indicator)} />
        <span className="font-medium">{message.label}</span>
      </button>

      {expanded && (
        <div
          className={clsx(
            'absolute top-full left-0 mt-2 w-80 p-3 rounded-lg shadow-lg border-2 z-50',
            style.bg,
            style.border
          )}
        >
          <div className={clsx('text-sm font-medium mb-1', style.text)}>
            {message.label}
          </div>
          <div className={clsx('text-sm', style.text)}>
            {message.message}
          </div>
          {message.tooltip !== message.message && (
            <div className={clsx('text-xs mt-2 opacity-75', style.text)}>
              {message.tooltip}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

