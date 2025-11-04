import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { fetchGameDetails } from "@/lib/nhl-api"

/**
 * Cron job to update game statuses from scheduled → in_progress → final
 * This should run every 5-10 minutes
 * 
 * Can be called manually or via cron service:
 * - Vercel: Configure in vercel.json
 * - External: Use cron-job.org, EasyCron, or GitHub Actions
 */
export async function GET(request: NextRequest) {
  // Optional: Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  try {
    const now = new Date()
    
    // Find games that are scheduled or in_progress
    const activeGames = await prisma.game.findMany({
      where: {
        status: {
          in: ['scheduled', 'in_progress']
        },
        nhlGamePk: {
          not: null
        }
      },
      orderBy: {
        gameDate: 'asc'
      }
    })

    if (activeGames.length === 0) {
      return NextResponse.json(
        {
          message: "No active games to update",
          updated: 0
        },
        { status: 200 }
      )
    }

    const updatedGames = []
    const errors = []

    for (const game of activeGames) {
      try {
        if (!game.nhlGamePk) {
          console.warn(`⚠️  Game ${game.id} does not have NHL gamePk, skipping`)
          continue
        }

        // Fetch latest game status from NHL API
        const gameDetails = await fetchGameDetails(game.nhlGamePk)
        
        // Determine new status
        let newStatus = game.status
        if (gameDetails.gameState === 'OFF' || gameDetails.gameState === 'OFFICIAL') {
          newStatus = 'final'
        } else if (gameDetails.gameState === 'LIVE') {
          newStatus = 'in_progress'
        } else if (gameDetails.gameState === 'FUT' || gameDetails.gameState === 'PRE') {
          newStatus = 'scheduled'
        }

        // Get updated scores
        const homeScore = gameDetails.homeTeam.score || null
        const awayScore = gameDetails.awayTeam.score || null

        // Only update if status or scores changed
        if (newStatus !== game.status || 
            homeScore !== game.homeScore || 
            awayScore !== game.awayScore) {
          const updated = await prisma.game.update({
            where: { id: game.id },
            data: {
              status: newStatus,
              homeScore,
              awayScore,
              updatedAt: new Date()
            }
          })
          
          updatedGames.push(updated)
          console.log(`✅ Updated game ${game.id}: ${game.status} → ${newStatus} (${homeScore || '?'}-${awayScore || '?'})`)
        }
      } catch (error) {
        console.error(`❌ Error updating game ${game.id}:`, error)
        errors.push({
          gameId: game.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json(
      {
        message: "Game status update completed",
        checked: activeGames.length,
        updated: updatedGames.length,
        errors: errors.length,
        games: updatedGames.map(g => ({
          id: g.id,
          opponent: g.opponent,
          status: g.status,
          homeScore: g.homeScore,
          awayScore: g.awayScore
        })),
        errorDetails: errors
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Update game status error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Also support POST for cron services that use POST
export async function POST(request: NextRequest) {
  return GET(request)
}


