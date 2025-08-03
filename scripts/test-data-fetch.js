const fetch = require('node-fetch');

async function testNFLDataFetch() {
  console.log('🧪 Testing NFL Data Fetching...\n');

  const baseUrl = 'http://localhost:3001/api/nfl-data';

  try {
    // Test teams endpoint
    console.log('📋 Testing teams endpoint...');
    const teamsResponse = await fetch(`${baseUrl}?type=teams`);
    const teamsData = await teamsResponse.json();
    
    if (teamsResponse.ok) {
      console.log(`✅ Teams fetched successfully: ${teamsData.teams?.length || 0} teams`);
      if (teamsData.teams?.length > 0) {
        console.log('   Sample teams:', teamsData.teams.slice(0, 3).map(t => t.name));
      }
    } else {
      console.log(`❌ Teams fetch failed: ${teamsData.message}`);
    }

    console.log('\n📅 Testing schedule endpoint...');
    const scheduleResponse = await fetch(`${baseUrl}?type=schedule&year=2025`);
    const scheduleData = await scheduleResponse.json();
    
    if (scheduleResponse.ok) {
      console.log(`✅ Schedule fetched successfully: ${scheduleData.schedule?.length || 0} games`);
      if (scheduleData.schedule?.length > 0) {
        console.log('   Sample games:', scheduleData.schedule.slice(0, 3).map(g => `${g.awayTeam} @ ${g.homeTeam}`));
      }
    } else {
      console.log(`❌ Schedule fetch failed: ${scheduleData.message}`);
    }

    console.log('\n🔄 Testing cache refresh...');
    const refreshResponse = await fetch(`${baseUrl}?type=refresh`);
    const refreshData = await refreshResponse.json();
    
    if (refreshResponse.ok) {
      console.log(`✅ Cache refreshed: ${refreshData.message}`);
    } else {
      console.log(`❌ Cache refresh failed: ${refreshData.message}`);
    }

  } catch (error) {
    console.error('❌ Error testing data fetch:', error.message);
    console.log('\n💡 Make sure the development server is running on port 3001');
  }
}

// Run the test
testNFLDataFetch(); 