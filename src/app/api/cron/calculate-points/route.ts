import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * Cron job to calculate points for completed games
 * This should run every 15 minutes after games end
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
    // Find games that are final, have picks, but no points calculated yet
    const gamesToCalculate = await prisma.game.findMany({
      where: {
        status: 'final',
        nhlGamePk: {
          not: null
        },
        picks: {
          some: {
            pointsEarned: 0 // Has picks but no points yet
          }
        }
      },
      include: {
        picks: {
          select: {
            id: true,
            pointsEarned: true
          }
        }
      },
      orderBy: {
        gameDate: 'desc'
      }
    })

    // Filter to only games where ALL picks have 0 points (not calculated yet)
    const gamesNeedingCalculation = gamesToCalculate.filter(game => {
      return game.picks.length > 0 && game.picks.every(pick => pick.pointsEarned === 0)
    })

    if (gamesNeedingCalculation.length === 0) {
      return NextResponse.json(
        {
          message: "No games need point calculation",
          calculated: 0
        },
        { status: 200 }
      )
    }

    const calculatedGames = []
    const errors = []

    for (const game of gamesNeedingCalculation) {
      try {
        // Call the calculate points endpoint
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
        const calculateResponse = await fetch(`${baseUrl}/api/pick/calculate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Pass auth if needed (for internal calls)
            ...(process.env.CRON_SECRET ? { 'Authorization': `Bearer ${process.env.CRON_SECRET}` } : {})
          },
          body: JSON.stringify({ gameId: game.id })
        })

        if (!calculateResponse.ok) {
          const errorData = await calculateResponse.json().catch(() => ({ error: 'Unknown error' }))
          throw new Error(errorData.error || `HTTP ${calculateResponse.status}`)
        }

        const calculateData = await calculateResponse.json()
        calculatedGames.push({
          gameId: game.id,
          opponent: game.opponent,
          picksUpdated: calculateData.picksUpdated || 0,
          isOvertime: calculateData.isOvertime || false,
          isShootout: calculateData.isShootout || false
        })
        
        console.log(`✅ Calculated points for game ${game.id} vs ${game.opponent}`)
      } catch (error) {
        console.error(`❌ Error calculating points for game ${game.id}:`, error)
        errors.push({
          gameId: game.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json(
      {
        message: "Point calculation completed",
        checked: gamesNeedingCalculation.length,
        calculated: calculatedGames.length,
        errors: errors.length,
        games: calculatedGames,
        errorDetails: errors
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Calculate points cron error:", error)
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

