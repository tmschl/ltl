import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedUser } from "@/lib/auth-utils"

// POST: Generate mock game results
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { id } = await context.params

    // Get the game
    const game = await prisma.game.findUnique({
      where: { id },
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

    // Only allow mocking scheduled games
    if (game.status !== 'scheduled') {
      return NextResponse.json(
        { error: "Can only mock results for scheduled games" },
        { status: 400 }
      )
    }

    // Generate random game scores (4-7 goals for Red Wings, 2-5 for opponent)
    const redWingsScore = Math.floor(Math.random() * 4) + 4 // 4-7
    const opponentScore = Math.floor(Math.random() * 4) + 2 // 2-5
    const redWingsWon = redWingsScore > opponentScore

    // Get all active players
    const players = await prisma.player.findMany({
      where: { isActive: true }
    })

    // Generate random stats for each player (0-3 goals, 0-2 assists)
    const playerPerformances = []
    for (const player of players) {
      const goals = Math.floor(Math.random() * 4) // 0-3
      const assists = Math.floor(Math.random() * 3) // 0-2
      const points = goals + assists

      // Only create performance if player has stats
      if (goals > 0 || assists > 0) {
        playerPerformances.push({
          playerId: player.id,
          gameId: id,
          goals,
          assists,
          points,
          shortHandedPoints: Math.random() > 0.9 ? Math.floor(Math.random() * 2) : 0 // 10% chance of shorthanded points
        })
      }
    }

    // Create player performance records
    await Promise.all(
      playerPerformances.map(perf =>
        prisma.playerPerformance.upsert({
          where: {
            playerId_gameId: {
              playerId: perf.playerId,
              gameId: perf.gameId
            }
          },
          update: perf,
          create: perf
        })
      )
    )

    // Update game with final scores and status
    const updatedGame = await prisma.game.update({
      where: { id },
      data: {
        status: 'final',
        homeScore: game.isHome ? redWingsScore : opponentScore,
        awayScore: game.isHome ? opponentScore : redWingsScore
      }
    })

    return NextResponse.json({
      message: "Mock game results generated successfully",
      game: {
        id: updatedGame.id,
        status: updatedGame.status,
        homeScore: updatedGame.homeScore,
        awayScore: updatedGame.awayScore,
        redWingsWon,
        redWingsScore,
        opponentScore
      },
      playerPerformancesCreated: playerPerformances.length
    }, { status: 200 })
  } catch (error) {
    console.error("Mock game results error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}



