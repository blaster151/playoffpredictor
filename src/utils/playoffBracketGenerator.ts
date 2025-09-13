import { TeamStanding, Game } from '../types/nfl';
import { getTeamById } from '../data/nflData';

export interface PlayoffBracket {
  wildCard: Game[];
  divisional: Game[];
  conferenceChampionships: Game[];
  superBowl: Game[];
}

// NFL Playoff Structure:
// AFC: 1-7 seeds, NFC: 1-7 seeds
// Wild Card: 2v7, 3v6, 4v5 (1 seed gets bye)
// Divisional: 1v(lowest remaining), (2v7 winner)v(3v6 winner)
// Conference: Winners of divisional games
// Super Bowl: AFC champion vs NFC champion

/**
 * Determines which playoff weeks should be unlocked based on completion status
 * Progressive unlocking: each round only unlocks when the previous round is complete
 */
function getUnlockedPlayoffWeeks(standings: TeamStanding[], currentWeek: number, savedPlayoffGames?: any, schedule?: any): number[] {
  console.log(`🔍 getUnlockedPlayoffWeeks called - currentWeek=${currentWeek}, hasSchedule=${!!schedule}, hasSavedPlayoffGames=${!!savedPlayoffGames}`);
  const unlockedWeeks: number[] = [];
  
  // Week 19 (Wild Card) - unlocked when regular season is complete (regardless of current week)
  // Use the same logic as the "Resolve Whole Season" button - check if all regular season games are resolved
  const regularSeasonComplete = isRegularSeasonComplete(currentWeek, schedule);
  
  // Also check if we have any playoff games saved, which indicates regular season is complete
  const hasAnyPlayoffGames = savedPlayoffGames && savedPlayoffGames.length > 0;
  
  // Check if we're on Week 19+ (which means regular season is definitely complete)
  const onPlayoffWeek = currentWeek >= 19;
  
  // Unlock Wild Card if regular season is complete (regardless of current week)
  const shouldUnlockWildCard = regularSeasonComplete || hasAnyPlayoffGames || onPlayoffWeek;
  
  console.log(`🔍 Wild Card unlock check - currentWeek=${currentWeek}, regularSeasonComplete=${regularSeasonComplete}, hasPlayoffGames=${hasAnyPlayoffGames}, onPlayoffWeek=${onPlayoffWeek}, shouldUnlock=${shouldUnlockWildCard}`);
  
  if (shouldUnlockWildCard) {
    unlockedWeeks.push(19);
    console.log(`🔓 Wild Card unlocked: regularSeasonComplete=${regularSeasonComplete}, hasPlayoffGames=${hasAnyPlayoffGames}, onPlayoffWeek=${onPlayoffWeek}, currentWeek=${currentWeek}`);
  } else {
    console.log(`🔒 Wild Card locked: regularSeasonComplete=${regularSeasonComplete}, hasPlayoffGames=${hasAnyPlayoffGames}, onPlayoffWeek=${onPlayoffWeek}, currentWeek=${currentWeek}`);
  }
  
  // Week 20 (Divisional) - unlocked when Wild Card is complete
  if (currentWeek >= 20) {
    const wildCardGames = savedPlayoffGames?.filter((game: any) => game.week === 19) || [];
    const completedWildCardGames = wildCardGames.filter((game: any) => 
      game.isPlayed && game.homeScore !== undefined && game.awayScore !== undefined
    );
    
    console.log(`🔍 Divisional unlock check: ${wildCardGames.length} wild card games, ${completedWildCardGames.length} completed`);
    
    if (completedWildCardGames.length >= 6) { // All 6 Wild Card games complete
      unlockedWeeks.push(20);
      console.log(`🔓 Divisional unlocked: all 6 wild card games complete`);
    } else {
      console.log(`🔒 Divisional locked: need ${6 - completedWildCardGames.length} more wild card games`);
    }
  }
  
  // Week 21 (Conference Championships) - unlocked when Divisional is complete
  if (currentWeek >= 21) {
    const divisionalGames = savedPlayoffGames?.filter((game: any) => game.week === 20) || [];
    const completedDivisionalGames = divisionalGames.filter((game: any) => 
      game.isPlayed && game.homeScore !== undefined && game.awayScore !== undefined
    );
    
    console.log(`🔍 Conference Championship unlock check: ${divisionalGames.length} divisional games, ${completedDivisionalGames.length} completed`);
    
    if (completedDivisionalGames.length >= 4) { // All 4 Divisional games complete
      unlockedWeeks.push(21);
      console.log(`🔓 Conference Championships unlocked: all 4 divisional games complete`);
    } else {
      console.log(`🔒 Conference Championships locked: need ${4 - completedDivisionalGames.length} more divisional games`);
    }
  }
  
  // Week 22 (Super Bowl) - unlocked when Conference Championships are complete
  if (currentWeek >= 22) {
    const conferenceGames = savedPlayoffGames?.filter((game: any) => game.week === 21) || [];
    const completedConferenceGames = conferenceGames.filter((game: any) => 
      game.isPlayed && game.homeScore !== undefined && game.awayScore !== undefined
    );
    
    console.log(`🔍 Super Bowl unlock check: ${conferenceGames.length} conference games, ${completedConferenceGames.length} completed`);
    
    if (completedConferenceGames.length >= 2) { // Both Conference Championship games complete
      unlockedWeeks.push(22);
      console.log(`🔓 Super Bowl unlocked: both conference championship games complete`);
    } else {
      console.log(`🔒 Super Bowl locked: need ${2 - completedConferenceGames.length} more conference championship games`);
    }
  }
  
  console.log(`🔍 Unlock check - Week ${currentWeek}:`);
  console.log(`   Wild Card games: ${savedPlayoffGames?.filter((g: any) => g.week === 19).length || 0} total, ${savedPlayoffGames?.filter((g: any) => g.week === 19 && g.homeScore !== undefined).length || 0} complete`);
  console.log(`   Divisional games: ${savedPlayoffGames?.filter((g: any) => g.week === 20).length || 0} total, ${savedPlayoffGames?.filter((g: any) => g.week === 20 && g.homeScore !== undefined).length || 0} complete`);
  console.log(`   Conference games: ${savedPlayoffGames?.filter((g: any) => g.week === 21).length || 0} total, ${savedPlayoffGames?.filter((g: any) => g.week === 21 && g.homeScore !== undefined).length || 0} complete`);
  
  console.log(`🔓 Final unlocked weeks: [${unlockedWeeks.join(', ')}]`);
  return unlockedWeeks;
}

export function generatePlayoffBrackets(standings: TeamStanding[], currentWeek: number, schedule?: any, savedPlayoffGames?: any): PlayoffBracket {
  // Only generate playoff brackets if regular season is complete (Week 18)
  if (currentWeek <= 18) {
    return {
      wildCard: [],
      divisional: [],
      conferenceChampionships: [],
      superBowl: []
    };
  }

  // Determine which playoff weeks should be unlocked based on completion status
  const unlockedWeeks = getUnlockedPlayoffWeeks(standings, currentWeek, savedPlayoffGames, schedule);
  console.log(`🔓 Unlocked playoff weeks: ${unlockedWeeks.join(', ')}`);

  // Note: Reseeding logic would go here for advanced playoff bracket generation
  // For now, we use the original standings

  const afcStandings = standings
    .filter(s => s.team.conference === 'AFC')
    .sort((a, b) => (a.playoffSeed || 999) - (b.playoffSeed || 999))
    .slice(0, 7); // Top 7 teams

  const nfcStandings = standings
    .filter(s => s.team.conference === 'NFC')
    .sort((a, b) => (a.playoffSeed || 999) - (b.playoffSeed || 999))
    .slice(0, 7); // Top 7 teams

  const wildCard: Game[] = [];
  const divisional: Game[] = [];
  const conferenceChampionships: Game[] = [];
  const superBowl: Game[] = [];

  // Generate Wild Card games (Week 19) - only if unlocked
  if (unlockedWeeks.includes(19)) {
    // AFC: 2v7, 3v6, 4v5
    if (afcStandings.length >= 7) {
      wildCard.push(createGame(afcStandings[1], afcStandings[6], 19, 'wildcard-afc-1'));
      wildCard.push(createGame(afcStandings[2], afcStandings[5], 19, 'wildcard-afc-2'));
      wildCard.push(createGame(afcStandings[3], afcStandings[4], 19, 'wildcard-afc-3'));
    }

    // NFC: 2v7, 3v6, 4v5
    if (nfcStandings.length >= 7) {
      wildCard.push(createGame(nfcStandings[1], nfcStandings[6], 19, 'wildcard-nfc-1'));
      wildCard.push(createGame(nfcStandings[2], nfcStandings[5], 19, 'wildcard-nfc-2'));
      wildCard.push(createGame(nfcStandings[3], nfcStandings[4], 19, 'wildcard-nfc-3'));
    }
  }

  // Generate Divisional games (Week 20) - only if unlocked
  if (unlockedWeeks.includes(20)) {
    // Get wild card winners from saved playoff games
    const wildCardWinners = getPlayoffWinners(savedPlayoffGames || [], 19);
    console.log(`🏈 Wild Card winners: ${wildCardWinners.join(', ')}`);
    
    // Separate winners by conference
    const afcWildCardWinners = wildCardWinners.filter(winner => {
      const team = standings.find(s => s.team.id === winner);
      return team?.team.conference === 'AFC';
    });
    
    const nfcWildCardWinners = wildCardWinners.filter(winner => {
      const team = standings.find(s => s.team.id === winner);
      return team?.team.conference === 'NFC';
    });
    
    console.log(`🏈 AFC Wild Card winners: ${afcWildCardWinners.join(', ')}`);
    console.log(`🏈 NFC Wild Card winners: ${nfcWildCardWinners.join(', ')}`);
    
          // AFC Divisional: 1v(lowest remaining), (2v7 winner)v(3v6 winner)
      if (afcStandings.length >= 1 && afcWildCardWinners.length >= 3) {
        // 1 seed vs lowest remaining wild card winner
        const lowestAfcWinner = afcWildCardWinners[afcWildCardWinners.length - 1];
        const lowestWinnerTeam = standings.find(s => s.team.id === lowestAfcWinner);
        
        // Other two winners face each other
        const otherWinners = afcWildCardWinners.slice(0, 2);
        const winner1Team = standings.find(s => s.team.id === otherWinners[0]);
        const winner2Team = standings.find(s => s.team.id === otherWinners[1]);
        
        if (lowestWinnerTeam && winner1Team && winner2Team) {
          divisional.push(createGame(afcStandings[0], lowestWinnerTeam, 20, 'divisional-afc-1'));
          divisional.push(createGame(winner1Team, winner2Team, 20, 'divisional-afc-2'));
        }
    } else if (afcStandings.length >= 1) {
      // Fallback to placeholders if not enough winners
      divisional.push(createGame(afcStandings[0], null, 20, 'divisional-afc-1'));
      divisional.push(createGame(null, null, 20, 'divisional-afc-2'));
    }

    // NFC Divisional: 1v(lowest remaining), (2v7 winner)v(3v6 winner)
    if (nfcStandings.length >= 1 && nfcWildCardWinners.length >= 3) {
      // 1 seed vs lowest remaining wild card winner
      const lowestNfcWinner = nfcWildCardWinners[nfcWildCardWinners.length - 1];
      const lowestWinnerTeam = standings.find(s => s.team.id === lowestNfcWinner);
      
      // Other two winners face each other
      const otherWinners = nfcWildCardWinners.slice(0, 2);
      const winner1Team = standings.find(s => s.team.id === otherWinners[0]);
      const winner2Team = standings.find(s => s.team.id === otherWinners[1]);
      
      if (lowestWinnerTeam && winner1Team && winner2Team) {
        divisional.push(createGame(nfcStandings[0], lowestWinnerTeam, 20, 'divisional-nfc-1'));
        divisional.push(createGame(winner1Team, winner2Team, 20, 'divisional-nfc-2'));
      }
    } else if (nfcStandings.length >= 1) {
      // Fallback to placeholders if not enough winners
      divisional.push(createGame(nfcStandings[0], null, 20, 'divisional-nfc-1'));
      divisional.push(createGame(null, null, 20, 'divisional-nfc-2'));
    }
  }

  // Generate Conference Championships (Week 21) - only if unlocked
  if (unlockedWeeks.includes(21)) {
    console.log(`🔍 Generating Conference Championships (Week 21)`);
    
    // Get divisional winners from saved playoff games
    const divisionalWinners = getPlayoffWinners(savedPlayoffGames || [], 20);
    console.log(`🏈 Divisional winners: ${divisionalWinners.join(', ')}`);
    
    // Separate winners by conference
    const afcDivisionalWinners = divisionalWinners.filter(winner => {
      const team = standings.find(s => s.team.id === winner);
      return team?.team.conference === 'AFC';
    });
    
    const nfcDivisionalWinners = divisionalWinners.filter(winner => {
      const team = standings.find(s => s.team.id === winner);
      return team?.team.conference === 'NFC';
    });
    
    console.log(`🏈 AFC Divisional winners: ${afcDivisionalWinners.join(', ')}`);
    console.log(`🏈 NFC Divisional winners: ${nfcDivisionalWinners.join(', ')}`);
    
    // Create conference championship games with actual winners
    // Only populate if we have exactly 2 winners per conference (all divisional games complete)
    if (afcDivisionalWinners.length === 2) {
      const winner1Team = standings.find(s => s.team.id === afcDivisionalWinners[0]);
      const winner2Team = standings.find(s => s.team.id === afcDivisionalWinners[1]);
      if (winner1Team && winner2Team) {
        conferenceChampionships.push(createGame(winner1Team, winner2Team, 21, 'afc-championship'));
        console.log(`🏈 AFC Championship: ${winner1Team.team.name} vs ${winner2Team.team.name}`);
      } else {
        console.log(`❌ Could not find team objects for AFC winners: ${afcDivisionalWinners[0]}, ${afcDivisionalWinners[1]}`);
        conferenceChampionships.push(createGame(null, null, 21, 'afc-championship'));
      }
    } else {
      conferenceChampionships.push(createGame(null, null, 21, 'afc-championship'));
      console.log(`🏈 AFC Championship: Waiting for ${2 - afcDivisionalWinners.length} more divisional games (have ${afcDivisionalWinners.length})`);
    }
    
    if (nfcDivisionalWinners.length === 2) {
      const winner1Team = standings.find(s => s.team.id === nfcDivisionalWinners[0]);
      const winner2Team = standings.find(s => s.team.id === nfcDivisionalWinners[1]);
      if (winner1Team && winner2Team) {
        conferenceChampionships.push(createGame(winner1Team, winner2Team, 21, 'nfc-championship'));
        console.log(`🏈 NFC Championship: ${winner1Team.team.name} vs ${winner2Team.team.name}`);
      } else {
        console.log(`❌ Could not find team objects for NFC winners: ${nfcDivisionalWinners[0]}, ${nfcDivisionalWinners[1]}`);
        conferenceChampionships.push(createGame(null, null, 21, 'nfc-championship'));
      }
    } else {
      conferenceChampionships.push(createGame(null, null, 21, 'nfc-championship'));
      console.log(`🏈 NFC Championship: Waiting for ${2 - nfcDivisionalWinners.length} more divisional games (have ${nfcDivisionalWinners.length})`);
    }
  }

  // Generate Super Bowl (Week 22) - only if unlocked
  if (unlockedWeeks.includes(22)) {
    // Get conference championship winners from saved playoff games
    const conferenceWinners = getPlayoffWinners(savedPlayoffGames || [], 21);
    console.log(`🏈 Conference Championship winners: ${conferenceWinners.join(', ')}`);
    
    // Separate winners by conference
    const afcChampion = conferenceWinners.find(winner => {
      const team = standings.find(s => s.team.id === winner);
      return team?.team.conference === 'AFC';
    });
    
    const nfcChampion = conferenceWinners.find(winner => {
      const team = standings.find(s => s.team.id === winner);
      return team?.team.conference === 'NFC';
    });
    
    console.log(`🏈 AFC Champion: ${afcChampion || 'TBD'}`);
    console.log(`🏈 NFC Champion: ${nfcChampion || 'TBD'}`);
    
    // Create Super Bowl with actual champions
    if (afcChampion && nfcChampion) {
      const afcChampionTeam = standings.find(s => s.team.id === afcChampion);
      const nfcChampionTeam = standings.find(s => s.team.id === nfcChampion);
      if (afcChampionTeam && nfcChampionTeam) {
        superBowl.push(createGame(afcChampionTeam, nfcChampionTeam, 22, 'super-bowl'));
      }
    } else {
      superBowl.push(createGame(null, null, 22, 'super-bowl'));
    }
  }

  // Debug logging
  console.log(`🏈 Playoff Bracket Generation (Week ${currentWeek}):`);
  console.log(`   Wild Card: ${wildCard.length} games`);
  console.log(`   Divisional: ${divisional.length} games`);
  console.log(`   Conference: ${conferenceChampionships.length} games`);
  console.log(`   Super Bowl: ${superBowl.length} games`);

  return {
    wildCard,
    divisional,
    conferenceChampionships,
    superBowl
  };
}

function createGame(homeTeam: TeamStanding | null, awayTeam: TeamStanding | null, week: number, id: string): Game {
  return {
    id,
    homeTeam: homeTeam?.team.id || 'TBD',
    awayTeam: awayTeam?.team.id || 'TBD',
    homeScore: undefined,
    awayScore: undefined,
    week,
    day: 'Saturday',
    date: `Week ${week}`,
    isPlayed: false
  };
}

export function getPlayoffWeekName(week: number): string {
  switch (week) {
    case 19: return 'Wild Card';
    case 20: return 'Divisional';
    case 21: return 'Conference Championships';
    case 22: return 'Super Bowl';
    default: return `Week ${week}`;
  }
}

export function isPlayoffWeek(week: number): boolean {
  return week >= 19 && week <= 22;
}

export function getEliminatedTeams(
  standings: TeamStanding[],
  currentWeek: number,
  playoffGames: Game[]
): Set<string> {
  const eliminatedTeams = new Set<string>();
  
  if (currentWeek < 19) {
    // Regular season - no teams eliminated yet
    return eliminatedTeams;
  }

  // Get all playoff games up to current week
  const relevantGames = playoffGames.filter(game => game.week <= currentWeek);
  
  // Track teams that have lost in playoffs
  const losingTeams = new Set<string>();
  
  relevantGames.forEach(game => {
    if (game.isPlayed && game.homeScore !== undefined && game.awayScore !== undefined) {
      if (game.homeScore > game.awayScore) {
        // Away team lost
        if (game.awayTeam !== 'TBD') {
          losingTeams.add(game.awayTeam);
        }
      } else if (game.awayScore > game.homeScore) {
        // Home team lost
        if (game.homeTeam !== 'TBD') {
          losingTeams.add(game.homeTeam);
        }
      }
    }
  });

  // Add all teams that lost in playoffs to eliminated set
  losingTeams.forEach(teamId => {
    eliminatedTeams.add(teamId);
  });

  return eliminatedTeams;
}

// New function to check if regular season is complete
export function isRegularSeasonComplete(currentWeek: number, schedule?: any): boolean {
  console.log(`🔍 isRegularSeasonComplete check - currentWeek=${currentWeek}, hasSchedule=${!!schedule}`);
  
  // If we're on week 19+, regular season must be complete (we're in playoffs)
  if (currentWeek > 18) {
    console.log(`   ✅ On playoff week, regular season must be complete`);
    return true;
  }
  
  // If we're on week 18 and have a schedule, check if all regular season games are resolved
  if (currentWeek === 18 && schedule) {
    // Check all weeks 1-18 to see if all games are resolved
    for (let week = 1; week <= 18; week++) {
      const weekGames = schedule.weeks[week]?.games || [];
      console.log(`   Week ${week}: ${weekGames.length} games`);
      for (const game of weekGames) {
        if (game.homeScore === undefined || game.awayScore === undefined) {
          console.log(`   ❌ Found unresolved game in Week ${week}: ${game.awayTeam} vs ${game.homeTeam}`);
          return false; // Found an unresolved game
        }
      }
    }
    console.log(`   ✅ All regular season games are resolved`);
    return true; // All regular season games are resolved
  }
  
  // If we're not at week 18 yet, regular season is not complete
  console.log(`   ❌ Not at week 18 yet or no schedule`);
  return false;
}

// Helper function to get playoff winners from saved games
function getPlayoffWinners(savedPlayoffGames: any[], week: number): string[] {
  console.log(`🔍 getPlayoffWinners called for week ${week}`);
  console.log(`   Total saved playoff games: ${savedPlayoffGames?.length || 0}`);
  
  const weekGames = savedPlayoffGames.filter(game => game.week === week);
  console.log(`   Week ${week} games: ${weekGames.length}`);
  
  const playedGames = weekGames.filter(game => game.isPlayed);
  console.log(`   Week ${week} played games: ${playedGames.length}`);
  
  const completedGames = playedGames.filter(game => game.homeScore !== undefined && game.awayScore !== undefined);
  console.log(`   Week ${week} completed games: ${completedGames.length}`);
  
  const winners: string[] = [];
  
  completedGames.forEach(game => {
    if (game.homeScore > game.awayScore) {
      winners.push(game.homeTeam);
      console.log(`   Winner: ${game.homeTeam} (${game.homeScore}-${game.awayScore})`);
    } else if (game.awayScore > game.homeScore) {
      winners.push(game.awayTeam);
      console.log(`   Winner: ${game.awayTeam} (${game.awayScore}-${game.homeScore})`);
    }
  });
  
  console.log(`   Final winners for week ${week}: ${winners.join(', ')}`);
  return winners;
}

// New function to check if playoff weeks should be unlocked (regardless of current week)
export function arePlayoffWeeksUnlocked(schedule?: any): boolean {
  if (!schedule) return false;
  
  // Check if all regular season games (weeks 1-18) are resolved
  for (let week = 1; week <= 18; week++) {
    const weekGames = schedule.weeks[week]?.games || [];
    for (const game of weekGames) {
      if (game.homeScore === undefined || game.awayScore === undefined) {
        return false; // Found an unresolved game
      }
    }
  }
  
  return true; // All regular season games are resolved
}

// New function to get playoff status message
export function getPlayoffStatusMessage(currentWeek: number): string {
  if (currentWeek < 18) {
    return `Regular season in progress. Playoff brackets will be available after Week 18.`;
  } else if (currentWeek === 18) {
    return `Regular season complete! Playoff brackets will be available after Week 18 is resolved.`;
  } else {
    return `Playoff tournament in progress.`;
  }
} 