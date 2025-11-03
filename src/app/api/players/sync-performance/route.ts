import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedUser } from "@/lib/auth-utils"
import { fetchGameDetailsForScoring } from "@/lib/nhl-api"

/**
 * Sync player performance data from NHL API for a specific game
 * This endpoint fetches boxscore data and creates/updates PlayerPerformance records
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { gameId } = await request.json()

    if (!gameId) {
      return NextResponse.json(
        { error: "gameId is required" },
        { status: 400 }
      )
    }

    // Fetch the game
    const game = await prisma.game.findUnique({
      where: { id: gameId }
    })

    if (!game) {
      return NextResponse.json(
        { error: "Game not found" },
        { status: 404 }
      )
    }

    if (!game.nhlGamePk) {
      return NextResponse.json(
        { error: "Game does not have NHL gamePk. Please sync games first." },
        { status: 400 }
      )
    }

    // Fetch game details from NHL API
    console.log(`🔄 Syncing player performance for game ${gameId} (NHL gamePk: ${game.nhlGamePk})`)
    const scoringData = await fetchGameDetailsForScoring(game.nhlGamePk)

    const createdPerformances = []
    const updatedPerformances = []

    // Process player stats (skaters)
    for (const playerStat of scoringData.playerStats) {
      // Skip goalies - they'll be handled separately
      if (playerStat.position.toLowerCase() === 'goalie') {
        continue
      }

      // Find player by NHL ID
      const player = await prisma.player.findUnique({
        where: { nhlPlayerId: playerStat.playerId }
      })

      if (!player) {
        console.warn(`⚠️  Player not found for NHL ID ${playerStat.playerId} (${playerStat.name})`)
        continue
      }

      // Calculate points (goals + assists)
      const points = playerStat.goals + playerStat.assists

      // Find or create PlayerPerformance
      const existingPerformance = await prisma.playerPerformance.findUnique({
        where: {
          playerId_gameId: {
            playerId: player.id,
            gameId: game.id
          }
        }
      })

      const performanceData = {
        goals: playerStat.goals,
        assists: playerStat.assists,
        points: points,
        shortHandedPoints: playerStat.shortHandedGoals, // Store shorthanded goals count
        powerPlayPoints: playerStat.powerPlayGoals || 0
      }

      if (existingPerformance) {
        const updated = await prisma.playerPerformance.update({
          where: { id: existingPerformance.id },
          data: performanceData
        })
        updatedPerformances.push(updated)
        console.log(`✅ Updated performance: ${playerStat.name} - ${playerStat.goals}G ${playerStat.assists}A`)
      } else {
        const created = await prisma.playerPerformance.create({
          data: {
            playerId: player.id,
            gameId: game.id,
            ...performanceData
          }
        })
        createdPerformances.push(created)
        console.log(`✅ Created performance: ${playerStat.name} - ${playerStat.goals}G ${playerStat.assists}A`)
      }
    }

    // Process goalie stats
    if (scoringData.goalieStats) {
      for (const goalieStat of scoringData.goalieStats) {
        // Find player by NHL ID
        const player = await prisma.player.findUnique({
          where: { nhlPlayerId: goalieStat.playerId }
        })

        if (!player) {
          console.warn(`⚠️  Goalie not found for NHL ID ${goalieStat.playerId} (${goalieStat.name})`)
          continue
        }

        // Find or create PlayerPerformance
        const existingPerformance = await prisma.playerPerformance.findUnique({
          where: {
            playerId_gameId: {
              playerId: player.id,
              gameId: game.id
            }
          }
        })

        // For goalies, we store assists but goals/goals against come from team stats
        const performanceData = {
          goals: 0, // Goalies don't score goals (in this context)
          assists: goalieStat.assists,
          points: goalieStat.assists, // Goalie points calculated separately
          // Note: Goals against is stored in game context, not PlayerPerformance
        }

        if (existingPerformance) {
          const updated = await prisma.playerPerformance.update({
            where: { id: existingPerformance.id },
            data: performanceData
          })
          updatedPerformances.push(updated)
          console.log(`✅ Updated goalie performance: ${goalieStat.name} - ${goalieStat.goalsAgainst} GA, ${goalieStat.assists}A`)
        } else {
          const created = await prisma.playerPerformance.create({
            data: {
              playerId: player.id,
              gameId: game.id,
              ...performanceData
            }
          })
          createdPerformances.push(created)
          console.log(`✅ Created goalie performance: ${goalieStat.name} - ${goalieStat.goalsAgainst} GA, ${goalieStat.assists}A`)
        }
      }
    }

    return NextResponse.json(
      {
        message: "Player performance synced successfully",
        created: createdPerformances.length,
        updated: updatedPerformances.length,
        gameId: game.id,
        gamePk: game.nhlGamePk,
        isOvertime: scoringData.isOvertime,
        isShootout: scoringData.isShootout
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Sync player performance error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

