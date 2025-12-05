import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedUser } from "@/lib/auth-utils"

// GET: Get current draft order for the league
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

    // Get league with memberships
    const league = await prisma.league.findUnique({
      where: { id },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true
              }
            }
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

    // Sort memberships by draft position (nulls last)
    const sortedMemberships = [...league.memberships].sort((a, b) => {
      if (a.draftPosition === null && b.draftPosition === null) return 0
      if (a.draftPosition === null) return 1
      if (b.draftPosition === null) return -1
      return a.draftPosition - b.draftPosition
    })

    const draftOrder = sortedMemberships.map((membership, index) => ({
      position: membership.draftPosition ?? index + 1,
      userId: membership.userId,
      displayName: membership.user.name || membership.user.email,
      totalPoints: membership.totalPoints
    }))

    return NextResponse.json({
      draftOrder,
      isAdmin: userMembership.role === "admin"
    }, { status: 200 })
  } catch (error) {
    console.error("Get draft order error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST: Set draft order (admin only)
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
    const { userIds } = await request.json()

    if (!userIds || !Array.isArray(userIds)) {
      return NextResponse.json(
        { error: "userIds array is required" },
        { status: 400 }
      )
    }

    // Get league
    const league = await prisma.league.findUnique({
      where: { id },
      include: {
        memberships: true
      }
    })

    if (!league) {
      return NextResponse.json(
        { error: "League not found" },
        { status: 404 }
      )
    }

    // Check if user is admin
    const userMembership = league.memberships.find(
      m => m.userId === user.id
    )

    if (!userMembership || userMembership.role !== "admin") {
      return NextResponse.json(
        { error: "Only league admins can set draft order" },
        { status: 403 }
      )
    }

    // Validate that all userIds are members of the league
    const leagueUserIds = new Set(league.memberships.map(m => m.userId))
    const invalidUserIds = userIds.filter(uid => !leagueUserIds.has(uid))
    
    if (invalidUserIds.length > 0) {
      return NextResponse.json(
        { error: `Invalid user IDs: ${invalidUserIds.join(", ")}` },
        { status: 400 }
      )
    }

    // Validate that all members are included
    if (userIds.length !== league.memberships.length) {
      return NextResponse.json(
        { error: "All league members must be included in draft order" },
        { status: 400 }
      )
    }

    // Update draft positions
    const updates = userIds.map((userId, index) => 
      prisma.leagueMembership.updateMany({
        where: {
          leagueId: id,
          userId: userId
        },
        data: {
          draftPosition: index + 1
        }
      })
    )

    await Promise.all(updates)

    return NextResponse.json(
      { message: "Draft order updated successfully" },
      { status: 200 }
    )
  } catch (error) {
    console.error("Set draft order error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}



