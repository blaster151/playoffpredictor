# NFL Schedule Constraint Summary

## 🔧 Constraints Applied in the GLPK Solver

### 1. **Matchup Scheduling Constraint**
- **Type**: Equality constraint (GLP_FX)
- **Rule**: Each matchup must be scheduled exactly once
- **Implementation**: For each matchup m: Σ(x[m,w] for all weeks w) = 1
- **Purpose**: Ensures all games are played and no game is scheduled multiple times

### 2. **Team Weekly Constraint**
- **Type**: Upper bound constraint (GLP_UP)
- **Rule**: Each team can play at most one game per week
- **Implementation**: For each team t and week w: Σ(x[m,w] for all matchups m involving team t) ≤ 1
- **Purpose**: Prevents double-booking teams in the same week

### 3. **Team Season Game Count**
- **Type**: Equality constraint (GLP_FX)
- **Rule**: Each team must play exactly 17 games (one bye week in 18-week season)
- **Implementation**: For each team t: Σ(x[m,w] for all matchups m involving team t, all weeks w) = 17
- **Purpose**: NFL requirement for regular season structure

### 4. **Consecutive Game Prevention**
- **Type**: Upper bound constraint (GLP_UP)
- **Rule**: Same teams cannot play each other in consecutive weeks
- **Implementation**: For matchups m1, m2 with same teams and consecutive weeks w, w+1: x[m1,w] + x[m2,w+1] ≤ 1
- **Purpose**: Prevents immediate rematches which are unfair and uninteresting

### 5. **Inter-Conference Game Distribution**
- **Type**: Upper bound constraint (GLP_UP)
- **Rule**: Maximum 6 inter-conference games per week
- **Implementation**: For each week w: Σ(x[m,w] for all inter-conference matchups m) ≤ 6
- **Purpose**: Ensures balanced conference representation throughout the season

### 6. **Bye Week Constraints**
- **Type**: Mixed (equality and lower bound)
- **Rules**:
  - No bye weeks in weeks 1-3 or 15-18 (all teams must play)
  - Bye weeks allowed only in weeks 4-14
  - Maximum 6 teams on bye per week
- **Implementation**:
  - Weeks 1-3, 15-18: Exactly 16 games (32 teams / 2)
  - Weeks 4-14: At least 13 games (26 teams playing minimum)
- **Purpose**: NFL rules for bye week distribution

## 📋 Constraints Applied Outside the Solver

### In Schedule Generation (`scheduleGenerator.ts`)

1. **Division Games**
   - Each team plays every division rival twice (home and away)
   - Total: 6 games per team (3 rivals × 2 games)
   - Enforced during matchup generation

2. **Intra-Conference Games**
   - Each team plays 4 teams from one other division in their conference
   - Rotation pattern determines which divisions play each other
   - Total: 4 games per team

3. **Inter-Conference Games**
   - Each team plays 4 teams from one division in the other conference
   - Rotation pattern determines which divisions play each other
   - Total: 4 games per team

4. **Same-Place Finisher Games**
   - Each team plays 2 teams that finished in same position in other divisions within conference
   - Based on prior year standings
   - Total: 2 games per team

5. **17th Game**
   - Extra inter-conference game against same-place finisher
   - From specific division based on rotation
   - Total: 1 game per team

### Validation Constraints (`validateMatchups` function)

1. **Total Game Count**
   - Each team must have exactly 17 games
   - Total matchups must equal 272 (32 teams × 17 games ÷ 2)

2. **Division Rivalry Verification**
   - Each team must have exactly 6 division games
   - Checked after schedule generation

3. **Duplicate Prevention**
   - No duplicate matchups allowed
   - Each home-away pair must be unique

## 🎯 Objective Function

The solver uses a **minimization** objective with smart coefficients:
- Weeks 6-12: Coefficient 0.9 (preferred)
- Weeks 4-5, 13-15: Coefficient 1.0 (neutral)
- Weeks 1-3, 16-18: Coefficient 1.1 (discouraged)

This guides the solver to:
- Place more games in middle weeks for flexibility
- Avoid overloading early/late season weeks
- Create more balanced schedules

## ⚙️ Configurable Parameters

The `ScheduleConstraints` interface allows these optional constraints:
- `maxConsecutiveAway`: Maximum consecutive away games (default: 3)
- `maxConsecutiveHome`: Maximum consecutive home games (default: 3)
- `maxGamesPerWeek`: Maximum games per week (default: 16)
- `byeWeekDistribution`: Strategy for bye weeks ('balanced', 'early', 'late')

**Note**: The consecutive home/away constraints are defined in the interface but not currently implemented in the solver to avoid over-constraining the problem.

## 📊 Problem Size

For a full NFL schedule:
- **Variables**: 272 matchups × 18 weeks = 4,896 binary variables
- **Constraints**: ~1,000-1,500 depending on configuration
- **Typical solve time**: 50-100ms with proper constraints

## 🔍 Key Insights

1. **Matchup Generation is Critical**: The schedule generator must create exactly 272 valid matchups following NFL rules before the constraint solver runs.

2. **Constraint Balance**: Too many constraints make the problem infeasible; too few produce poor schedules.

3. **Status Code 5**: GLPK often returns status 5 (undefined) but still provides valid solutions - the solver now accepts these.

4. **Bye Week Complexity**: The bye week constraints are the most complex, requiring careful balance between flexibility and NFL requirements.