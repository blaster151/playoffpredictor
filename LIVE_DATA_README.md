# Live NFL Data Integration

This document explains how the NFL Playoff Predictor now integrates with live NFL data sources to provide up-to-date team and roster information for the 2025 season.

## 🚀 Features

### Real-time Data Sources
- **ESPN API**: Primary source for teams, schedules, and game data
- **Automatic Caching**: 5-minute cache to reduce API calls
- **Fallback Data**: Static data when live sources are unavailable
- **Auto-refresh**: Data updates every 5 minutes automatically

### Data Types Available
- **Teams**: All 32 NFL teams with current rosters
- **Schedule**: Complete 2025 season schedule
- **Game Results**: Live scores and game status
- **Team Stats**: Current season statistics
- **Player Rosters**: Detailed player information

## 📡 API Endpoints

### Teams
```
GET /api/nfl-data?type=teams
```
Returns all NFL teams with current information.

### Schedule
```
GET /api/nfl-data?type=schedule&year=2025
```
Returns the complete schedule for the specified year.

### Team Roster
```
GET /api/nfl-data?type=roster&teamId={teamId}
```
Returns detailed roster information for a specific team.

### Team Stats
```
GET /api/nfl-data?type=stats&teamId={teamId}
```
Returns current season statistics for a specific team.

### Refresh Cache
```
GET /api/nfl-data?type=refresh
```
Manually refreshes the data cache.

## 🔧 Implementation

### Data Fetcher Class
The `NFLDataFetcher` class handles all external API calls with:
- Singleton pattern for efficient resource usage
- Automatic caching with configurable expiration
- Error handling with fallback to static data
- Rate limiting to respect API limits

### React Hooks
Custom hooks provide easy integration:

```typescript
// Main data hook
const { teams, games, loading, error, refreshData } = useNFLData({
  autoRefresh: true,
  refreshInterval: 300000 // 5 minutes
});

// Team-specific hooks
const { roster, loading, error } = useTeamRoster(teamId);
const { stats, loading, error } = useTeamStats(teamId);
```

### Error Handling
- Network errors fall back to static data
- API rate limits are respected
- User-friendly error messages
- Graceful degradation

## 🧪 Testing

### Manual Testing
1. Start the development server: `npm run dev`
2. Open the app in your browser
3. Check the console for data loading status
4. Use the "Update" button to manually refresh data

### Automated Testing
Run the test script to verify API connectivity:
```bash
node scripts/test-data-fetch.js
```

### API Response Examples

#### Teams Response
```json
{
  "teams": [
    {
      "id": "1",
      "name": "Baltimore Ravens",
      "abbreviation": "BAL",
      "conference": "AFC",
      "division": "North",
      "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/bal.png"
    }
  ]
}
```

#### Schedule Response
```json
{
  "schedule": [
    {
      "id": "401547456",
      "week": 1,
      "awayTeam": "1",
      "homeTeam": "2",
      "awayScore": 24,
      "homeScore": 21,
      "day": "Sun",
      "date": "2025-09-07",
      "isPlayed": true
    }
  ]
}
```

## 🔄 Data Flow

1. **Initial Load**: App starts with static fallback data
2. **API Call**: Background fetch to ESPN API
3. **Cache Check**: Check if cached data is still valid
4. **Data Update**: Update UI with live data if available
5. **Auto-refresh**: Repeat every 5 minutes
6. **Error Handling**: Fall back to static data if API fails

## 🛠 Configuration

### Cache Duration
Modify the cache duration in `nflDataFetcher.ts`:
```typescript
private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
```

### Auto-refresh Interval
Configure in the hook:
```typescript
const { teams, games } = useNFLData({
  autoRefresh: true,
  refreshInterval: 300000 // 5 minutes
});
```

### API Endpoints
Update base URLs in `nflDataFetcher.ts`:
```typescript
const ESPN_API_BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';
```

## 🚨 Rate Limiting

The ESPN API has rate limits. The implementation includes:
- 5-minute caching to reduce API calls
- Error handling for rate limit responses
- Fallback to static data when limits are hit

## 🔮 Future Enhancements

- [ ] Multiple data sources (NFL.com, Pro Football Reference)
- [ ] Historical data integration
- [ ] Player injury status
- [ ] Weather data for games
- [ ] Advanced statistics and analytics
- [ ] Real-time game updates
- [ ] Push notifications for score changes

## 📊 Data Sources

### Primary Sources
- **ESPN API**: Teams, schedules, scores
- **NFL.com**: Official team data
- **Pro Football Reference**: Historical statistics

### Fallback Data
- Static JSON files in `src/data/`
- Updated manually when needed
- Ensures app functionality even without internet

## 🔍 Monitoring

### Console Logs
Check browser console for:
- Data loading status
- API errors
- Cache hits/misses
- Fallback usage

### Network Tab
Monitor API calls in browser dev tools:
- Request/response times
- Error status codes
- Data payload sizes

## 🐛 Troubleshooting

### Common Issues

1. **No live data loading**
   - Check internet connection
   - Verify ESPN API is accessible
   - Check browser console for errors

2. **API rate limiting**
   - Wait 5 minutes for cache to expire
   - Use manual refresh button
   - Check fallback data is working

3. **CORS errors**
   - Ensure running on localhost
   - Check API endpoint URLs
   - Verify request headers

### Debug Mode
Enable debug logging by modifying the fetcher:
```typescript
console.log('API Response:', data);
```

## 📝 Notes

- The 2025 season data may not be fully available until closer to the season
- Some APIs may require authentication for production use
- Consider implementing a backend proxy for production to avoid CORS issues
- Monitor API usage to stay within rate limits 