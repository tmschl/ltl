import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * Cron job to sync player performance data for active/completed games
 * This should run every 15 minutes during game windows
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
    
    // Find games that are in_progress or recently final (within last 24 hours)
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    
    const gamesToSync = await prisma.game.findMany({
      where: {
        OR: [
          { status: 'in_progress' },
          {
            status: 'final',
            gameDate: {
              gte: twentyFourHoursAgo
            }
          }
        ],
        nhlGamePk: {
          not: null
        }
      },
      orderBy: {
        gameDate: 'desc'
      }
    })

    if (gamesToSync.length === 0) {
      return NextResponse.json(
        {
          message: "No games to sync player performance",
          synced: 0
        },
        { status: 200 }
      )
    }

    const syncedGames = []
    const errors = []

    for (const game of gamesToSync) {
      try {
        if (!game.nhlGamePk) {
          console.warn(`⚠️  Game ${game.id} does not have NHL gamePk, skipping`)
          continue
        }

        // Call the sync-performance endpoint
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
        const syncResponse = await fetch(`${baseUrl}/api/players/sync-performance`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Pass auth if needed (for internal calls)
            ...(process.env.CRON_SECRET ? { 'Authorization': `Bearer ${process.env.CRON_SECRET}` } : {})
          },
          body: JSON.stringify({ gameId: game.id })
        })

        if (!syncResponse.ok) {
          const errorData = await syncResponse.json().catch(() => ({ error: 'Unknown error' }))
          throw new Error(errorData.error || `HTTP ${syncResponse.status}`)
        }

        const syncData = await syncResponse.json()
        syncedGames.push({
          gameId: game.id,
          opponent: game.opponent,
          created: syncData.created || 0,
          updated: syncData.updated || 0
        })
        
        console.log(`✅ Synced player performance for game ${game.id} vs ${game.opponent}`)
      } catch (error) {
        console.error(`❌ Error syncing player performance for game ${game.id}:`, error)
        errors.push({
          gameId: game.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json(
      {
        message: "Player performance sync completed",
        checked: gamesToSync.length,
        synced: syncedGames.length,
        errors: errors.length,
        games: syncedGames,
        errorDetails: errors
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

// Also support POST for cron services that use POST
export async function POST(request: NextRequest) {
  return GET(request)
}


