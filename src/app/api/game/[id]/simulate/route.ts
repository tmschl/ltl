import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedUser } from "@/lib/auth-utils"
import { calculatePlayerTotalPoints, calculateGoaliePoints, type GoalEvent, type AssistEvent, type GoaliePerformance } from "@/lib/scoring"

// POST: Simulate game results, player stats, and calculate scores
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

    // Check if user is admin
    const adminMembership = await prisma.leagueMembership.findFirst({
      where: {
        userId: user.id,
        role: "admin"
      }
    })
    
    if (!adminMembership) {
      return NextResponse.json(
        { error: "Only admins can simulate games" },
        { status: 403 }
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

    // Only allow simulating scheduled games
    if (game.status !== 'scheduled') {
      return NextResponse.json(
        { error: "Can only simulate scheduled games" },
        { status: 400 }
      )
    }

    // Step 1: Generate random game scores
    const redWingsScore = Math.floor(Math.random() * 4) + 4 // 4-7
    const opponentScore = Math.floor(Math.random() * 4) + 2 // 2-5
    const redWingsWon = redWingsScore > opponentScore

    // Step 2: Generate player performance stats
    const players = await prisma.player.findMany({
      where: { isActive: true }
    })

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
          shortHandedPoints: Math.random() > 0.9 ? Math.floor(Math.random() * 2) : 0 // 10% chance
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

    // Step 3: Update game with final scores and status
    const updatedGame = await prisma.game.update({
      where: { id },
      data: {
        status: 'final',
        homeScore: game.isHome ? redWingsScore : opponentScore,
        awayScore: game.isHome ? opponentScore : redWingsScore
      }
    })

    // Step 4: Calculate points for all picks
    const allPicks = game.picks
    const updatedPicks = []
    const userLeaguePoints = new Map<string, number>() // key: `${userId}-${leagueId}`, value: points

    for (const pick of allPicks) {
      let pointsEarned = 0

      // Handle team picks
      if (pick.pickType === 'team') {
        // Team pick scoring: 4 points if 4+ goals and won, +1 per goal after 4
        if (redWingsWon && redWingsScore >= 4) {
          pointsEarned = 4 + (redWingsScore - 4) // 4 points base + 1 per goal after 4
        } else {
          pointsEarned = 0
        }

        const updatedPick = await prisma.pick.update({
          where: { id: pick.id },
          data: { pointsEarned }
        })

        updatedPicks.push(updatedPick)

        const key = `${pick.userId}-${pick.leagueId}`
        const currentPoints = userLeaguePoints.get(key) || 0
        userLeaguePoints.set(key, currentPoints + pointsEarned)

        continue
      }

      // Handle player picks
      if (!pick.playerId || !pick.player) {
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

      // If no performance, create zero record
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
      }

      // Calculate points based on player position
      if (pick.player.position === 'Goalie') {
        // For goalies, use assists (5 points per assist)
        pointsEarned = playerPerformance.assists * 5
      } else {
        // For forwards and defensemen
        const goals: GoalEvent[] = []
        const assists: AssistEvent[] = []

        const totalGoals = playerPerformance.goals
        const shorthandedGoals = playerPerformance.shortHandedPoints || 0
        
        for (let i = 0; i < totalGoals; i++) {
          const isShorthanded = i < shorthandedGoals
          
          goals.push({
            playerId: pick.playerId,
            playerName: pick.playerName,
            position: pick.player.position as 'Forward' | 'Defense',
            isOvertime: false,
            isShorthanded: isShorthanded,
            isEmptyNet: false
          })
        }

        for (let i = 0; i < playerPerformance.assists; i++) {
          assists.push({
            playerId: pick.playerId,
            playerName: pick.playerName,
            position: pick.player.position as 'Forward' | 'Defense',
            isOvertime: false,
            isShorthanded: false
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

    // Step 5: Update league membership totals
    for (const [key, totalPoints] of userLeaguePoints) {
      const [userId, leagueId] = key.split('-')
      
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

    return NextResponse.json({
      message: "Game simulated successfully",
      game: {
        id: updatedGame.id,
        status: updatedGame.status,
        redWingsScore,
        opponentScore,
        redWingsWon
      },
      playerPerformancesCreated: playerPerformances.length,
      picksUpdated: updatedPicks.length,
      totalPointsAwarded: Array.from(userLeaguePoints.values()).reduce((a, b) => a + b, 0)
    }, { status: 200 })
  } catch (error) {
    console.error("Simulate game error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}



