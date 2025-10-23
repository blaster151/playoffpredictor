/**
 * Feasibility feedback panel
 * Shows real-time constraint validation results
 */

import { FeasibilityResult } from '@/types';
import clsx from 'clsx';

interface FeasibilityPanelProps {
  results: FeasibilityResult[];
}

export function FeasibilityPanel({ results }: FeasibilityPanelProps) {
  if (results.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full" />
          <span className="text-green-800 font-medium">All constraints satisfied</span>
        </div>
      </div>
    );
  }

  // Sort by severity
  const sorted = [...results].sort((a, b) => {
    const order = { UNSAT: 0, WARNING: 1, SAT: 2 };
    return order[a.level] - order[b.level];
  });

  return (
    <div className="space-y-2">
      {sorted.map((result, idx) => (
        <FeasibilityItem key={idx} result={result} />
      ))}
    </div>
  );
}

function FeasibilityItem({ result }: { result: FeasibilityResult }) {
  const { level, message, details, stage } = result;

  const styles = {
    UNSAT: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      indicator: 'bg-red-500',
    },
    WARNING: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      indicator: 'bg-yellow-500',
    },
    SAT: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      indicator: 'bg-green-500',
    },
  };

  const style = styles[level];

  return (
    <div className={clsx('border rounded-lg p-4', style.bg, style.border)}>
      <div className="flex items-start gap-3">
        <div className={clsx('w-3 h-3 rounded-full mt-1 flex-shrink-0', style.indicator)} />
        <div className="flex-1">
          <div className={clsx('font-medium', style.text)}>{message}</div>
          
          {details && (
            <div className={clsx('text-sm mt-2', style.text)}>
              {details.needed !== undefined && details.capacity !== undefined && (
                <div>
                  Need: {details.needed} | Available: {details.capacity}
                </div>
              )}
              {details.affectedTeams && details.affectedTeams.length > 0 && (
                <div className="mt-1">
                  Teams: {details.affectedTeams.join(', ')}
                </div>
              )}
              {details.affectedWeeks && details.affectedWeeks.length > 0 && (
                <div className="mt-1">
                  Weeks: {details.affectedWeeks.join(', ')}
                </div>
              )}
            </div>
          )}
          
          <div className={clsx('text-xs mt-2 opacity-70', style.text)}>
            Stage {stage}
          </div>
        </div>
      </div>
    </div>
  );
}

