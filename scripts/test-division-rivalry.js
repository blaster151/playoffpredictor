// Test division rivalry constraint logic
console.log('🧪 Testing Division Rivalry Constraint Logic...');

// Mock teams data for testing
const mockTeams = [
  { id: 'NE', name: 'New England Patriots', conference: 'AFC', division: 'East' },
  { id: 'BUF', name: 'Buffalo Bills', conference: 'AFC', division: 'East' },
  { id: 'MIA', name: 'Miami Dolphins', conference: 'AFC', division: 'East' },
  { id: 'NYJ', name: 'New York Jets', conference: 'AFC', division: 'East' },
  { id: 'KC', name: 'Kansas City Chiefs', conference: 'AFC', division: 'West' },
  { id: 'LV', name: 'Las Vegas Raiders', conference: 'AFC', division: 'West' },
  { id: 'LAC', name: 'Los Angeles Chargers', conference: 'AFC', division: 'West' },
  { id: 'DEN', name: 'Denver Broncos', conference: 'AFC', division: 'West' },
];

// Mock prior year standings
const mockPriorYearStandings = {
  'NE': 1, 'BUF': 2, 'MIA': 3, 'NYJ': 4,
  'KC': 1, 'LV': 2, 'LAC': 3, 'DEN': 4,
};

// Division rivalry validation logic (copied from the actual implementation)
function validateDivisionRivalryConstraint(matchups, teams) {
  const errors = [];
  const divisions = {};
  
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
              opponentTeam.conference === teams.find(t => t.id === teamId).conference &&
              opponentTeam.division === teams.find(t => t.id === teamId).division) {
            divisionGameCount++;
          }
        }
      }
      
      // Each team should have 6 division games (3 opponents × 2 games each)
      if (divisionGameCount !== 6) {
        errors.push(`Team ${teamId} has ${divisionGameCount} division games, expected 6`);
      }
    }
  }
  
  return { isValid: errors.length === 0, errors };
}

// Generate mock matchups that should satisfy division rivalry constraint
function generateValidDivisionMatchups(teams) {
  const matchups = [];
  const divisions = {};
  
  // Group teams by division
  for (const team of teams) {
    const divKey = `${team.conference}_${team.division}`;
    if (!divisions[divKey]) {
      divisions[divKey] = [];
    }
    divisions[divKey].push(team.id);
  }

  // Generate division games (each team plays division opponents twice)
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

  return matchups;
}

// Generate mock matchups that violate division rivalry constraint
function generateInvalidDivisionMatchups(teams) {
  const matchups = [];
  const divisions = {};
  
  // Group teams by division
  for (const team of teams) {
    const divKey = `${team.conference}_${team.division}`;
    if (!divisions[divKey]) {
      divisions[divKey] = [];
    }
    divisions[divKey].push(team.id);
  }

  // Generate only some division games (violating the constraint)
  for (const [divisionName, teamsInDiv] of Object.entries(divisions)) {
    for (let i = 0; i < teamsInDiv.length; i++) {
      for (let j = i + 1; j < teamsInDiv.length; j++) {
        const team1 = teamsInDiv[i];
        const team2 = teamsInDiv[j];
        
        // Only home games, missing away games
        matchups.push({ home: team1, away: team2 });
      }
    }
  }

  return matchups;
}

function testDivisionRivalryConstraint() {
  console.log('🧪 Testing Division Rivalry Constraint...');
  
  try {
    // Test 1: Valid division matchups
    console.log('\n📋 Test 1: Valid Division Matchups');
    const validMatchups = generateValidDivisionMatchups(mockTeams);
    const validValidation = validateDivisionRivalryConstraint(validMatchups, mockTeams);
    
    console.log(`Generated ${validMatchups.length} valid matchups`);
    console.log(`Validation: ${validValidation.isValid ? '✅ PASS' : '❌ FAIL'}`);
    
    if (validValidation.errors.length > 0) {
      console.log('Errors:', validValidation.errors);
    }

    // Test 2: Invalid division matchups
    console.log('\n📋 Test 2: Invalid Division Matchups');
    const invalidMatchups = generateInvalidDivisionMatchups(mockTeams);
    const invalidValidation = validateDivisionRivalryConstraint(invalidMatchups, mockTeams);
    
    console.log(`Generated ${invalidMatchups.length} invalid matchups`);
    console.log(`Validation: ${invalidValidation.isValid ? '❌ FAIL (should be invalid)' : '✅ PASS (correctly detected as invalid)'}`);
    
    if (invalidValidation.errors.length > 0) {
      console.log('Expected errors:', invalidValidation.errors);
    }

    // Test 3: Check specific division rivalry requirements
    console.log('\n🔍 Test 3: AFC East Division Rivalries');
    const afcEastTeams = mockTeams.filter(t => t.conference === 'AFC' && t.division === 'East');
    
    for (const team of afcEastTeams) {
      const teamMatchups = validMatchups.filter(m => m.home === team.id || m.away === team.id);
      const divisionMatchups = teamMatchups.filter(m => {
        const opponent = m.home === team.id ? m.away : m.home;
        const opponentTeam = mockTeams.find(t => t.id === opponent);
        return opponentTeam && opponentTeam.conference === 'AFC' && opponentTeam.division === 'East';
      });
      
      console.log(`  ${team.name}: ${divisionMatchups.length} division games`);
      
      // Check that each team plays exactly 6 division games (3 opponents × 2 games)
      if (divisionMatchups.length !== 6) {
        console.log(`    ❌ Expected 6 division games, got ${divisionMatchups.length}`);
      } else {
        console.log(`    ✅ Correct number of division games`);
      }
    }

    const allTestsPass = validValidation.isValid && !invalidValidation.isValid;
    console.log(`\n🎯 Overall Result: ${allTestsPass ? '✅ ALL TESTS PASS' : '❌ SOME TESTS FAIL'}`);
    
    return allTestsPass;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// Run the test
if (require.main === module) {
  const success = testDivisionRivalryConstraint();
  process.exit(success ? 0 : 1);
}

module.exports = { testDivisionRivalryConstraint }; 