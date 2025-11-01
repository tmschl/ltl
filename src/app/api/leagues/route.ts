import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedUser } from "@/lib/auth-utils"

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Get all leagues the user belongs to
    const memberships = await prisma.leagueMembership.findMany({
      where: {
        userId: user.id,
      },
      include: {
        league: {
          include: {
            memberships: {
              orderBy: {
                totalPoints: 'desc'
              },
              select: {
                userId: true,
                totalPoints: true,
              }
            },
            _count: {
              select: {
                picks: true,
              }
            }
          }
        }
      },
      orderBy: {
        joinedAt: 'desc'
      }
    })

    // Transform data to include user's rank
    const leaguesWithRank = memberships.map(membership => {
      const rank = membership.league.memberships.findIndex(
        m => m.userId === user.id
      ) + 1

      return {
        id: membership.league.id,
        name: membership.league.name,
        code: membership.league.code,
        seasonYear: membership.league.seasonYear,
        maxMembers: membership.league.maxMembers,
        memberCount: membership.league.memberships.length,
        role: membership.role,
        totalPoints: membership.totalPoints,
        rank,
        joinedAt: membership.joinedAt,
        createdAt: membership.league.createdAt,
      }
    })

    return NextResponse.json(
      { 
        leagues: leaguesWithRank
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Get leagues error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

