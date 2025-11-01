import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedUser } from "@/lib/auth-utils"

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { code } = await request.json()

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: "League code is required" },
        { status: 400 }
      )
    }

    // Find league by code
    const league = await prisma.league.findUnique({
      where: { code: code.trim().toUpperCase() },
      include: {
        memberships: true,
      }
    })

    if (!league) {
      return NextResponse.json(
        { error: "League not found" },
        { status: 404 }
      )
    }

    // Check if user is already a member
    const existingMembership = league.memberships.find(
      membership => membership.userId === user.id
    )

    if (existingMembership) {
      return NextResponse.json(
        { error: "You are already a member of this league" },
        { status: 400 }
      )
    }

    // Check if league is full
    if (league.maxMembers && league.memberships.length >= league.maxMembers) {
      return NextResponse.json(
        { error: "This league is full" },
        { status: 400 }
      )
    }

    // Create membership
    const membership = await prisma.leagueMembership.create({
      data: {
        leagueId: league.id,
        userId: user.id,
        role: 'member',
      },
      include: {
        league: {
          include: {
            memberships: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    name: true,
                  }
                }
              }
            }
          }
        }
      }
    })

    return NextResponse.json(
      { 
        message: "Successfully joined league",
        league: {
          id: league.id,
          name: league.name,
          code: league.code,
          maxMembers: league.maxMembers,
          seasonYear: league.seasonYear,
          memberCount: membership.league.memberships.length,
        }
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Join league error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

