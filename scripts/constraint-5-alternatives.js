// Test different approaches for Constraint 5 (consecutive rematches)
console.log('🔍 Analyzing Constraint 5 Alternatives...\n');

const mockTeams = [
  { id: 'BAL', name: 'Baltimore Ravens', conference: 'AFC', division: 'North' },
  { id: 'CIN', name: 'Cincinnati Bengals', conference: 'AFC', division: 'North' },
  { id: 'CLE', name: 'Cleveland Browns', conference: 'AFC', division: 'North' },
  { id: 'PIT', name: 'Pittsburgh Steelers', conference: 'AFC', division: 'North' },
  { id: 'HOU', name: 'Houston Texans', conference: 'AFC', division: 'South' },
  { id: 'IND', name: 'Indianapolis Colts', conference: 'AFC', division: 'South' },
  { id: 'JAX', name: 'Jacksonville Jaguars', conference: 'AFC', division: 'South' },
  { id: 'TEN', name: 'Tennessee Titans', conference: 'AFC', division: 'South' },
  { id: 'BUF', name: 'Buffalo Bills', conference: 'AFC', division: 'East' },
  { id: 'MIA', name: 'Miami Dolphins', conference: 'AFC', division: 'East' },
  { id: 'NE', name: 'New England Patriots', conference: 'AFC', division: 'East' },
  { id: 'NYJ', name: 'New York Jets', conference: 'AFC', division: 'East' },
  { id: 'DEN', name: 'Denver Broncos', conference: 'AFC', division: 'West' },
  { id: 'KC', name: 'Kansas City Chiefs', conference: 'AFC', division: 'West' },
  { id: 'LV', name: 'Las Vegas Raiders', conference: 'AFC', division: 'West' },
  { id: 'LAC', name: 'Los Angeles Chargers', conference: 'AFC', division: 'West' },
  { id: 'CHI', name: 'Chicago Bears', conference: 'NFC', division: 'North' },
  { id: 'DET', name: 'Detroit Lions', conference: 'NFC', division: 'North' },
  { id: 'GB', name: 'Green Bay Packers', conference: 'NFC', division: 'North' },
  { id: 'MIN', name: 'Minnesota Vikings', conference: 'NFC', division: 'North' },
  { id: 'ATL', name: 'Atlanta Falcons', conference: 'NFC', division: 'South' },
  { id: 'CAR', name: 'Carolina Panthers', conference: 'NFC', division: 'South' },
  { id: 'NO', name: 'New Orleans Saints', conference: 'NFC', division: 'South' },
  { id: 'TB', name: 'Tampa Bay Buccaneers', conference: 'NFC', division: 'South' },
  { id: 'DAL', name: 'Dallas Cowboys', conference: 'NFC', division: 'East' },
  { id: 'NYG', name: 'New York Giants', conference: 'NFC', division: 'East' },
  { id: 'PHI', name: 'Philadelphia Eagles', conference: 'NFC', division: 'East' },
  { id: 'WAS', name: 'Washington Commanders', conference: 'NFC', division: 'East' },
  { id: 'ARI', name: 'Arizona Cardinals', conference: 'NFC', division: 'West' },
  { id: 'LAR', name: 'Los Angeles Rams', conference: 'NFC', division: 'West' },
  { id: 'SF', name: 'San Francisco 49ers', conference: 'NFC', division: 'West' },
  { id: 'SEA', name: 'Seattle Seahawks', conference: 'NFC', division: 'West' }
];

function generateSimpleMatchups() {
  const matchups = [];
  
  // Division games
  const divisions = {
    'AFC_North': ['BAL', 'CIN', 'CLE', 'PIT'],
    'AFC_South': ['HOU', 'IND', 'JAX', 'TEN'],
    'AFC_East': ['BUF', 'MIA', 'NE', 'NYJ'],
    'AFC_West': ['DEN', 'KC', 'LV', 'LAC'],
    'NFC_North': ['CHI', 'DET', 'GB', 'MIN'],
    'NFC_South': ['ATL', 'CAR', 'NO', 'TB'],
    'NFC_East': ['DAL', 'NYG', 'PHI', 'WAS'],
    'NFC_West': ['ARI', 'LAR', 'SF', 'SEA']
  };
  
  Object.values(divisions).forEach(divisionTeams => {
    for (let i = 0; i < divisionTeams.length; i++) {
      for (let j = i + 1; j < divisionTeams.length; j++) {
        matchups.push({ home: divisionTeams[i], away: divisionTeams[j] });
        matchups.push({ home: divisionTeams[j], away: divisionTeams[i] });
      }
    }
  });
  
  // Inter-conference games
  const afcTeams = mockTeams.filter(t => t.conference === 'AFC').map(t => t.id);
  const nfcTeams = mockTeams.filter(t => t.conference === 'NFC').map(t => t.id);
  
  for (let i = 0; i < afcTeams.length; i++) {
    for (let j = 0; j < 5; j++) {
      const nfcIndex = (i + j) % nfcTeams.length;
      matchups.push({ home: afcTeams[i], away: nfcTeams[nfcIndex] });
    }
  }
  
  return matchups;
}

// Approach 1: Current approach (expensive)
function approach1_Current(matchups, weeks) {
  console.log('🔍 Approach 1: Current (Expensive)');
  const constraints = [];
  
  for (let w = 1; w < weeks; w++) {
    for (let m1 = 0; m1 < matchups.length; m1++) {
      for (let m2 = 0; m2 < matchups.length; m2++) {
        if (m1 !== m2) {
          const matchup1 = matchups[m1];
          const matchup2 = matchups[m2];
          
          if ((matchup1.home === matchup2.home && matchup1.away === matchup2.away) ||
              (matchup1.home === matchup2.away && matchup1.away === matchup2.home)) {
            constraints.push({
              name: `no_consecutive_${m1}_${m2}_${w}`,
              vars: [
                { name: `x_${m1}_${w}`, coef: 1 },
                { name: `x_${m2}_${w + 1}`, coef: 1 }
              ],
              bnds: { type: 1, lb: 0, ub: 1 }
            });
          }
        }
      }
    }
  }
  
  console.log(`  - Constraints: ${constraints.length}`);
  console.log(`  - Formula: (weeks-1) × matchups × matchups = ${weeks-1} × ${matchups.length} × ${matchups.length} = ${(weeks-1) * matchups.length * matchups.length}`);
  return constraints;
}

// Approach 2: Remove entirely (simplest)
function approach2_Remove() {
  console.log('🔍 Approach 2: Remove Constraint (Simplest)');
  console.log('  - Constraints: 0');
  console.log('  - Pros: Massive reduction in problem size');
  console.log('  - Cons: May get consecutive rematches');
  console.log('  - Impact: Reduces problem by 66%');
  return [];
}

// Approach 3: Penalty in objective function
function approach3_Penalty(matchups, weeks) {
  console.log('🔍 Approach 3: Penalty in Objective Function');
  
  // Create penalty variables for consecutive rematches
  const penaltyVars = [];
  const penaltyConstraints = [];
  
  for (let w = 1; w < weeks; w++) {
    for (let m1 = 0; m1 < matchups.length; m1++) {
      for (let m2 = 0; m2 < matchups.length; m2++) {
        if (m1 !== m2) {
          const matchup1 = matchups[m1];
          const matchup2 = matchups[m2];
          
          if ((matchup1.home === matchup2.home && matchup1.away === matchup2.away) ||
              (matchup1.home === matchup2.away && matchup1.away === matchup2.home)) {
            
            const penaltyVar = `penalty_${m1}_${m2}_${w}`;
            penaltyVars.push(penaltyVar);
            
            // Constraint: penalty >= x_m1_w + x_m2_w+1 - 1
            penaltyConstraints.push({
              name: `penalty_${m1}_${m2}_${w}`,
              vars: [
                { name: penaltyVar, coef: 1 },
                { name: `x_${m1}_${w}`, coef: -1 },
                { name: `x_${m2}_${w + 1}`, coef: -1 }
              ],
              bnds: { type: 1, lb: -1, ub: 0 }
            });
          }
        }
      }
    }
  }
  
  console.log(`  - Penalty Variables: ${penaltyVars.length}`);
  console.log(`  - Penalty Constraints: ${penaltyConstraints.length}`);
  console.log(`  - Still expensive, but moves complexity to objective function`);
  return penaltyConstraints;
}

// Approach 4: Smart filtering (only check actual rematches)
function approach4_SmartFilter(matchups, weeks) {
  console.log('🔍 Approach 4: Smart Filtering (Only Actual Rematches)');
  
  // First, identify which matchups are actually rematches
  const rematchPairs = [];
  for (let m1 = 0; m1 < matchups.length; m1++) {
    for (let m2 = m1 + 1; m2 < matchups.length; m2++) {
      const matchup1 = matchups[m1];
      const matchup2 = matchups[m2];
      
      if ((matchup1.home === matchup2.home && matchup1.away === matchup2.away) ||
          (matchup1.home === matchup2.away && matchup1.away === matchup2.home)) {
        rematchPairs.push([m1, m2]);
      }
    }
  }
  
  console.log(`  - Total matchups: ${matchups.length}`);
  console.log(`  - Actual rematch pairs: ${rematchPairs.length}`);
  
  // Now create constraints only for actual rematches
  const constraints = [];
  for (let w = 1; w < weeks; w++) {
    for (const [m1, m2] of rematchPairs) {
      constraints.push({
        name: `no_consecutive_${m1}_${m2}_${w}`,
        vars: [
          { name: `x_${m1}_${w}`, coef: 1 },
          { name: `x_${m2}_${w + 1}`, coef: 1 }
        ],
        bnds: { type: 1, lb: 0, ub: 1 }
      });
    }
  }
  
  console.log(`  - Constraints: ${constraints.length}`);
  console.log(`  - Formula: (weeks-1) × rematch_pairs = ${weeks-1} × ${rematchPairs.length} = ${(weeks-1) * rematchPairs.length}`);
  return constraints;
}

// Approach 5: Team-based constraints (most efficient)
function approach5_TeamBased(matchups, teams, weeks) {
  console.log('🔍 Approach 5: Team-Based Constraints (Most Efficient)');
  
  // For each team, prevent it from playing in consecutive weeks
  const constraints = [];
  
  for (let t = 0; t < teams.length; t++) {
    for (let w = 1; w < weeks; w++) {
      const teamId = teams[t].id;
      
      // Find all matchups involving this team
      const teamMatchups = [];
      for (let m = 0; m < matchups.length; m++) {
        const matchup = matchups[m];
        if (matchup.home === teamId || matchup.away === teamId) {
          teamMatchups.push(m);
        }
      }
      
      // Create constraint: team can't play in consecutive weeks
      if (teamMatchups.length > 0) {
        const week1Vars = teamMatchups.map(m => ({ name: `x_${m}_${w}`, coef: 1 }));
        const week2Vars = teamMatchups.map(m => ({ name: `x_${m}_${w + 1}`, coef: 1 }));
        
        // Constraint: sum of week w games + sum of week w+1 games <= 1
        constraints.push({
          name: `team_${t}_no_consecutive_${w}`,
          vars: [...week1Vars, ...week2Vars],
          bnds: { type: 1, lb: 0, ub: 1 }
        });
      }
    }
  }
  
  console.log(`  - Constraints: ${constraints.length}`);
  console.log(`  - Formula: teams × (weeks-1) = ${teams.length} × ${weeks-1} = ${teams.length * (weeks-1)}`);
  console.log(`  - Much more efficient!`);
  return constraints;
}

// Approach 6: Hybrid approach (best of both worlds)
function approach6_Hybrid(matchups, teams, weeks) {
  console.log('🔍 Approach 6: Hybrid Approach (Best of Both Worlds)');
  
  // Use team-based constraints for most cases
  const teamConstraints = approach5_TeamBased(matchups, teams, weeks);
  
  // Add a few critical rematch constraints for important rivalries
  const criticalRematches = [];
  
  // Example: Add constraints for division rivalries only
  const divisions = {
    'AFC_North': ['BAL', 'CIN', 'CLE', 'PIT'],
    'AFC_South': ['HOU', 'IND', 'JAX', 'TEN'],
    'AFC_East': ['BUF', 'MIA', 'NE', 'NYJ'],
    'AFC_West': ['DEN', 'KC', 'LV', 'LAC'],
    'NFC_North': ['CHI', 'DET', 'GB', 'MIN'],
    'NFC_South': ['ATL', 'CAR', 'NO', 'TB'],
    'NFC_East': ['DAL', 'NYG', 'PHI', 'WAS'],
    'NFC_West': ['ARI', 'LAR', 'SF', 'SEA']
  };
  
  // Find division rematches
  Object.values(divisions).forEach(divisionTeams => {
    for (let i = 0; i < divisionTeams.length; i++) {
      for (let j = i + 1; j < divisionTeams.length; j++) {
        const team1 = divisionTeams[i];
        const team2 = divisionTeams[j];
        
        // Find matchups between these teams
        for (let m1 = 0; m1 < matchups.length; m1++) {
          for (let m2 = 0; m2 < matchups.length; m2++) {
            if (m1 !== m2) {
              const matchup1 = matchups[m1];
              const matchup2 = matchups[m2];
              
              if ((matchup1.home === team1 && matchup1.away === team2 && 
                   matchup2.home === team1 && matchup2.away === team2) ||
                  (matchup1.home === team2 && matchup1.away === team1 && 
                   matchup2.home === team2 && matchup2.away === team1)) {
                
                for (let w = 1; w < weeks; w++) {
                  criticalRematches.push({
                    name: `critical_rematch_${m1}_${m2}_${w}`,
                    vars: [
                      { name: `x_${m1}_${w}`, coef: 1 },
                      { name: `x_${m2}_${w + 1}`, coef: 1 }
                    ],
                    bnds: { type: 1, lb: 0, ub: 1 }
                  });
                }
              }
            }
          }
        }
      }
    }
  });
  
  const totalConstraints = teamConstraints.length + criticalRematches.length;
  
  console.log(`  - Team-based constraints: ${teamConstraints.length}`);
  console.log(`  - Critical rematch constraints: ${criticalRematches.length}`);
  console.log(`  - Total constraints: ${totalConstraints}`);
  console.log(`  - Much better than original ${(weeks-1) * matchups.length * matchups.length}!`);
  
  return [...teamConstraints, ...criticalRematches];
}

// Run the analysis
async function analyzeAlternatives() {
  const matchups = generateSimpleMatchups();
  const weeks = 18;
  
  console.log(`📊 Setup:`);
  console.log(`  - Teams: ${mockTeams.length}`);
  console.log(`  - Matchups: ${matchups.length}`);
  console.log(`  - Weeks: 18\n`);

  console.log('🎯 Constraint 5 Alternatives Analysis:\n');
  
  approach1_Current(matchups, weeks);
  console.log('');
  
  approach2_Remove();
  console.log('');
  
  approach3_Penalty(matchups, weeks);
  console.log('');
  
  approach4_SmartFilter(matchups, weeks);
  console.log('');
  
  approach5_TeamBased(matchups, mockTeams, weeks);
  console.log('');
  
  approach6_Hybrid(matchups, mockTeams, weeks);
  console.log('');

  console.log('💡 Recommendations:');
  console.log('  1. Start with Approach 2 (remove constraint) for immediate fix');
  console.log('  2. Implement Approach 5 (team-based) for better solution');
  console.log('  3. Consider Approach 6 (hybrid) for best balance');
  console.log('  4. Avoid Approach 1 (current) and Approach 3 (penalty)');
}

analyzeAlternatives().catch(console.error); 