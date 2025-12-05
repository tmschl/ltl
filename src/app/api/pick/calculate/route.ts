import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { fetchGameDetailsForScoring } from "@/lib/nhl-api"
import { calculatePlayerTotalPoints, calculateGoaliePoints, type GoalEvent, type AssistEvent, type GoaliePerformance } from "@/lib/scoring"

// This endpoint calculates and updates points for all picks in a completed game
// Can be called manually or via a scheduled job
export async function POST(request: NextRequest) {
  try {
    const { gameId } = await request.json()

    if (!gameId) {
      return NextResponse.json(
        { error: "gameId is required" },
        { status: 400 }
      )
    }

    // Fetch the game
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        picks: {
          include: {
            player: true
          }
        }
      }
    })

    if (!game) {
      return NextResponse.json(
        { error: "Game not found" },
        { status: 404 }
      )
    }

    // Only calculate points for final games
    if (game.status !== 'final') {
      return NextResponse.json(
        { error: "Game is not final yet. Cannot calculate points." },
        { status: 400 }
      )
    }

    // Check if points have already been calculated
    const hasPoints = game.picks.some(pick => pick.pointsEarned > 0)
    if (hasPoints) {
      return NextResponse.json(
        { error: "Points have already been calculated for this game" },
        { status: 400 }
      )
    }

    // Get game scores to determine winner (for team picks)
    const redWingsScore = game.isHome ? game.homeScore : game.awayScore
    const opponentScore = game.isHome ? game.awayScore : game.homeScore
    const redWingsWon = redWingsScore !== null && opponentScore !== null && redWingsScore > opponentScore

    // Fetch game scoring data from NHL API (only if nhlGamePk exists)
    let scoringData = null
    if (game.nhlGamePk) {
      console.log(`🔄 Calculating points for game ${gameId} (NHL gamePk: ${game.nhlGamePk})`)
      try {
        scoringData = await fetchGameDetailsForScoring(game.nhlGamePk)
      } catch (error) {
        console.warn("Failed to fetch NHL API data, using PlayerPerformance records only")
      }
    }
    
    const allPicks = game.picks
    const updatedPicks = []
    // Track points per user per league to avoid double counting
    const userLeaguePoints = new Map<string, number>() // key: `${userId}-${leagueId}`, value: points

    for (const pick of allPicks) {
      let pointsEarned = 0

      // Handle team picks
      if (pick.pickType === 'team') {
        // Team pick scoring: 4 points if 4+ goals and won, +1 per goal after 4
        if (redWingsScore !== null && redWingsWon && redWingsScore >= 4) {
          pointsEarned = 4 + (redWingsScore - 4) // 4 points base + 1 per goal after 4
        } else {
          pointsEarned = 0 // Team lost or scored less than 4 goals
        }

        // Update pick with calculated points
        const updatedPick = await prisma.pick.update({
          where: { id: pick.id },
          data: { pointsEarned }
        })

        updatedPicks.push(updatedPick)

        // Track points per user per league
        const key = `${pick.userId}-${pick.leagueId}`
        const currentPoints = userLeaguePoints.get(key) || 0
        userLeaguePoints.set(key, currentPoints + pointsEarned)

        continue // Skip player performance logic for team picks
      }

      // Handle player picks
      if (!pick.playerId || !pick.player) {
        console.warn(`⚠️  Pick ${pick.id} is missing playerId or player relation`)
        continue
      }

      // Get player performance for this game
      let playerPerformance = await prisma.playerPerformance.findUnique({
        where: {
          playerId_gameId: {
            playerId: pick.playerId,
            gameId: game.id
          }
        }
      })

      // If no performance record exists, try to sync it first
      if (!playerPerformance && game.nhlGamePk) {
        console.warn(`⚠️  No player performance found for ${pick.playerName} in game ${gameId}. Attempting to sync...`)
        // Try to sync player performance (this will create the record)
        try {
          const syncResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/players/sync-performance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameId })
          })
          if (syncResponse.ok) {
            // Re-fetch the performance record
            playerPerformance = await prisma.playerPerformance.findUnique({
              where: {
                playerId_gameId: {
                  playerId: pick.playerId,
                  gameId: game.id
                }
              }
            })
          }
        } catch (syncError) {
          console.error(`Failed to sync player performance:`, syncError)
        }
      }

      // If still no performance, create zero record
      if (!playerPerformance) {
        playerPerformance = await prisma.playerPerformance.create({
          data: {
            playerId: pick.playerId,
            gameId: game.id,
            goals: 0,
            assists: 0,
            points: 0,
            shortHandedPoints: 0
          }
        })
        console.warn(`⚠️  Created zero performance record for ${pick.playerName}`)
      }

      // Find player stats from NHL API data
      const playerNhlId = pick.player.nhlPlayerId
      const playerStat = playerNhlId && scoringData
        ? scoringData.playerStats.find(stat => stat.playerId === playerNhlId)
        : null

      // Calculate points based on player position
      if (pick.player.position === 'Goalie') {
        // For goalies, calculate using goalie-specific scoring
        const goalieStat = scoringData.goalieStats?.find(stat => stat.playerId === playerNhlId)
        
        if (goalieStat) {
          const goaliePerformance: GoaliePerformance = {
            playerId: pick.playerId,
            goalsAgainst: goalieStat.goalsAgainst,
            assists: goalieStat.assists,
            emptyNetGoals: 0, // Empty net goals not tracked in boxscore - would need game feed
            shootoutGoals: scoringData.isShootout ? goalieStat.goalsAgainst : 0 // Simplified: if shootout, assume all goals against are shootout
          }
          
          pointsEarned = calculateGoaliePoints(goaliePerformance)
        } else {
          // Fallback: use assists from PlayerPerformance
          pointsEarned = playerPerformance.assists * 5 // 5 points per assist
        }
      } else {
        // For forwards and defensemen
        const goals: GoalEvent[] = []
        const assists: AssistEvent[] = []

        // Determine if game went to OT
        const isOvertimeGame = scoringData?.isOvertime && !scoringData?.isShootout

        // Create goal events
        // For OT detection: if it's an OT game and player has goals, we'll assume last goal(s) are OT
        // This is a simplification - ideally we'd parse the game feed for exact OT goals
        const totalGoals = playerPerformance.goals
        const shorthandedGoals = playerPerformance.shortHandedPoints || 0
        
        for (let i = 0; i < totalGoals; i++) {
          // Determine if this is an OT goal
          // Simplified: if OT game and this is the last goal, assume it's OT
          const isOvertimeGoal = isOvertimeGame && i === totalGoals - 1
          
          // Determine if shorthanded (use shortHandedPoints count)
          const isShorthanded = i < shorthandedGoals
          
          goals.push({
            playerId: pick.playerId,
            playerName: pick.playerName,
            position: pick.player.position as 'Forward' | 'Defense',
            isOvertime: isOvertimeGoal,
            isShorthanded: isShorthanded,
            isEmptyNet: false // Empty net detection would require game feed parsing
          })
        }

        // Create assist events
        // For assists, we can't easily determine OT/shorthanded without game feed
        // Simplified: assume regular assists (can be enhanced later)
        for (let i = 0; i < playerPerformance.assists; i++) {
          assists.push({
            playerId: pick.playerId,
            playerName: pick.playerName,
            position: pick.player.position as 'Forward' | 'Defense',
            isOvertime: false, // Would need game feed to determine
            isShorthanded: false // Would need game feed to determine
          })
        }

        pointsEarned = calculatePlayerTotalPoints(
          pick.player.position as 'Forward' | 'Defense',
          goals,
          assists
        )
      }

      // Update pick with calculated points
      const updatedPick = await prisma.pick.update({
        where: { id: pick.id },
        data: { pointsEarned }
      })

      updatedPicks.push(updatedPick)

      // Track points per user per league
      const key = `${pick.userId}-${pick.leagueId}`
      const currentPoints = userLeaguePoints.get(key) || 0
      userLeaguePoints.set(key, currentPoints + pointsEarned)
    }

    // Update league membership totals
    // Group by user and league to avoid double counting
    for (const [key, totalPoints] of userLeaguePoints) {
      const [userId, leagueId] = key.split('-')
      
      // Update user's total points in this league
      await prisma.leagueMembership.updateMany({
        where: {
          leagueId: leagueId,
          userId: userId
        },
        data: {
          totalPoints: {
            increment: totalPoints
          }
        }
      })
    }

    return NextResponse.json(
      { 
        message: "Points calculated successfully",
        picksUpdated: updatedPicks.length,
        isOvertime: scoringData?.isOvertime || false,
        isShootout: scoringData?.isShootout || false,
        picks: updatedPicks.map(p => ({
          id: p.id,
          playerName: p.playerName,
          pointsEarned: p.pointsEarned
        }))
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Calculate points error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

