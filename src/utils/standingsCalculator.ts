import { Team, Game, TeamRecord, TeamStanding } from '../types/nfl';
import { getTeamById } from '../data/nflData';

export const calculateTeamRecord = (teamId: string, games: Game[]): TeamRecord => {
  const record: TeamRecord = {
    wins: 0,
    losses: 0,
    ties: 0,
    divisionWins: 0,
    divisionLosses: 0,
    divisionTies: 0,
    conferenceWins: 0,
    conferenceLosses: 0,
    conferenceTies: 0,
    pointsFor: 0,
    pointsAgainst: 0,
  };

  const team = getTeamById(teamId);
  if (!team) return record;

  games.forEach(game => {
    if (game.awayScore === undefined || game.homeScore === undefined) return;

    const isAway = game.awayTeam === teamId;
    const isHome = game.homeTeam === teamId;
    
    if (!isAway && !isHome) return;

    const teamScore = isAway ? game.awayScore : game.homeScore;
    const opponentScore = isAway ? game.homeScore : game.awayScore;
    const opponentTeam = getTeamById(isAway ? game.homeTeam : game.awayTeam);

    // Update points
    record.pointsFor += teamScore;
    record.pointsAgainst += opponentScore;

    // Determine game result
    if (teamScore > opponentScore) {
      record.wins++;
      if (opponentTeam?.conference === team.conference) {
        record.conferenceWins++;
      }
      if (opponentTeam?.division === team.division) {
        record.divisionWins++;
      }
    } else if (teamScore < opponentScore) {
      record.losses++;
      if (opponentTeam?.conference === team.conference) {
        record.conferenceLosses++;
      }
      if (opponentTeam?.division === team.division) {
        record.divisionLosses++;
      }
    } else {
      record.ties++;
      if (opponentTeam?.conference === team.conference) {
        record.conferenceTies++;
      }
      if (opponentTeam?.division === team.division) {
        record.divisionTies++;
      }
    }
  });

  return record;
};

export const calculateStandings = (teams: Team[], games: Game[]): TeamStanding[] => {
  const standings: TeamStanding[] = teams.map(team => {
    const record = calculateTeamRecord(team.id, games);
    const gamesPlayed = record.wins + record.losses + record.ties;
    const gamesRemaining = 17 - gamesPlayed; // 18-game season, 1 bye week

    return {
      team,
      record,
      gamesPlayed,
      gamesRemaining,
      playoffStatus: 'out', // Will be calculated later
    };
  });

  // Sort by conference and division
  const afcStandings = standings.filter(s => s.team.conference === 'AFC');
  const nfcStandings = standings.filter(s => s.team.conference === 'NFC');

  // Sort within each conference by division, then by record
  const sortStandings = (conferenceStandings: TeamStanding[]) => {
    return conferenceStandings.sort((a, b) => {
      // First sort by division
      if (a.team.division !== b.team.division) {
        const divisions = ['North', 'South', 'East', 'West'];
        return divisions.indexOf(a.team.division) - divisions.indexOf(b.team.division);
      }

      // Then sort by record (wins, then win percentage, then head-to-head, etc.)
      const aWinPct = a.record.wins / (a.record.wins + a.record.losses + a.record.ties);
      const bWinPct = b.record.wins / (b.record.wins + b.record.losses + b.record.ties);
      
      if (aWinPct !== bWinPct) {
        return bWinPct - aWinPct; // Higher win percentage first
      }

      // If tied, use point differential
      const aPointDiff = a.record.pointsFor - a.record.pointsAgainst;
      const bPointDiff = b.record.pointsFor - b.record.pointsAgainst;
      
      return bPointDiff - aPointDiff; // Higher point differential first
    });
  };

  const sortedAfc = sortStandings(afcStandings);
  const sortedNfc = sortStandings(nfcStandings);

  // Assign playoff seeds and status
  [...sortedAfc, ...sortedNfc].forEach((standing, index) => {
    const isAfc = standing.team.conference === 'AFC';
    const conferenceStandings = isAfc ? sortedAfc : sortedNfc;
    const conferenceIndex = conferenceStandings.indexOf(standing);

    if (conferenceIndex < 7) { // Top 7 teams in each conference make playoffs
      standing.playoffSeed = conferenceIndex + 1;
      standing.playoffStatus = 'in';
    } else if (conferenceIndex < 10) { // Teams 8-10 are in the bubble
      standing.playoffStatus = 'bubble';
    } else {
      standing.playoffStatus = 'out';
    }
  });

  return [...sortedAfc, ...sortedNfc];
};

export const getDivisionStandings = (standings: TeamStanding[], division: string, conference: 'AFC' | 'NFC') => {
  return standings.filter(s => 
    s.team.division === division && s.team.conference === conference
  );
};

export const getConferenceStandings = (standings: TeamStanding[], conference: 'AFC' | 'NFC') => {
  return standings.filter(s => s.team.conference === conference);
}; 