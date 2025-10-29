/**
 * Constraint-aware narration
 * Converts feasibility results into helpful, conversational messages
 */

import { ScheduleState, FeasibilityResult, TeamId, Week } from '@/types';

export interface NarrativeMessage {
  id: string;
  severity: 'ok' | 'warn' | 'fail';
  label: string;
  message: string;
  tooltip: string;
  actionable?: {
    type: 'highlight-weeks' | 'highlight-teams' | 'suggest-move';
    data: any;
  };
}

/**
 * Generate narrative messages from state and feasibility results
 */
export function generateNarration(
  state: ScheduleState,
  results: FeasibilityResult[]
): NarrativeMessage[] {
  const messages: NarrativeMessage[] = [];

  // Add constraint-specific narratives
  messages.push(...narrateByes(state));
  messages.push(...narratePrimeTime(state));
  messages.push(...narrateDivisionGames(state));
  messages.push(...narrateInterConference(state));
  messages.push(...narrateRematchWindows(state));

  // Convert feasibility results to narrative
  for (const result of results) {
    messages.push(feasibilityToNarrative(result, state));
  }

  return messages;
}

/**
 * Narrate bye week situation
 */
function narrateByes(state: ScheduleState): NarrativeMessage[] {
  const messages: NarrativeMessage[] = [];
  const teamsNeedingBye = Array.from(state.unplacedByes);
  
  if (teamsNeedingBye.length === 0) {
    return messages;
  }

  // Count remaining bye slots
  let remainingSlots = 0;
  const availableWeeks: Week[] = [];
  
  for (const [week, weekState] of state.weeks.entries()) {
    if (week <= state.rules.byeCutoff && weekState.byesAssigned < weekState.byeCapacity) {
      const available = weekState.byeCapacity - weekState.byesAssigned;
      remainingSlots += available;
      availableWeeks.push(week);
    }
  }

  if (teamsNeedingBye.length > remainingSlots) {
    messages.push({
      id: 'bye-critical',
      severity: 'fail',
      label: 'Bye Crunch',
      message: `${teamsNeedingBye.length} teams need byes but only ${remainingSlots} slots left`,
      tooltip: `Teams: ${teamsNeedingBye.slice(0, 5).join(', ')}${teamsNeedingBye.length > 5 ? '...' : ''}`,
      actionable: {
        type: 'highlight-teams',
        data: teamsNeedingBye,
      },
    });
  } else if (teamsNeedingBye.length === remainingSlots) {
    messages.push({
      id: 'bye-tight',
      severity: 'warn',
      label: 'Last Bye Slots',
      message: `Every remaining bye slot must be used (${teamsNeedingBye.length} teams, ${remainingSlots} slots)`,
      tooltip: `Weeks ${availableWeeks.join(', ')} are the only bye options left`,
      actionable: {
        type: 'highlight-weeks',
        data: availableWeeks,
      },
    });
  } else if (teamsNeedingBye.length > remainingSlots * 0.7) {
    messages.push({
      id: 'bye-warning',
      severity: 'warn',
      label: 'Bye Pressure',
      message: `${teamsNeedingBye.length} teams still need byes`,
      tooltip: `Only ${remainingSlots} slots available in weeks ${availableWeeks.join(', ')}`,
    });
  }

  return messages;
}

/**
 * Narrate prime-time situation
 */
function narratePrimeTime(state: ScheduleState): NarrativeMessage[] {
  const messages: NarrativeMessage[] = [];
  
  // Count remaining night slots
  let totalNightSlots = 0;
  const weeksWithNight: Week[] = [];
  
  for (const [week, weekState] of state.weeks.entries()) {
    if (weekState.nightSlots > 0) {
      totalNightSlots += weekState.nightSlots;
      weeksWithNight.push(week);
    }
  }

  if (totalNightSlots <= 5) {
    messages.push({
      id: 'primetime-low',
      severity: 'warn',
      label: 'Prime-Time Slots',
      message: `Only ${totalNightSlots} night games left`,
      tooltip: `Weeks with prime-time availability: ${weeksWithNight.join(', ')}`,
      actionable: {
        type: 'highlight-weeks',
        data: weeksWithNight,
      },
    });
  }

  return messages;
}

/**
 * Narrate division game windows
 */
function narrateDivisionGames(state: ScheduleState): NarrativeMessage[] {
  const messages: NarrativeMessage[] = [];
  
  // Find teams with division games remaining
  const criticalTeams: TeamId[] = [];
  
  for (const [teamId, teamState] of state.teams.entries()) {
    if (teamState.remain.div > 0) {
      // Check if they have enough legal weeks left
      let legalWeeks = 0;
      for (let w = 1; w <= state.rules.totalWeeks; w++) {
        if (!teamState.busy.has(w)) {
          legalWeeks++;
        }
      }
      
      // If they have more division games than legal weeks, that's critical
      if (teamState.remain.div > legalWeeks) {
        criticalTeams.push(teamId);
      }
    }
  }

  if (criticalTeams.length > 0) {
    messages.push({
      id: 'division-critical',
      severity: 'fail',
      label: 'Division Crunch',
      message: `${criticalTeams.length} teams can't fit remaining division games`,
      tooltip: `Teams: ${criticalTeams.join(', ')}`,
      actionable: {
        type: 'highlight-teams',
        data: criticalTeams,
      },
    });
  }

  return messages;
}

/**
 * Narrate inter-conference situation
 */
function narrateInterConference(state: ScheduleState): NarrativeMessage[] {
  const messages: NarrativeMessage[] = [];
  
  // Count total inter-conference games needed
  let interNeeded = 0;
  for (const teamState of state.teams.values()) {
    interNeeded += teamState.remain.inter;
  }
  interNeeded = interNeeded / 2;

  if (interNeeded > 0) {
    // Find current week
    let currentWeek = 1;
    for (let w = 1; w <= state.rules.totalWeeks; w++) {
      const weekState = state.weeks.get(w);
      if (weekState && weekState.slots.filled < weekState.slots.total) {
        currentWeek = w;
        break;
      }
    }

    // Count remaining weeks
    const remainingWeeks = state.rules.totalWeeks - currentWeek + 1;
    
    if (interNeeded > remainingWeeks * 2) {
      messages.push({
        id: 'inter-urgent',
        severity: 'warn',
        label: 'Cross-Conference',
        message: `${interNeeded} NFC-AFC games needed, starting soon`,
        tooltip: `Only ${remainingWeeks} weeks left - must average ${(interNeeded / remainingWeeks).toFixed(1)} per week`,
      });
    }
  }

  return messages;
}

/**
 * Narrate rematch spacing windows
 */
function narrateRematchWindows(state: ScheduleState): NarrativeMessage[] {
  const messages: NarrativeMessage[] = [];
  
  // Find pairs that need rematches and check their windows
  const tightPairs: [TeamId, TeamId, Week][] = [];
  
  for (const [pairKey, pairNeed] of state.pairNeed.entries()) {
    if (pairNeed.count === 1 && pairNeed.type === 'DIV') {
      const [team1, team2] = pairKey.split(':');
      const teamState1 = state.teams.get(team1);
      const teamState2 = state.teams.get(team2);
      
      if (!teamState1 || !teamState2) continue;
      
      const lastMet = teamState1.lastMet.get(team2);
      if (lastMet) {
        const earliestRematch = lastMet + state.rules.minRematchGap;
        const latestWeek = state.rules.totalWeeks;
        const windowSize = latestWeek - earliestRematch + 1;
        
        if (windowSize <= 3) {
          tightPairs.push([team1, team2, earliestRematch]);
        }
      }
    }
  }

  if (tightPairs.length > 0) {
    const [team1, team2, week] = tightPairs[0];
    messages.push({
      id: 'rematch-tight',
      severity: 'warn',
      label: 'Rematch Windows',
      message: `${team1}-${team2} rematch window closing (earliest: Week ${week})`,
      tooltip: `${tightPairs.length} division rematches have tight windows`,
      actionable: {
        type: 'highlight-weeks',
        data: [week],
      },
    });
  }

  return messages;
}

/**
 * Convert a feasibility result to narrative
 */
function feasibilityToNarrative(result: FeasibilityResult, state: ScheduleState): NarrativeMessage {
  const severity = result.level === 'UNSAT' ? 'fail' : result.level === 'WARNING' ? 'warn' : 'ok';
  
  // Make the message more conversational
  let label = result.message.split(':')[0] || result.message.substring(0, 20);
  let message = result.message;
  
  // Enhance specific constraint types
  if (result.details?.constraint === 'BYE_CAPACITY') {
    label = 'Bye Weeks';
    if (result.details.affectedTeams) {
      const teams = result.details.affectedTeams.slice(0, 3);
      message = `${teams.join(', ')}${result.details.affectedTeams.length > 3 ? '...' : ''} need byes but slots are full`;
    }
  } else if (result.details?.constraint === 'TOTAL_CAPACITY') {
    label = 'Schedule Space';
    message = `Need ${result.details.needed} slots, only ${result.details.capacity} remain`;
  } else if (result.details?.constraint === 'HOME_CAPACITY') {
    label = 'Home Games';
    message = `${result.details.needed} home games needed, ${result.details.capacity} slots available`;
  }

  return {
    id: `feasibility-${result.stage}-${result.details?.constraint || 'general'}`,
    severity,
    label,
    message,
    tooltip: result.message,
  };
}

