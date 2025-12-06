/**
 * NHL API Test Script
 * 
 * This script tests the NHL API endpoints to:
 * 1. Find tonight's game between Red Wings and Kraken
 * 2. Get the Red Wings roster
 * 
 * Uses the official NHL web API: https://api-web.nhle.com/v1/
 * Documentation: https://github.com/Zmalski/NHL-API-Reference
 * 
 * Run with: node test-nhl-api.js
 */

const https = require('https');

const API_BASE = 'https://api-web.nhle.com/v1';

// Helper function to make API requests
function apiRequest(path) {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE}${path}`;
    console.log(`\nFetching: ${url}`);
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          reject(new Error(`JSON parse error: ${e.message}`));
        }
      });
    }).on('error', (e) => {
      reject(new Error(`Request error: ${e.message}`));
    });
  });
}

async function testNHLAPI() {
  try {
    // 1. Get today's schedule and find Red Wings vs Kraken game
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    console.log(`=== Test 1: Getting Today's Schedule (${today}) ===`);
    const scheduleData = await apiRequest(`/schedule/${today}`);
    
    const gameWeek = scheduleData.gameWeek || [];
    const games = gameWeek[0]?.games || [];
    console.log(`\nTotal games today: ${games.length}`);
    
    // Find Red Wings vs Kraken game
    const wingsKrakenGame = games.find(g => {
      const awayPlace = g.awayTeam?.placeName?.default || '';
      const homePlace = g.homeTeam?.placeName?.default || '';
      const awayCommon = g.awayTeam?.commonName?.default || '';
      const homeCommon = g.homeTeam?.commonName?.default || '';
      
      return (
        (awayPlace.includes('Detroit') || homePlace.includes('Detroit')) &&
        (awayPlace.includes('Seattle') || homePlace.includes('Seattle'))
      ) || (
        (awayCommon.includes('Wings') || homeCommon.includes('Wings')) &&
        (awayCommon.includes('Kraken') || homeCommon.includes('Kraken'))
      );
    });
    
    if (wingsKrakenGame) {
      console.log('\n🎯 Found Red Wings vs Kraken game!');
      console.log(`\nGame Details:`);
      console.log(`  Game ID: ${wingsKrakenGame.id}`);
      console.log(`  Away: ${wingsKrakenGame.awayTeam.placeName.default} ${wingsKrakenGame.awayTeam.commonName.default} (ID: ${wingsKrakenGame.awayTeam.id}, ${wingsKrakenGame.awayTeam.abbrev})`);
      console.log(`  Home: ${wingsKrakenGame.homeTeam.placeName.default} ${wingsKrakenGame.homeTeam.commonName.default} (ID: ${wingsKrakenGame.homeTeam.id}, ${wingsKrakenGame.homeTeam.abbrev})`);
      console.log(`  Venue: ${wingsKrakenGame.venue.default}`);
      console.log(`  Start Time: ${wingsKrakenGame.startTimeUTC}`);
      console.log(`  Game State: ${wingsKrakenGame.gameState}`);
      
      // Store team IDs for roster lookup
      const redWingsId = wingsKrakenGame.awayTeam.id === 17 ? wingsKrakenGame.awayTeam : wingsKrakenGame.homeTeam;
      const redWingsAbbrev = redWingsId.abbrev;
      
      // 2. Get Red Wings roster (using season format - /current redirects)
      // Season format: YYYY(YYYY+1), e.g., 20242025 for 2024-25 season (4 digits + 4 digits)
      // NHL season starts in October, so if month >= 9, we're in the new season
      const now = new Date();
      const currentYear = now.getFullYear();
      const month = now.getMonth(); // 0-11, where 9 = October
      const seasonStartYear = month >= 9 ? currentYear : currentYear - 1;
      const seasonEndYear = seasonStartYear + 1;
      const season = `${seasonStartYear}${seasonEndYear}`; // Full 4-digit year
      console.log(`\n=== Test 2: Getting Red Wings Roster (season ${season}) ===`);
      const rosterData = await apiRequest(`/roster/${redWingsAbbrev}/${season}`);
      
      const forwards = rosterData.forwards || [];
      const defensemen = rosterData.defensemen || [];
      const goalies = rosterData.goalies || [];
      const totalPlayers = forwards.length + defensemen.length + goalies.length;
      
      console.log(`\nRed Wings Roster (${totalPlayers} players total):\n`);
      
      console.log(`Forwards (${forwards.length}):`);
      forwards
        .sort((a, b) => (parseInt(a.sweaterNumber) || 999) - (parseInt(b.sweaterNumber) || 999))
        .forEach(player => {
          const name = `${player.firstName?.default || ''} ${player.lastName?.default || ''}`.trim();
          console.log(`  #${String(player.sweaterNumber || 'N/A').padStart(2)} ${name.padEnd(25)} - ID: ${player.id} - Position: ${player.position || 'F'}`);
        });
      
      console.log(`\nDefensemen (${defensemen.length}):`);
      defensemen
        .sort((a, b) => (parseInt(a.sweaterNumber) || 999) - (parseInt(b.sweaterNumber) || 999))
        .forEach(player => {
          const name = `${player.firstName?.default || ''} ${player.lastName?.default || ''}`.trim();
          console.log(`  #${String(player.sweaterNumber || 'N/A').padStart(2)} ${name.padEnd(25)} - ID: ${player.id} - Position: ${player.position || 'D'}`);
        });
      
      console.log(`\nGoalies (${goalies.length}):`);
      goalies
        .sort((a, b) => (parseInt(a.sweaterNumber) || 999) - (parseInt(b.sweaterNumber) || 999))
        .forEach(player => {
          const name = `${player.firstName?.default || ''} ${player.lastName?.default || ''}`.trim();
          console.log(`  #${String(player.sweaterNumber || 'N/A').padStart(2)} ${name.padEnd(25)} - ID: ${player.id}`);
        });
      
      // 3. Show sample player data structure
      if (forwards.length > 0) {
        console.log(`\n=== Sample Player Data Structure ===`);
        const samplePlayer = forwards[0];
        console.log(JSON.stringify({
          id: samplePlayer.id,
          firstName: samplePlayer.firstName?.default,
          lastName: samplePlayer.lastName?.default,
          sweaterNumber: samplePlayer.sweaterNumber,
          position: samplePlayer.position,
          birthDate: samplePlayer.birthDate,
        }, null, 2));
      }
      
    } else {
      console.log('\n❌ Red Wings vs Kraken game not found for today.');
      console.log('\nGames today:');
      games.forEach(g => {
        console.log(`  - ${g.awayTeam.abbrev} @ ${g.homeTeam.abbrev} (Game ID: ${g.id})`);
      });
    }
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nStack:', error.stack);
  }
}

// Run the tests
testNHLAPI();

