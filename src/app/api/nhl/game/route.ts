import { NextResponse } from 'next/server'
import { getScheduleForDate, findGameBetweenTeams, type Game } from '@/lib/nhlApi'

/**
 * GET /api/nhl/game?date=YYYY-MM-DD
 * Gets the Red Wings game for a specific date (defaults to today)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    
    // Default to today if no date provided
    const date = dateParam || new Date().toISOString().split('T')[0]
    
    // Get schedule for the date
    const schedule = await getScheduleForDate(date)
    
    // Find Red Wings game (they could be home or away)
    const redWingsGame = schedule.gameWeek
      .flatMap(week => week.games)
      .find(game => {
        const awayAbbrev = game.awayTeam.abbrev
        const homeAbbrev = game.homeTeam.abbrev
        return awayAbbrev === 'DET' || homeAbbrev === 'DET'
      })
    
    if (!redWingsGame) {
      return NextResponse.json(
        { error: 'No Red Wings game found for this date' },
        { status: 404 }
      )
    }
    
    // Transform to our format
    const isHome = redWingsGame.homeTeam.abbrev === 'DET'
    const opponent = isHome ? redWingsGame.awayTeam : redWingsGame.homeTeam
    const redWings = isHome ? redWingsGame.homeTeam : redWingsGame.awayTeam
    
    // Format game date/time
    const gameDate = new Date(redWingsGame.startTimeUTC)
    const dateStr = gameDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
    const timeStr = gameDate.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      timeZoneName: 'short'
    })
    
    const gameData = {
      id: String(redWingsGame.id),
      gameId: redWingsGame.id,
      opponent: opponent.placeName.default + ' ' + opponent.commonName.default,
      opponentAbbrev: opponent.abbrev,
      opponentLogo: opponent.logo,
      opponentId: opponent.id,
      date: dateStr,
      time: timeStr,
      startTimeUTC: redWingsGame.startTimeUTC,
      venue: redWingsGame.venue.default,
      isHome,
      status: redWingsGame.gameState === 'FUT' ? 'upcoming' : 'completed',
      gameState: redWingsGame.gameState,
      // Store full NHL API game data for reference
      nhlGameData: redWingsGame,
    }
    
    return NextResponse.json(gameData)
  } catch (error) {
    console.error('Error fetching NHL game:', error)
    return NextResponse.json(
      { error: 'Failed to fetch game data' },
      { status: 500 }
    )
  }
}

