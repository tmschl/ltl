import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedUser } from "@/lib/auth-utils"

// GET: Get the current game for the user's league (next scheduled game where draft is active)
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Get user's primary league (most recently joined)
    const membership = await prisma.leagueMembership.findFirst({
      where: {
        userId: user.id
      },
      include: {
        league: true
      },
      orderBy: {
        joinedAt: 'desc'
      }
    })

    if (!membership) {
      return NextResponse.json(
        { error: "You are not a member of any league" },
        { status: 404 }
      )
    }

    const league = membership.league

    // Get the next scheduled game (where draft is active)
    const now = new Date()
    const nextGame = await prisma.game.findFirst({
      where: {
        status: 'scheduled',
        gameDate: {
          gte: now
        }
      },
      orderBy: {
        gameDate: 'asc'
      }
    })

    if (!nextGame) {
      return NextResponse.json(
        { error: "No upcoming games found" },
        { status: 404 }
      )
    }

    // Check if user has already picked
    const userPick = await prisma.pick.findUnique({
      where: {
        userId_leagueId_gameId: {
          userId: user.id,
          leagueId: league.id,
          gameId: nextGame.id
        }
      }
    })

    // Get draft order info
    const allMemberships = await prisma.leagueMembership.findMany({
      where: { leagueId: league.id },
      orderBy: { draftPosition: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    })

    // Get existing picks for this game
    const existingPicks = await prisma.pick.findMany({
      where: {
        leagueId: league.id,
        gameId: nextGame.id
      }
    })

    const picksByUserId = new Set(existingPicks.map(p => p.userId))
    
    // Find next person to pick
    let nextToPick = null
    for (const member of allMemberships) {
      if (member.draftPosition !== null && !picksByUserId.has(member.userId)) {
        nextToPick = member
        break
      }
    }

    // Check if picks are locked (all picked or game started)
    const gameStartTime = new Date(nextGame.gameDate)
    const gameStarted = now >= gameStartTime
    const allPicked = existingPicks.length === allMemberships.length
    const picksLocked = allPicked || gameStarted

    return NextResponse.json({
      game: {
        id: nextGame.id,
        opponent: nextGame.opponent,
        gameDate: nextGame.gameDate.toISOString(),
        isHome: nextGame.isHome,
        status: nextGame.status
      },
      league: {
        id: league.id,
        name: league.name,
        code: league.code
      },
      userPick: userPick ? {
        id: userPick.id,
        playerId: userPick.playerId,
        playerName: userPick.playerName,
        pickType: userPick.pickType
      } : null,
      nextToPick: nextToPick ? {
        userId: nextToPick.userId,
        displayName: nextToPick.user.name || nextToPick.user.email,
        position: nextToPick.draftPosition
      } : null,
      picksLocked,
      allPicked
    }, { status: 200 })
  } catch (error) {
    console.error("Get current game error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}



