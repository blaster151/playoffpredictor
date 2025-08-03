# NFL Playoff Predictor

An interactive web application that allows users to manipulate NFL game outcomes to project the playoff picture in real-time.

## Features

### Interactive Simulation
- Present the NFL regular season schedule week by week
- Users can select winners or predict ties for each game
- Real-time updates as users make selections

### Real-time Updates
- Dynamic playoff picture updates as game outcomes are selected
- Live team standings, division races, and playoff seeding
- Instant feedback on how predictions affect the playoff landscape

### Exploring Scenarios
- Experiment with various "what-if" scenarios
- See how specific team chances are impacted by crucial games
- Analyze how unexpected upsets might alter the playoff landscape

### Tiebreaking Procedures
- Incorporates NFL tiebreaking rules
- Accurately determines standings and playoff berths
- Handles identical records with proper NFL procedures

### Data-Driven Projections
- Built using various data points and algorithms
- Provides projections and odds for future games
- Considers factors like:
  - Team strength (point differential, strength of schedule)
  - Recent performance
  - Player injuries
  - Home-field advantage
  - Quarterback performance
  - Matchup analysis

### Saving and Sharing
- Save predictions and game results
- Revisit and refine predictions later
- Share scenarios with other users

## Technology Stack

- **Frontend**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React hooks
- **Data**: Static NFL data (expandable to API)

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd playoffpredictor
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/          # React components
│   ├── NavigationBar.tsx
│   ├── WeekNavigation.tsx
│   ├── StandingsPanel.tsx
│   └── GamePredictions.tsx
├── data/               # NFL data and utilities
│   └── nflData.ts
├── pages/              # Next.js pages
│   ├── _app.tsx
│   ├── _document.tsx
│   └── index.tsx
├── styles/             # Global styles
│   └── globals.css
├── types/              # TypeScript type definitions
│   └── nfl.ts
└── utils/              # Utility functions
    └── standingsCalculator.ts
```

## Data Structure

### Teams
Each team has:
- ID, name, abbreviation
- Conference (AFC/NFC)
- Division (North/South/East/West)
- Logo URL

### Games
Each game includes:
- Week number
- Away and home teams
- Scores (optional)
- Date and day
- Played status

### Standings
Calculated from games and includes:
- Win/loss/tie records
- Division and conference records
- Point differentials
- Playoff status and seeding

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Future Enhancements

- [ ] Add more weeks to the season
- [ ] Implement user authentication
- [ ] Add team logos and images
- [ ] Create mobile-responsive design
- [ ] Add playoff bracket visualization
- [ ] Implement real-time collaboration
- [ ] Add historical data integration
- [ ] Create API for live NFL data 