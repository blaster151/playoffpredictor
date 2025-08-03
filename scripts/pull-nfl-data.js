const fs = require('fs');
const path = require('path');

// NFL API endpoints
const ESPN_API_BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'NFL-Playoff-Predictor/1.0',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Attempt ${i + 1} failed for ${url}:`, error.message);
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
    }
  }
}

async function pullTeams() {
  console.log('📋 Pulling teams data...');
  
  try {
    const data = await fetchWithRetry(`${ESPN_API_BASE}/teams`);
    
    const teams = [];
    const teamsData = data.sports?.[0]?.leagues?.[0]?.teams || [];
    
    for (const teamData of teamsData) {
      const team = teamData.team;
      const groups = teamData.groups || {};
      
      if (team && groups.conference && groups.division) {
        teams.push({
          id: team.id,
          name: team.name,
          abbreviation: team.abbreviation,
          conference: groups.conference.name === 'American Football Conference' ? 'AFC' : 'NFC',
          division: groups.division.name,
          logo: team.logos?.[0]?.href || `/logos/${team.abbreviation.toLowerCase()}.png`,
          color: team.color,
          alternateColor: team.alternateColor,
        });
      }
    }
    
    return teams;
  } catch (error) {
    console.error('Error pulling teams:', error);
    return null;
  }
}

async function pullSchedule(year = '2025') {
  console.log(`📅 Pulling ${year} schedule...`);
  
  try {
    const data = await fetchWithRetry(`${ESPN_API_BASE}/scoreboard?year=${year}`);
    
    const games = [];
    const events = data.events || [];
    
    for (const event of events) {
      const competition = event.competitions?.[0];
      
      if (competition) {
        const awayTeam = competition.competitors?.find(c => c.homeAway === 'away');
        const homeTeam = competition.competitors?.find(c => c.homeAway === 'home');
        
        if (awayTeam && homeTeam) {
          const gameDate = new Date(competition.date);
          const week = calculateWeek(gameDate, year);
          
          games.push({
            id: event.id,
            week,
            awayTeam: awayTeam.team.id,
            homeTeam: homeTeam.team.id,
            awayScore: awayTeam.score ? parseInt(awayTeam.score) : undefined,
            homeScore: homeTeam.score ? parseInt(homeTeam.score) : undefined,
            day: gameDate.toLocaleDateString('en-US', { weekday: 'short' }),
            date: gameDate.toISOString().split('T')[0],
            isPlayed: competition.status.type.completed,
            status: competition.status.type.name,
          });
        }
      }
    }
    
    return games;
  } catch (error) {
    console.error(`Error pulling ${year} schedule:`, error);
    return null;
  }
}

async function pullTeamRoster(teamId, teamName) {
  try {
    const data = await fetchWithRetry(`${ESPN_API_BASE}/teams/${teamId}/roster`);
    return data.athletes || [];
  } catch (error) {
    console.error(`Error pulling roster for ${teamName}:`, error.message);
    return [];
  }
}

async function pullTeamStats(teamId, teamName) {
  try {
    const data = await fetchWithRetry(`${ESPN_API_BASE}/teams/${teamId}/stats`);
    return data.stats || {};
  } catch (error) {
    console.error(`Error pulling stats for ${teamName}:`, error.message);
    return {};
  }
}

function calculateWeek(gameDate, year) {
  const seasonStart = new Date(`${year}-09-01`);
  const daysDiff = Math.floor((gameDate.getTime() - seasonStart.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.floor(daysDiff / 7) + 1);
}

async function saveToFile(data, filename) {
  const dataDir = path.join(__dirname, '..', 'src', 'data', 'generated');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  const filepath = path.join(dataDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`✅ Saved ${filename}`);
}

async function pullAllData() {
  console.log('🚀 Starting NFL data pull...\n');
  
  // Pull teams
  const teams = await pullTeams();
  if (teams) {
    await saveToFile(teams, 'teams.json');
    console.log(`📊 Found ${teams.length} teams\n`);
  }
  
  // Pull schedules for multiple years
  const years = ['2024', '2025'];
  for (const year of years) {
    const schedule = await pullSchedule(year);
    if (schedule) {
      await saveToFile(schedule, `schedule-${year}.json`);
      console.log(`📅 Found ${schedule.length} games for ${year}\n`);
    }
  }
  
  // Pull rosters and stats for each team (optional, can be slow)
  if (teams && process.argv.includes('--include-rosters')) {
    console.log('👥 Pulling team rosters and stats...');
    
    for (const team of teams) {
      console.log(`  Pulling ${team.name}...`);
      
      const roster = await pullTeamRoster(team.id, team.name);
      if (roster.length > 0) {
        await saveToFile(roster, `roster-${team.id}.json`);
      }
      
      const stats = await pullTeamStats(team.id, team.name);
      if (Object.keys(stats).length > 0) {
        await saveToFile(stats, `stats-${team.id}.json`);
      }
      
      // Small delay to be respectful to the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log('🎉 NFL data pull complete!');
  console.log('\n📁 Files saved to: src/data/generated/');
  console.log('📋 Available files:');
  console.log('  - teams.json');
  console.log('  - schedule-2024.json');
  console.log('  - schedule-2025.json');
  if (process.argv.includes('--include-rosters')) {
    console.log('  - roster-{teamId}.json (for each team)');
    console.log('  - stats-{teamId}.json (for each team)');
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('Usage: node scripts/pull-nfl-data.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --include-rosters    Also pull team rosters and stats (slower)');
  console.log('  --help               Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/pull-nfl-data.js');
  console.log('  node scripts/pull-nfl-data.js --include-rosters');
  process.exit(0);
}

// Run the data pull
pullAllData().catch(error => {
  console.error('❌ Data pull failed:', error);
  process.exit(1);
}); 