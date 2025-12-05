import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedUser } from "@/lib/auth-utils"

// DELETE: Clean up all games (for development/testing)
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Delete all picks first (foreign key constraint)
    await prisma.pick.deleteMany({})
    
    // Delete all player performances
    await prisma.playerPerformance.deleteMany({})
    
    // Delete all games
    const deletedGames = await prisma.game.deleteMany({})

    return NextResponse.json({
      message: "All games cleaned up",
      deletedCount: deletedGames.count
    }, { status: 200 })
  } catch (error) {
    console.error("Clean games error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}



