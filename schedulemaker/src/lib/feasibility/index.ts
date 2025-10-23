/**
 * Main feasibility orchestrator
 * Runs multi-stage checks and returns consolidated results
 */

import { ScheduleState, FeasibilityResult } from '@/types';
import { checkStageA } from './stageA';
import { checkStageB } from './stageB';
import { checkStageD } from './stageD';

export interface FeasibilityCheck {
  quick: FeasibilityResult[];  // Stage A only (synchronous, < 1ms)
  full: FeasibilityResult[];   // Stages A + B + D (synchronous, < 10ms)
}

/**
 * Quick feasibility check - Stage A only
 * Run on every user action
 */
export function quickFeasibilityCheck(state: ScheduleState): FeasibilityResult[] {
  return checkStageA(state);
}

/**
 * Full feasibility check - Stages A, B, D
 * Run after quick check or on demand
 */
export function fullFeasibilityCheck(state: ScheduleState): FeasibilityResult[] {
  const results: FeasibilityResult[] = [];

  // Stage A: Cheap bounds
  const stageAResults = checkStageA(state);
  results.push(...stageAResults);

  // If Stage A has UNSAT, no need to continue
  if (stageAResults.some(r => r.level === 'UNSAT')) {
    return results;
  }

  // Stage B: Week-level matching
  const stageBResults = checkStageB(state);
  results.push(...stageBResults);

  // Stage D: Division/team reserves
  const stageDResults = checkStageD(state);
  results.push(...stageDResults);

  return results;
}

/**
 * Check if schedule is definitely unsatisfiable
 */
export function isUnsatisfiable(results: FeasibilityResult[]): boolean {
  return results.some(r => r.level === 'UNSAT');
}

/**
 * Check if schedule has warnings
 */
export function hasWarnings(results: FeasibilityResult[]): boolean {
  return results.some(r => r.level === 'WARNING');
}

/**
 * Get the most severe issue
 */
export function getMostSevereIssue(results: FeasibilityResult[]): FeasibilityResult | null {
  const unsat = results.find(r => r.level === 'UNSAT');
  if (unsat) return unsat;

  const warning = results.find(r => r.level === 'WARNING');
  if (warning) return warning;

  return null;
}

/**
 * Group results by constraint type
 */
export function groupByConstraint(results: FeasibilityResult[]): Map<string, FeasibilityResult[]> {
  const groups = new Map<string, FeasibilityResult[]>();

  for (const result of results) {
    const constraint = result.details?.constraint || 'UNKNOWN';
    if (!groups.has(constraint)) {
      groups.set(constraint, []);
    }
    groups.get(constraint)!.push(result);
  }

  return groups;
}

// Export individual stages for testing
export { checkStageA } from './stageA';
export { checkStageB } from './stageB';
export { checkStageD } from './stageD';

