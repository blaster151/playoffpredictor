// Quick diagnostic to understand the matchup generation issue
import { generateMatchups, createScheduleConfig } from './src/utils/scheduleGenerator.ts';
import { teams } from './src/data/nflData.ts';

// Simple standings
const priorYearStandings = {};
const divisions = {};

teams.forEach(team => {
  const key = `${team.conference}_${team.division}`;
  if (!divisions[key]) divisions[key] = [];
  divisions[key].push(team);
});

Object.values(divisions).forEach((divisionTeams) => {
  divisionTeams.sort((a, b) => a.id.localeCompare(b.id));
  divisionTeams.forEach((team, index) => {
    priorYearStandings[team.id] = index + 1;
  });
});

const config = createScheduleConfig(teams, 2026, priorYearStandings);
const matchups = generateMatchups(config);

console.log('\n📊 Per-team game counts:');
const gameCounts = {};
teams.forEach(t => gameCounts[t.id] = 0);

matchups.forEach(m => {
  gameCounts[m.home]++;
  gameCounts[m.away]++;
});

const sorted = Object.entries(gameCounts).sort((a, b) => b[1] - a[1]);
sorted.forEach(([teamId, count]) => {
  const icon = count === 17 ? '✅' : count > 17 ? '❌' : '⚠️';
  console.log(`${icon} ${teamId}: ${count} games`);
});

console.log(`\nTeams with 17 games: ${sorted.filter(([_, c]) => c === 17).length}`);
console.log(`Teams with >17 games: ${sorted.filter(([_, c]) => c > 17).length}`);
console.log(`Teams with <17 games: ${sorted.filter(([_, c]) => c < 17).length}`);

