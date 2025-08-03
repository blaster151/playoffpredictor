# NFL Playoff Predictor Demo

## How to Use the Application

### 1. Week Navigation
- Use the "Previous" and "Next" buttons to navigate between weeks
- The current week is displayed prominently with dates
- Click "Update" to refresh the simulation

### 2. Game Predictions
- In the center column, you'll see games grouped by:
  - **AFC**: Games between AFC teams only
  - **A vs N**: Interconference games (AFC vs NFC)
  - **NFC**: Games between NFC teams only

### 3. Making Predictions
- Each game shows:
  - Away team logo and score input
  - "TIE" option with score input
  - Home team logo and score input
  - Day of the week the game is played

- To predict a game outcome:
  1. Enter scores for both teams (default is 10-10)
  2. The higher score wins
  3. Equal scores result in a tie
  4. Changes update standings in real-time

### 4. Viewing Standings
- **Left Panel**: AFC standings
- **Right Panel**: NFC standings
- Toggle between "Conference" and "Division" views
- Standings show:
  - Team records (W-L-T)
  - Division records
  - Playoff seeds (in conference view)
  - Playoff status (in/bubble/out)

### 5. Saving Predictions
- Click "Submit Week to Pool" to save your predictions
- Click "View Pools" to see saved scenarios
- This allows you to compare different "what-if" scenarios

### 6. Real-time Updates
- As you change game scores, standings update immediately
- Playoff seeds and status change based on your predictions
- You can see how each game affects the playoff picture

## Example Scenario

1. **Start with Week 1**: All teams are 0-0
2. **Predict some upsets**: 
   - Give the underdog team a higher score
   - See how it affects division standings
3. **Check playoff implications**:
   - Switch to "Conference" view
   - See which teams now have playoff seeds
4. **Try different scenarios**:
   - Save one prediction
   - Make different predictions
   - Compare the outcomes

## Key Features Demonstrated

- **Interactive Simulation**: Change any game outcome
- **Real-time Updates**: Standings update as you type
- **Exploring Scenarios**: Save and compare different predictions
- **Tiebreaking Procedures**: Proper NFL rules for tied records
- **Data-Driven**: Uses actual NFL team data and structure

## Technical Notes

- Built with Next.js and TypeScript
- Responsive design with Tailwind CSS
- Real-time calculations using React hooks
- Extensible for additional weeks and features 