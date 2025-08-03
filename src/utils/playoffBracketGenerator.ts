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

export function generatePlayoffBrackets(standings: TeamStanding[]): PlayoffBracket {
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

  // Generate Wild Card games (Week 19)
  // AFC: 2v7, 3v6, 4v5
  wildCard.push(createGame(afcStandings[1], afcStandings[6], 19, 'wildcard-afc-1'));
  wildCard.push(createGame(afcStandings[2], afcStandings[5], 19, 'wildcard-afc-2'));
  wildCard.push(createGame(afcStandings[3], afcStandings[4], 19, 'wildcard-afc-3'));

  // NFC: 2v7, 3v6, 4v5
  wildCard.push(createGame(nfcStandings[1], nfcStandings[6], 19, 'wildcard-nfc-1'));
  wildCard.push(createGame(nfcStandings[2], nfcStandings[5], 19, 'wildcard-nfc-2'));
  wildCard.push(createGame(nfcStandings[3], nfcStandings[4], 19, 'wildcard-nfc-3'));

  // Generate Divisional games (Week 20)
  // AFC: 1v(lowest remaining), (2v7 winner)v(3v6 winner)
  divisional.push(createGame(afcStandings[0], null, 20, 'divisional-afc-1')); // 1 seed vs TBD
  divisional.push(createGame(null, null, 20, 'divisional-afc-2')); // TBD vs TBD

  // NFC: 1v(lowest remaining), (2v7 winner)v(3v6 winner)
  divisional.push(createGame(nfcStandings[0], null, 20, 'divisional-nfc-1')); // 1 seed vs TBD
  divisional.push(createGame(null, null, 20, 'divisional-nfc-2')); // TBD vs TBD

  // Generate Conference Championships (Week 21)
  conferenceChampionships.push(createGame(null, null, 21, 'afc-championship'));
  conferenceChampionships.push(createGame(null, null, 21, 'nfc-championship'));

  // Generate Super Bowl (Week 22)
  superBowl.push(createGame(null, null, 22, 'super-bowl'));

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