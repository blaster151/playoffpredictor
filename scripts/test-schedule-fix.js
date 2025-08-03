// Simple test to verify schedule generation fix
console.log('🧪 Testing Schedule Generation Fix...\n');

// Mock teams data (simplified for testing)
const mockTeams = [
  { id: 'BUF', name: 'Buffalo Bills', conference: 'AFC', division: 'East' },
  { id: 'MIA', name: 'Miami Dolphins', conference: 'AFC', division: 'East' },
  { id: 'NE', name: 'New England Patriots', conference: 'AFC', division: 'East' },
  { id: 'NYJ', name: 'New York Jets', conference: 'AFC', division: 'East' },
  { id: 'BAL', name: 'Baltimore Ravens', conference: 'AFC', division: 'North' },
  { id: 'CIN', name: 'Cincinnati Bengals', conference: 'AFC', division: 'North' },
  { id: 'CLE', name: 'Cleveland Browns', conference: 'AFC', division: 'North' },
  { id: 'PIT', name: 'Pittsburgh Steelers', conference: 'AFC', division: 'North' },
];

// Mock the schedule generation logic
function generateFullNFLSchedule(teams) {
  // Create mock prior year standings (all teams tied for 1st in their division)
  const priorYearStandings = {};
  teams.forEach(team => {
    priorYearStandings[team.id] = 1;
  });
  
  // Generate division games (each team plays division opponents twice)
  const games = [];
  const divisions = new Map();
  
  // Group teams by division
  teams.forEach(team => {
    if (!divisions.has(team.division)) {
      divisions.set(team.division, []);
    }
    divisions.get(team.division).push(team);
  });
  
  // Generate division games (each team plays division opponents twice)
  let week = 1;
  const maxWeeks = 18; // NFL season has 18 weeks
  
  divisions.forEach((divisionTeams, divisionName) => {
    for (let i = 0; i < divisionTeams.length; i++) {
      for (let j = i + 1; j < divisionTeams.length; j++) {
        // Home game
        if (week <= maxWeeks) {
          games.push({
            week,
            home: divisionTeams[i].id,
            away: divisionTeams[j].id,
          });
          week++;
        }
        
        // Away game
        if (week <= maxWeeks) {
          games.push({
            week,
            home: divisionTeams[j].id,
            away: divisionTeams[i].id,
          });
          week++;
        }
      }
    }
  });
  
  return games;
}

// Test the function
const games = generateFullNFLSchedule(mockTeams);

console.log(`📊 Generated ${games.length} games`);
console.log(`📊 Games distributed across ${Math.max(...games.map(g => g.week))} weeks`);

// Count games per team
const gamesPerTeam = {};
games.forEach(game => {
  gamesPerTeam[game.home] = (gamesPerTeam[game.home] || 0) + 1;
  gamesPerTeam[game.away] = (gamesPerTeam[game.away] || 0) + 1;
});

console.log('\n📈 Games per team:');
Object.entries(gamesPerTeam).forEach(([teamId, count]) => {
  const team = mockTeams.find(t => t.id === teamId);
  console.log(`   ${team?.name || teamId}: ${count} games`);
});

// Count games per week
const gamesPerWeek = {};
games.forEach(game => {
  gamesPerWeek[game.week] = (gamesPerWeek[game.week] || 0) + 1;
});

console.log('\n📅 Games per week:');
Object.entries(gamesPerWeek).forEach(([week, count]) => {
  console.log(`   Week ${week}: ${count} games`);
});

console.log('\n✅ Test completed!'); 