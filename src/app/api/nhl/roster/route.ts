import { NextResponse } from 'next/server'
import { getTeamRosterCurrent, formatPlayerName, type Player } from '@/lib/nhlApi'

/**
 * GET /api/nhl/roster?team=DET
 * Gets the current roster for a team (defaults to DET - Red Wings)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const teamAbbrev = searchParams.get('team') || 'DET'
    
    // Get roster from NHL API
    const rosterData = await getTeamRosterCurrent(teamAbbrev)
    
    // Transform to our format
    const allPlayers = [
      ...rosterData.forwards,
      ...rosterData.defensemen,
      ...rosterData.goalies,
    ]
    
    const formattedRoster = allPlayers.map((player: Player) => {
      // Determine position abbreviation
      let position = player.position || 'F'
      if (!position && rosterData.goalies.includes(player)) {
        position = 'G'
      } else if (!position && rosterData.defensemen.includes(player)) {
        position = 'D'
      }
      
      return {
        id: String(player.id),
        name: formatPlayerName(player),
        number: String(player.sweaterNumber || ''),
        position: position,
        playerId: player.id,
        firstName: player.firstName?.default || '',
        lastName: player.lastName?.default || '',
        birthDate: player.birthDate,
      }
    })
    
    return NextResponse.json({
      team: teamAbbrev,
      players: formattedRoster,
      forwards: formattedRoster.filter(p => 
        rosterData.forwards.some((fp: Player) => fp.id === parseInt(p.id))
      ),
      defensemen: formattedRoster.filter(p => 
        rosterData.defensemen.some((dp: Player) => dp.id === parseInt(p.id))
      ),
      goalies: formattedRoster.filter(p => 
        rosterData.goalies.some((gp: Player) => gp.id === parseInt(p.id))
      ),
    })
  } catch (error) {
    console.error('Error fetching NHL roster:', error)
    return NextResponse.json(
      { error: 'Failed to fetch roster data' },
      { status: 500 }
    )
  }
}

