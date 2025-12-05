import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedUser } from "@/lib/auth-utils"

// POST: Rotate draft order (first pick goes to last, everyone else moves up)
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

    // Get league with memberships
    const league = await prisma.league.findUnique({
      where: { id },
      include: {
        memberships: {
          orderBy: {
            draftPosition: 'asc'
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

    // Filter out memberships without draft positions
    const membershipsWithPositions = league.memberships.filter(
      m => m.draftPosition !== null
    )

    if (membershipsWithPositions.length === 0) {
      return NextResponse.json(
        { error: "Draft order has not been set for this league" },
        { status: 400 }
      )
    }

    // Rotate draft order: first pick (position 1) goes to last, everyone else moves up
    const updates = []
    const totalMembers = membershipsWithPositions.length

    for (const membership of membershipsWithPositions) {
      let newPosition: number
      
      if (membership.draftPosition === 1) {
        // First pick goes to last position
        newPosition = totalMembers
      } else {
        // Everyone else moves up one position
        newPosition = membership.draftPosition! - 1
      }

      updates.push(
        prisma.leagueMembership.update({
          where: { id: membership.id },
          data: { draftPosition: newPosition }
        })
      )
    }

    await Promise.all(updates)

    // Get updated draft order
    const updatedMemberships = await prisma.leagueMembership.findMany({
      where: { leagueId: id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      },
      orderBy: {
        draftPosition: 'asc'
      }
    })

    const draftOrder = updatedMemberships
      .filter(m => m.draftPosition !== null)
      .map(m => ({
        position: m.draftPosition!,
        userId: m.userId,
        displayName: m.user.name || m.user.email
      }))

    return NextResponse.json({
      message: "Draft order rotated successfully",
      draftOrder
    }, { status: 200 })
  } catch (error) {
    console.error("Rotate draft order error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}



