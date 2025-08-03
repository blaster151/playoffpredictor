const { generateMatchups, createScheduleConfig } = require('../src/utils/scheduleGenerator.ts');
const { teams } = require('../src/data/nflData.ts');

// Create mock prior year standings (all teams tied for 1st in their division)
const priorYearStandings = {};
teams.forEach(team => {
  priorYearStandings[team.id] = 1;
});

// Create schedule config for 2025 season
const config = createScheduleConfig(teams, 2025, priorYearStandings);

// Generate all matchups
const matchups = generateMatchups(config);

console.log('🧪 Testing Matchup Generation...\n');
console.log(`📊 Total matchups generated: ${matchups.length}`);
console.log(`📊 Expected total games for 32 teams (17 games each): ${32 * 17 / 2}`);
console.log(`📊 Difference: ${matchups.length - (32 * 17 / 2)}`);

// Count games per team
const gamesPerTeam = {};
matchups.forEach(matchup => {
  gamesPerTeam[matchup.home] = (gamesPerTeam[matchup.home] || 0) + 1;
  gamesPerTeam[matchup.away] = (gamesPerTeam[matchup.away] || 0) + 1;
});

console.log('\n📈 Games per team:');
Object.entries(gamesPerTeam).forEach(([teamId, count]) => {
  const team = teams.find(t => t.id === teamId);
  console.log(`   ${team?.name || teamId}: ${count} games`);
});

// Check for teams with wrong number of games
const teamsWithWrongGames = Object.entries(gamesPerTeam).filter(([teamId, count]) => count !== 17);
if (teamsWithWrongGames.length > 0) {
  console.log('\n❌ Teams with wrong number of games:');
  teamsWithWrongGames.forEach(([teamId, count]) => {
    const team = teams.find(t => t.id === teamId);
    console.log(`   ${team?.name || teamId}: ${count} games (expected 17)`);
  });
} else {
  console.log('\n✅ All teams have exactly 17 games!');
}

console.log('\n🎯 First 10 matchups:');
matchups.slice(0, 10).forEach((matchup, index) => {
  const homeTeam = teams.find(t => t.id === matchup.home);
  const awayTeam = teams.find(t => t.id === matchup.away);
  console.log(`   ${index + 1}. ${homeTeam?.name || matchup.home} vs ${awayTeam?.name || matchup.away}`);
}); 