// Test to identify which constraints cause problem size explosion
console.log('🔍 Analyzing Constraint Breakdown...\n');

// Mock GLPK for testing
const mockGLPK = {
  GLP_UP: 1,
  GLP_DB: 2,
  GLP_FX: 3,
  GLP_MAX: 2,
};

// Mock data
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

class ConstraintAnalyzer {
  constructor(matchups, teams, weeks = 18) {
    this.matchups = matchups;
    this.teams = teams;
    this.weeks = weeks;
  }

  analyzeConstraint1() {
    console.log('🔍 Analyzing Constraint 1: Each matchup must be scheduled exactly once');
    const constraints = [];
    const variables = [];
    
    for (let m = 0; m < this.matchups.length; m++) {
      const vars = [];
      for (let w = 1; w <= this.weeks; w++) {
        const varName = `x_${m}_${w}`;
        vars.push({ name: varName, coef: 1 });
        variables.push(varName);
      }
      constraints.push({
        name: `matchup_${m}`,
        vars,
        bnds: { type: mockGLPK.GLP_UP, lb: 0, ub: 1 }
      });
    }
    
    console.log(`  - Constraints: ${constraints.length}`);
    console.log(`  - Variables: ${variables.length}`);
    return { constraints, variables };
  }

  analyzeConstraint2() {
    console.log('🔍 Analyzing Constraint 2: Each team can play at most one game per week');
    const constraints = [];
    const variables = [];
    
    for (let t = 0; t < this.teams.length; t++) {
      for (let w = 1; w <= this.weeks; w++) {
        const vars = [];
        for (let m = 0; m < this.matchups.length; m++) {
          const matchup = this.matchups[m];
          if (matchup.home === this.teams[t].id || matchup.away === this.teams[t].id) {
            const varName = `x_${m}_${w}`;
            vars.push({ name: varName, coef: 1 });
            variables.push(varName);
          }
        }
        if (vars.length > 0) {
          constraints.push({
            name: `team_${t}_week_${w}`,
            vars,
            bnds: { type: mockGLPK.GLP_UP, lb: 0, ub: 1 }
          });
        }
      }
    }
    
    console.log(`  - Constraints: ${constraints.length}`);
    console.log(`  - Variables: ${variables.length}`);
    return { constraints, variables };
  }

  analyzeConstraint3() {
    console.log('🔍 Analyzing Constraint 3: Maximum games per week');
    const constraints = [];
    const variables = [];
    
    for (let w = 1; w <= this.weeks; w++) {
      const vars = [];
      for (let m = 0; m < this.matchups.length; m++) {
        const varName = `x_${m}_${w}`;
        vars.push({ name: varName, coef: 1 });
        variables.push(varName);
      }
      constraints.push({
        name: `max_games_week_${w}`,
        vars,
        bnds: { type: mockGLPK.GLP_UP, lb: 0, ub: 16 }
      });
    }
    
    console.log(`  - Constraints: ${constraints.length}`);
    console.log(`  - Variables: ${variables.length}`);
    return { constraints, variables };
  }

  analyzeConstraint4() {
    console.log('🔍 Analyzing Constraint 4: Each team must have exactly 17 games (relaxed)');
    const constraints = [];
    const variables = [];
    
    for (let t = 0; t < this.teams.length; t++) {
      const vars = [];
      for (let m = 0; m < this.matchups.length; m++) {
        const matchup = this.matchups[m];
        if (matchup.home === this.teams[t].id || matchup.away === this.teams[t].id) {
          for (let w = 1; w <= this.weeks; w++) {
            const varName = `x_${m}_${w}`;
            vars.push({ name: varName, coef: 1 });
            variables.push(varName);
          }
        }
      }
      if (vars.length > 0) {
        const minGames = Math.min(15, vars.length);
        constraints.push({
          name: `bye_${t}`,
          vars,
          bnds: { type: mockGLPK.GLP_DB, lb: minGames, ub: 17 }
        });
      }
    }
    
    console.log(`  - Constraints: ${constraints.length}`);
    console.log(`  - Variables: ${variables.length}`);
    return { constraints, variables };
  }

  analyzeConstraint5() {
    console.log('🔍 Analyzing Constraint 5: Prevent consecutive rematches');
    const constraints = [];
    const variables = [];
    
    for (let w = 1; w < this.weeks; w++) {
      for (let m1 = 0; m1 < this.matchups.length; m1++) {
        for (let m2 = 0; m2 < this.matchups.length; m2++) {
          if (m1 !== m2) {
            const matchup1 = this.matchups[m1];
            const matchup2 = this.matchups[m2];
            if ((matchup1.home === matchup2.home && matchup1.away === matchup2.away) ||
                (matchup1.home === matchup2.away && matchup1.away === matchup2.home)) {
              constraints.push({
                name: `no_consecutive_${m1}_${m2}_${w}`,
                vars: [
                  { name: `x_${m1}_${w}`, coef: 1 },
                  { name: `x_${m2}_${w + 1}`, coef: 1 }
                ],
                bnds: { type: mockGLPK.GLP_UP, lb: 0, ub: 1 }
              });
              variables.push(`x_${m1}_${w}`, `x_${m2}_${w + 1}`);
            }
          }
        }
      }
    }
    
    console.log(`  - Constraints: ${constraints.length}`);
    console.log(`  - Variables: ${variables.length}`);
    return { constraints, variables };
  }

  analyzeConstraint6() {
    console.log('🔍 Analyzing Constraint 6: Balanced weekly distribution');
    const constraints = [];
    const variables = [];
    
    const targetGamesPerWeek = Math.ceil(this.matchups.length / this.weeks);
    for (let w = 1; w <= this.weeks; w++) {
      const vars = [];
      for (let m = 0; m < this.matchups.length; m++) {
        const varName = `x_${m}_${w}`;
        vars.push({ name: varName, coef: 1 });
        variables.push(varName);
      }
      constraints.push({
        name: `min_games_week_${w}`,
        vars,
        bnds: { type: mockGLPK.GLP_DB, lb: Math.max(1, targetGamesPerWeek - 2), ub: targetGamesPerWeek + 2 }
      });
    }
    
    console.log(`  - Constraints: ${constraints.length}`);
    console.log(`  - Variables: ${variables.length}`);
    return { constraints, variables };
  }

  analyzeConstraint7() {
    console.log('🔍 Analyzing Constraint 7: Inter-conference games limit');
    const constraints = [];
    const variables = [];
    
    for (let w = 1; w <= this.weeks; w++) {
      const interConferenceVars = [];
      for (let m = 0; m < this.matchups.length; m++) {
        const matchup = this.matchups[m];
        const homeTeam = this.teams.find(t => t.id === matchup.home);
        const awayTeam = this.teams.find(t => t.id === matchup.away);
        if (homeTeam && awayTeam && homeTeam.conference !== awayTeam.conference) {
          const varName = `x_${m}_${w}`;
          interConferenceVars.push({ name: varName, coef: 1 });
          variables.push(varName);
        }
      }
      if (interConferenceVars.length > 0) {
        constraints.push({
          name: `max_inter_conf_week_${w}`,
          vars: interConferenceVars,
          bnds: { type: mockGLPK.GLP_UP, lb: 0, ub: 6 }
        });
      }
    }
    
    console.log(`  - Constraints: ${constraints.length}`);
    console.log(`  - Variables: ${variables.length}`);
    return { constraints, variables };
  }

  analyzeConstraint8() {
    console.log('🔍 Analyzing Constraint 8: Maximum 6 teams on bye per week');
    const constraints = [];
    const variables = [];
    
    for (let w = 1; w <= this.weeks; w++) {
      const teamsOnByeVars = [];
      for (let t = 0; t < this.teams.length; t++) {
        const teamId = this.teams[t].id;
        let teamPlaysThisWeek = false;
        for (let m = 0; m < this.matchups.length; m++) {
          const matchup = this.matchups[m];
          if (matchup.home === teamId || matchup.away === teamId) {
            teamPlaysThisWeek = true;
            break;
          }
        }
        if (!teamPlaysThisWeek) {
          const byeVarName = `bye_${t}_${w}`;
          variables.push(byeVarName);
          teamsOnByeVars.push({ name: byeVarName, coef: 1 });
        }
      }
      if (teamsOnByeVars.length > 0) {
        constraints.push({
          name: `max_bye_teams_week_${w}`,
          vars: teamsOnByeVars,
          bnds: { type: mockGLPK.GLP_UP, lb: 0, ub: 6 }
        });
      }
    }
    
    console.log(`  - Constraints: ${constraints.length}`);
    console.log(`  - Variables: ${variables.length}`);
    return { constraints, variables };
  }
}

async function analyzeConstraints() {
  const matchups = generateSimpleMatchups();
  
  console.log(`📊 Setup:`);
  console.log(`  - Teams: ${mockTeams.length}`);
  console.log(`  - Matchups: ${matchups.length}`);
  console.log(`  - Weeks: 18\n`);

  const analyzer = new ConstraintAnalyzer(matchups, mockTeams, 18);

  // Analyze each constraint individually
  const results = [];
  
  results.push({ name: 'Constraint 1', ...analyzer.analyzeConstraint1() });
  results.push({ name: 'Constraint 2', ...analyzer.analyzeConstraint2() });
  results.push({ name: 'Constraint 3', ...analyzer.analyzeConstraint3() });
  results.push({ name: 'Constraint 4', ...analyzer.analyzeConstraint4() });
  results.push({ name: 'Constraint 5', ...analyzer.analyzeConstraint5() });
  results.push({ name: 'Constraint 6', ...analyzer.analyzeConstraint6() });
  results.push({ name: 'Constraint 7', ...analyzer.analyzeConstraint7() });
  results.push({ name: 'Constraint 8', ...analyzer.analyzeConstraint8() });

  console.log('\n📋 Constraint Analysis Summary:');
  console.log('================================');
  
  let totalConstraints = 0;
  let totalVariables = 0;
  
  results.forEach((result, i) => {
    console.log(`${i + 1}. ${result.name}:`);
    console.log(`   - Constraints: ${result.constraints.length}`);
    console.log(`   - Variables: ${result.variables.length}`);
    totalConstraints += result.constraints.length;
    totalVariables += result.variables.length;
  });

  console.log('\n🎯 Totals:');
  console.log(`  - Total Constraints: ${totalConstraints}`);
  console.log(`  - Total Variables: ${totalVariables}`);

  // Identify problematic constraints
  console.log('\n🔍 Problematic Constraints:');
  results.forEach((result, i) => {
    if (result.constraints.length > 500) {
      console.log(`  ❌ ${result.name}: ${result.constraints.length} constraints (TOO MANY!)`);
    } else if (result.constraints.length > 100) {
      console.log(`  ⚠️ ${result.name}: ${result.constraints.length} constraints (High)`);
    }
  });

  // Recommendations
  console.log('\n💡 Recommendations:');
  const highConstraintCounts = results.filter(r => r.constraints.length > 100);
  if (highConstraintCounts.length > 0) {
    console.log('  - Consider removing or simplifying these constraints:');
    highConstraintCounts.forEach(r => {
      console.log(`    * ${r.name} (${r.constraints.length} constraints)`);
    });
  }
  
  console.log('  - Consider reducing the number of matchups');
  console.log('  - Consider reducing the number of weeks');
  console.log('  - Consider using a simpler constraint formulation');
}

analyzeConstraints().catch(console.error); 