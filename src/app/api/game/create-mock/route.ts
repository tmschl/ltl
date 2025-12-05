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

    // Only allow admin to create mock games
    // Check if user is admin in any league
    const adminMembership = await prisma.leagueMembership.findFirst({
      where: {
        userId: user.id,
        role: "admin"
      }
    })
    
    if (!adminMembership) {
      return NextResponse.json(
        { error: "Only admins can create mock games" },
        { status: 403 }
      )
    }

    // Create a mock game for tomorrow
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(19, 0, 0, 0) // 7 PM

    const opponents = ["Toronto Maple Leafs", "Boston Bruins", "Tampa Bay Lightning", "Florida Panthers", "Montreal Canadiens", "Ottawa Senators", "Buffalo Sabres"]
    const randomOpponent = opponents[Math.floor(Math.random() * opponents.length)]
    const isHome = Math.random() > 0.5

    const game = await prisma.game.create({
      data: {
        opponent: randomOpponent,
        gameDate: tomorrow,
        isHome,
        status: "scheduled",
        homeTeam: "Detroit Red Wings",
        awayTeam: isHome ? randomOpponent : "Detroit Red Wings",
      }
    })

    return NextResponse.json({
      message: "Mock game created successfully",
      game
    }, { status: 201 })

  } catch (error) {
    console.error("Create mock game error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

