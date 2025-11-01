import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedUser } from "@/lib/auth-utils"

export async function GET(
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

    // Get league with all members
    const league = await prisma.league.findUnique({
      where: { id },
      include: {
        memberships: {
          orderBy: {
            totalPoints: 'desc'
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              }
            }
          }
        },
        creator: {
          select: {
            id: true,
            email: true,
            name: true,
          }
        }
      }
    })

    if (!league) {
      return NextResponse.json(
        { error: "League not found" },
        { status: 404 }
      )
    }

    // Check if user is a member
    const userMembership = league.memberships.find(
      m => m.userId === user.id
    )

    if (!userMembership) {
      return NextResponse.json(
        { error: "You are not a member of this league" },
        { status: 403 }
      )
    }

    // Get upcoming games for this league
    const upcomingGames = await prisma.game.findMany({
      where: {
        status: {
          in: ['scheduled', 'in_progress']
        }
      },
      orderBy: {
        gameDate: 'asc'
      },
      take: 5
    })

    // Transform memberships to include rank
    const members = league.memberships.map((membership, index) => ({
      id: membership.id,
      userId: membership.user.id,
      displayName: membership.user.name || membership.user.email,
      totalPoints: membership.totalPoints,
      role: membership.role,
      rank: index + 1,
      joinedAt: membership.joinedAt,
    }))

    return NextResponse.json(
      { 
        league: {
          id: league.id,
          name: league.name,
          code: league.code,
          seasonYear: league.seasonYear,
          maxMembers: league.maxMembers,
          createdAt: league.createdAt,
          creator: league.creator,
        },
        members,
        upcomingGames: upcomingGames.map(game => ({
          id: game.id,
          opponent: game.opponent,
          gameDate: game.gameDate,
          isHome: game.isHome,
          status: game.status,
        })),
        userMembership: {
          role: userMembership.role,
          totalPoints: userMembership.totalPoints,
          rank: members.findIndex(m => m.userId === user.id) + 1,
        }
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Get league error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

