# NFL Data Pull System

A one-time data pull system that fetches NFL data from ESPN APIs and saves it to local JSON files for faster loading and offline use.

## 🚀 Quick Start

### Pull Basic Data (Teams & Schedules)
```bash
npm run pull-data
```

### Pull Full Data (Including Rosters & Stats)
```bash
npm run pull-data-full
```

## 📁 Generated Files

After running the data pull, files will be saved to `src/data/generated/`:

### Core Data
- `teams.json` - All 32 NFL teams with current information
- `schedule-2024.json` - Complete 2024 season schedule
- `schedule-2025.json` - Complete 2025 season schedule

### Optional Data (with --include-rosters)
- `roster-{teamId}.json` - Player roster for each team
- `stats-{teamId}.json` - Current season statistics for each team

## 🔧 How It Works

### 1. Data Pull Process
The script fetches data from ESPN APIs with:
- **Retry logic** with exponential backoff
- **Rate limiting** to respect API limits
- **Error handling** for network issues
- **Graceful fallbacks** when APIs are unavailable

### 2. Local Storage
- Data is saved as JSON files in `src/data/generated/`
- Files are optimized for fast loading
- Includes metadata like last updated timestamps

### 3. Smart Loading
The app automatically:
- **Tries local data first** for instant loading
- **Falls back to API** if local data is missing
- **Uses static data** as final fallback
- **Shows data source** to users

## 📊 Data Sources

### Primary: ESPN API
- **Teams**: Current team information, logos, colors
- **Schedules**: Complete season schedules with scores
- **Rosters**: Player information and statistics
- **Stats**: Team and player performance data

### Fallback: Static Data
- Built-in team and schedule data
- Ensures app works even without internet
- Updated manually when needed

## 🎯 Benefits

### Performance
- **Instant loading** from local files
- **No API delays** during app usage
- **Reduced server load** on ESPN APIs

### Reliability
- **Works offline** once data is pulled
- **No API rate limiting** during app use
- **Consistent data** across sessions

### User Experience
- **Faster app startup**
- **No loading spinners** for data
- **Consistent performance**

## 🔄 Data Freshness

### When to Pull New Data
- **Before each season** for updated schedules
- **After major trades** for roster updates
- **Weekly during season** for current stats
- **When APIs change** for new data formats

### Checking Data Age
The app shows data freshness in the UI:
- Local data with timestamp
- Fallback data indicator
- Data source information

## 🛠 Advanced Usage

### Custom Data Pull
```bash
# Pull specific year only
node scripts/pull-nfl-data.js --year 2025

# Pull with custom output directory
node scripts/pull-nfl-data.js --output ./custom-data

# Pull with verbose logging
node scripts/pull-nfl-data.js --verbose
```

### Manual File Management
```bash
# Check what data is available
ls src/data/generated/

# Remove old data
rm src/data/generated/schedule-2024.json

# Backup data
cp -r src/data/generated/ ./backup/
```

## 🔍 Monitoring

### Console Output
The script provides detailed feedback:
```
🚀 Starting NFL data pull...

📋 Pulling teams data...
✅ Saved teams.json
📊 Found 32 teams

📅 Pulling 2025 schedule...
✅ Saved schedule-2025.json
📅 Found 272 games for 2025

🎉 NFL data pull complete!
```

### Error Handling
- Network timeouts are retried
- API errors are logged with details
- Partial data is saved when possible
- Clear error messages for troubleshooting

## 🚨 Rate Limiting

### ESPN API Limits
- **Teams**: ~1 request per minute
- **Schedules**: ~1 request per minute
- **Rosters**: ~1 request per 30 seconds
- **Stats**: ~1 request per 30 seconds

### Best Practices
- Run data pull during off-peak hours
- Use `--include-rosters` sparingly
- Respect API terms of service
- Cache data locally when possible

## 🔮 Future Enhancements

- [ ] **Automated scheduling** - Pull data weekly/monthly
- [ ] **Incremental updates** - Only pull changed data
- [ ] **Multiple sources** - NFL.com, Pro Football Reference
- [ ] **Data validation** - Verify data integrity
- [ ] **Compression** - Reduce file sizes
- [ ] **Versioning** - Track data changes over time

## 📝 Notes

- **One-time setup**: Run once, use forever
- **Offline capable**: App works without internet
- **Fast loading**: No API calls during app use
- **Fallback safe**: Always has backup data
- **User friendly**: Shows data source clearly

## 🐛 Troubleshooting

### Common Issues

**"No local data found"**
- Run `npm run pull-data` to fetch data
- Check internet connection
- Verify ESPN API is accessible

**"API rate limited"**
- Wait 1-2 minutes between pulls
- Use `--include-rosters` less frequently
- Check ESPN API status

**"Files not saved"**
- Check write permissions in `src/data/`
- Ensure directory exists
- Verify disk space

### Debug Mode
```bash
# Enable verbose logging
DEBUG=* npm run pull-data

# Check data integrity
node scripts/validate-data.js
``` 