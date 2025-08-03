import { Team } from '../types/nfl';

// Types for the schedule generator
export interface Matchup {
  home: string;
  away: string;
}

export interface Division {
  name: string;
  teams: string[];
}

export interface Conference {
  name: string;
  divisions: string[];
}

export interface PriorYearStandings {
  [teamId: string]: number; // teamId -> divisionRank (1-4)
}

export interface ScheduleConfig {
  teams: Team[];
  divisions: { [key: string]: string[] };
  conferences: { [key: string]: string[] };
  rotationYear: number;
  priorYearStandings: PriorYearStandings;
}

// NFL rotational patterns
const INTRA_CONFERENCE_ROTATION = [
  // Year 1: North vs South, East vs West
  [['North', 'South'], ['East', 'West']],
  // Year 2: North vs East, South vs West  
  [['North', 'East'], ['South', 'West']],
  // Year 3: North vs West, South vs East
  [['North', 'West'], ['South', 'East']],
];

const INTER_CONFERENCE_ROTATION = [
  // Year 1: AFC North vs NFC North, AFC South vs NFC South, etc.
  [['AFC_North', 'NFC_North'], ['AFC_South', 'NFC_South'], ['AFC_East', 'NFC_East'], ['AFC_West', 'NFC_West']],
  // Year 2: AFC North vs NFC South, AFC South vs NFC East, etc.
  [['AFC_North', 'NFC_South'], ['AFC_South', 'NFC_East'], ['AFC_East', 'NFC_West'], ['AFC_West', 'NFC_North']],
  // Year 3: AFC North vs NFC East, AFC South vs NFC West, etc.
  [['AFC_North', 'NFC_East'], ['AFC_South', 'NFC_West'], ['AFC_East', 'NFC_North'], ['AFC_West', 'NFC_South']],
  // Year 4: AFC North vs NFC West, AFC South vs NFC North, etc.
  [['AFC_North', 'NFC_West'], ['AFC_South', 'NFC_North'], ['AFC_East', 'NFC_South'], ['AFC_West', 'NFC_East']],
];

const EXTRA_GAME_ROTATION = [
  // Year 1: AFC North vs NFC South, AFC South vs NFC East, etc.
  ['AFC_North', 'AFC_South', 'AFC_East', 'AFC_West'],
  // Year 2: AFC North vs NFC East, AFC South vs NFC West, etc.
  ['AFC_North', 'AFC_South', 'AFC_East', 'AFC_West'],
  // Year 3: AFC North vs NFC West, AFC South vs NFC North, etc.
  ['AFC_North', 'AFC_South', 'AFC_East', 'AFC_West'],
  // Year 4: AFC North vs NFC North, AFC South vs NFC South, etc.
  ['AFC_North', 'AFC_South', 'AFC_East', 'AFC_West'],
];

// Helper function to get intra-conference rotation for a given year
export function getIntraConferenceRotation(year: number, divisions: string[]): [string, string][] {
  const rotationIndex = (year - 1) % INTRA_CONFERENCE_ROTATION.length;
  const rotation = INTRA_CONFERENCE_ROTATION[rotationIndex];
  
  // Filter rotation to only include divisions that exist in the conference
  return rotation.filter((pair): pair is [string, string] => 
    pair.length === 2 && divisions.includes(pair[0]) && divisions.includes(pair[1])
  );
}

// Helper function to get inter-conference rotation for a given year
export function getInterConferenceRotation(year: number): [string, string][] {
  const rotationIndex = (year - 1) % INTER_CONFERENCE_ROTATION.length;
  const rotation = INTER_CONFERENCE_ROTATION[rotationIndex];
  
  // Ensure all pairs have exactly 2 elements
  return rotation.filter((pair): pair is [string, string] => pair.length === 2);
}

// Helper function to determine home team based on rotation
export function chooseHomeTeam(teamA: string, teamB: string, year: number): string {
  // Add randomization to prevent predictable home/away patterns
  const teamAId = parseInt(teamA.replace(/\D/g, '') || '0');
  const teamBId = parseInt(teamB.replace(/\D/g, '') || '0');
  
  // Use year, team IDs, and current timestamp for randomization
  const combined = teamAId + teamBId + year + Date.now();
  return combined % 2 === 0 ? teamA : teamB;
}

// Helper function to find team with specific rank in division
export function findTeamWithRank(
  division: string, 
  rank: number, 
  divisions: { [key: string]: string[] },
  priorYearStandings: PriorYearStandings
): string | null {
  const teamsInDivision = divisions[division] || [];
  
  // Find teams with the specified rank
  const teamsWithRank = teamsInDivision.filter(teamId => 
    priorYearStandings[teamId] === rank
  );
  
  // If multiple teams have the same rank, choose the first one
  // In a real implementation, you might want more sophisticated tiebreaking
  return teamsWithRank.length > 0 ? teamsWithRank[0] : null;
}

// Helper function to check if teams are already scheduled
export function notAlreadyScheduled(
  team1: string, 
  team2: string, 
  existingMatchups: Matchup[]
): boolean {
  return !existingMatchups.some(matchup => 
    (matchup.home === team1 && matchup.away === team2) ||
    (matchup.home === team2 && matchup.away === team1)
  );
}

// Helper function to get extra game division for the year
export function getExtraGameDivision(year: number, conference: string): string {
  const rotationIndex = (year - 1) % EXTRA_GAME_ROTATION.length;
  const rotation = EXTRA_GAME_ROTATION[rotationIndex];
  
  // Find the division for the given conference
  const conferencePrefix = conference === 'AFC' ? 'AFC_' : 'NFC_';
  const divisions = ['North', 'South', 'East', 'West'];
  
  for (const div of divisions) {
    const fullDivName = conferencePrefix + div;
    if (rotation.includes(fullDivName)) {
      return div;
    }
  }
  
  // Fallback
  return 'North';
}

// Helper function to get conference of a team
export function getConference(teamId: string, teams: Team[]): string {
  const team = teams.find(t => t.id === teamId);
  return team?.conference || 'AFC';
}

// Helper function to get division of a team
export function getDivision(teamId: string, teams: Team[]): string {
  const team = teams.find(t => t.id === teamId);
  return team?.division || 'North';
}

// Helper function to get other conference
export function getOtherConference(conference: string): string {
  return conference === 'AFC' ? 'NFC' : 'AFC';
}

// Helper function to get the other team from a matchup
export function otherOne(homeTeam: string, team1: string, team2: string): string {
  return homeTeam === team1 ? team2 : team1;
}

// Main function to generate matchups
export function generateMatchups(config: ScheduleConfig): Matchup[] {
  const { teams, divisions, conferences, rotationYear, priorYearStandings } = config;
  const matchups: Matchup[] = [];

  // ------------------------------------------------
  // STEP 1: Division games (6 games per team)
  // ------------------------------------------------
  for (const [divisionName, teamsInDiv] of Object.entries(divisions)) {
    for (let i = 0; i < teamsInDiv.length; i++) {
      for (let j = i + 1; j < teamsInDiv.length; j++) {
        const team1 = teamsInDiv[i];
        const team2 = teamsInDiv[j];
        
        // Home and away games for each division opponent
        matchups.push({ home: team1, away: team2 });
        matchups.push({ home: team2, away: team1 });
      }
    }
  }

  // ------------------------------------------------
  // STEP 2: Intra-conference, inter-division games (4 games per team - 2 home, 2 away)
  // ------------------------------------------------
  for (const [conferenceName, divisionsInConf] of Object.entries(conferences)) {
    const intraMatchups = getIntraConferenceRotation(rotationYear, divisionsInConf);
    
    for (const [divA, divB] of intraMatchups) {
      const teamsInDivA = divisions[divA] || [];
      const teamsInDivB = divisions[divB] || [];
      
      for (const teamA of teamsInDivA) {
        for (const teamB of teamsInDivB) {
          // Create both home and away games to ensure 2 home, 2 away for each team
          matchups.push({ home: teamA, away: teamB });
          matchups.push({ home: teamB, away: teamA });
        }
      }
    }
  }

  // ------------------------------------------------
  // STEP 3: Inter-conference games (4 games per team - 2 home, 2 away)
  // ------------------------------------------------
  // Each team plays all 4 teams from one division in the other conference
  const interMatchups = getInterConferenceRotation(rotationYear);
  
  // Only use the first division pair for this year (each team plays 4 games vs one division)
  if (interMatchups.length > 0) {
    const [nfcDiv, afcDiv] = interMatchups[0]; // Only use first division pair
    const nfcTeams = divisions[nfcDiv] || [];
    const afcTeams = divisions[afcDiv] || [];
    
    for (const nfcTeam of nfcTeams) {
      for (const afcTeam of afcTeams) {
        // Create both home and away games to ensure 2 home, 2 away for each team
        matchups.push({ home: nfcTeam, away: afcTeam });
        matchups.push({ home: afcTeam, away: nfcTeam });
      }
    }
  }

  // ------------------------------------------------
  // STEP 4: Same-place finishers (2 games)
  // ------------------------------------------------
  for (const team of teams) {
    const conference = getConference(team.id, teams);
    const myDivision = getDivision(team.id, teams);
    const myRank = priorYearStandings[team.id];
    const otherDivisions = (conferences[conference] || []).filter(div => div !== myDivision);

    for (const otherDiv of otherDivisions) {
      const opponent = findTeamWithRank(otherDiv, myRank, divisions, priorYearStandings);
      
      if (opponent && notAlreadyScheduled(team.id, opponent, matchups)) {
        const homeTeam = chooseHomeTeam(team.id, opponent, rotationYear);
        const awayTeam = otherOne(homeTeam, team.id, opponent);
        
        matchups.push({ home: homeTeam, away: awayTeam });
      }
    }
  }

  // ------------------------------------------------
  // STEP 5: 17th game (extra inter-conference, same-place finisher)
  // ------------------------------------------------
  for (const team of teams) {
    const myRank = priorYearStandings[team.id];
    const myConference = getConference(team.id, teams);
    const otherConference = getOtherConference(myConference);
    const targetDivision = getExtraGameDivision(rotationYear, myConference);
    
    // Find the full division name for the other conference
    const fullTargetDivision = `${otherConference}_${targetDivision}`;
    const opponent = findTeamWithRank(fullTargetDivision, myRank, divisions, priorYearStandings);
    
    if (opponent && notAlreadyScheduled(team.id, opponent, matchups)) {
      const homeTeam = chooseHomeTeam(team.id, opponent, rotationYear);
      const awayTeam = otherOne(homeTeam, team.id, opponent);
      
      matchups.push({ home: homeTeam, away: awayTeam });
    }
  }

  // Log matchup statistics for validation
  const divisionGames = matchups.filter(m => {
    const homeTeam = teams.find(t => t.id === m.home);
    const awayTeam = teams.find(t => t.id === m.away);
    return homeTeam && awayTeam && homeTeam.division === awayTeam.division;
  }).length;
  
  const intraConferenceGames = matchups.filter(m => {
    const homeTeam = teams.find(t => t.id === m.home);
    const awayTeam = teams.find(t => t.id === m.away);
    return homeTeam && awayTeam && homeTeam.conference === awayTeam.conference && homeTeam.division !== awayTeam.division;
  }).length;
  
  const interConferenceGames = matchups.filter(m => {
    const homeTeam = teams.find(t => t.id === m.home);
    const awayTeam = teams.find(t => t.id === m.away);
    return homeTeam && awayTeam && homeTeam.conference !== awayTeam.conference;
  }).length;
  
  console.log(`📊 Matchup Statistics:`);
  console.log(`   Division Games: ${divisionGames} (expected: 96)`);
  console.log(`   Intra-Conference Games: ${intraConferenceGames} (expected: 96)`);
  console.log(`   Inter-Conference Games: ${interConferenceGames} (expected: 80)`);
  console.log(`   Total Games: ${matchups.length} (expected: 272)`);
  
  return matchups;
}

// Utility function to create schedule config from teams data
export function createScheduleConfig(
  teams: Team[], 
  rotationYear: number, 
  priorYearStandings: PriorYearStandings
): ScheduleConfig {
  const divisions: { [key: string]: string[] } = {};
  const conferences: { [key: string]: string[] } = {};

  // Group teams by division
  for (const team of teams) {
    const divKey = `${team.conference}_${team.division}`;
    if (!divisions[divKey]) {
      divisions[divKey] = [];
    }
    divisions[divKey].push(team.id);
  }

  // Group divisions by conference
  for (const team of teams) {
    if (!conferences[team.conference]) {
      conferences[team.conference] = [];
    }
    const divKey = `${team.conference}_${team.division}`;
    if (!conferences[team.conference].includes(divKey)) {
      conferences[team.conference].push(divKey);
    }
  }

  return {
    teams,
    divisions,
    conferences,
    rotationYear,
    priorYearStandings,
  };
}

// Utility function to validate matchups
export function validateMatchups(matchups: Matchup[], teams: Team[]): {
  isValid: boolean;
  errors: string[];
  stats: {
    totalGames: number;
    gamesPerTeam: { [teamId: string]: number };
    homeGames: { [teamId: string]: number };
    awayGames: { [teamId: string]: number };
    divisionGames: { [teamId: string]: number };
  };
} {
  const errors: string[] = [];
  const gamesPerTeam: { [teamId: string]: number } = {};
  const homeGames: { [teamId: string]: number } = {};
  const awayGames: { [teamId: string]: number } = {};
  const divisionGames: { [teamId: string]: number } = {};

  // Initialize counters
  for (const team of teams) {
    gamesPerTeam[team.id] = 0;
    homeGames[team.id] = 0;
    awayGames[team.id] = 0;
    divisionGames[team.id] = 0;
  }

  // Count games
  for (const matchup of matchups) {
    gamesPerTeam[matchup.home]++;
    gamesPerTeam[matchup.away]++;
    homeGames[matchup.home]++;
    awayGames[matchup.away]++;
  }

  // Validate each team has 17 games (18-game season with 1 bye)
  for (const team of teams) {
    if (gamesPerTeam[team.id] !== 17) {
      errors.push(`Team ${team.name} has ${gamesPerTeam[team.id]} games, expected 17`);
    }
  }

  // Check for duplicate matchups
  const matchupSet = new Set<string>();
  for (const matchup of matchups) {
    const key = `${matchup.home}-${matchup.away}`;
    const reverseKey = `${matchup.away}-${matchup.home}`;
    
    if (matchupSet.has(key) || matchupSet.has(reverseKey)) {
      errors.push(`Duplicate matchup: ${matchup.home} vs ${matchup.away}`);
    }
    matchupSet.add(key);
  }

  // Validate division rivalry constraint - each team must play division rivals exactly twice
  const divisions: { [key: string]: string[] } = {};
  
  // Group teams by division
  for (const team of teams) {
    const divKey = `${team.conference}_${team.division}`;
    if (!divisions[divKey]) {
      divisions[divKey] = [];
    }
    divisions[divKey].push(team.id);
  }

      // Check division games for each team
    for (const [divisionName, teamsInDiv] of Object.entries(divisions)) {
      for (const teamId of teamsInDiv) {
        let divisionGameCount = 0;
        
        // Count games where this team is involved against division rivals
        for (const matchup of matchups) {
          if (matchup.home === teamId || matchup.away === teamId) {
            const opponent = matchup.home === teamId ? matchup.away : matchup.home;
            const opponentTeam = teams.find(t => t.id === opponent);
            
            if (opponentTeam && 
                opponentTeam.conference === teams.find(t => t.id === teamId)!.conference &&
                opponentTeam.division === teams.find(t => t.id === teamId)!.division) {
              divisionGameCount++;
            }
          }
        }
        
        divisionGames[teamId] = divisionGameCount;
        
        // Each team should have 6 division games (3 opponents × 2 games each)
        if (divisionGameCount !== 6) {
          errors.push(`Team ${teamId} has ${divisionGameCount} division games, expected 6`);
        }
      }
    }

  return {
    isValid: errors.length === 0,
    errors,
    stats: {
      totalGames: matchups.length,
      gamesPerTeam,
      homeGames,
      awayGames,
      divisionGames,
    },
  };
} 