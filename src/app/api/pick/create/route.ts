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

    const body = await request.json()
    const { leagueId, gameId, playerId, playerName, pickType, targetUserId } = body
    
    console.log("Create pick request:", {
      userId: user.id,
      email: user.email,
      leagueId,
      gameId,
      playerId,
      playerName,
      pickType,
      targetUserId
    })

    // Validate input
    if (!leagueId || !gameId || !playerName) {
      return NextResponse.json(
        { error: "Missing required fields: leagueId, gameId, playerName" },
        { status: 400 }
      )
    }

    const isTeamPick = pickType === "team"
    if (!isTeamPick && !playerId) {
      return NextResponse.json(
        { error: "playerId is required for player picks" },
        { status: 400 }
      )
    }

    // Check if user is a member of the league and get all memberships
    const membership = await prisma.leagueMembership.findUnique({
      where: {
        leagueId_userId: {
          leagueId,
          userId: user.id
        }
      }
    })

    if (!membership) {
      return NextResponse.json(
        { error: "You are not a member of this league" },
        { status: 403 }
      )
    }

    // Determine which user to create the pick for
    // Allow league admins to pick for anyone, regular users can only pick for themselves
    const pickUserId = targetUserId || user.id
    const isAdminUser = membership.role === "admin"
    
    // Verify target user is in the league
    if (targetUserId && targetUserId !== user.id) {
      // Only allow admins to pick for others
      if (!isAdminUser) {
        return NextResponse.json(
          { error: "Only admins can pick for other users" },
          { status: 403 }
        )
      }
      
      const targetMembership = await prisma.leagueMembership.findUnique({
        where: {
          leagueId_userId: {
            leagueId,
            userId: targetUserId
          }
        }
      })
      
      if (!targetMembership) {
        return NextResponse.json(
          { error: "Target user is not a member of this league" },
          { status: 400 }
        )
      }
    }

    // Fetch the game
    const game = await prisma.game.findUnique({
      where: { id: gameId }
    })

    if (!game) {
      return NextResponse.json(
        { error: "Game not found" },
        { status: 404 }
      )
    }

    // Check if game has started (picks lock when game starts)
    const gameStartTime = new Date(game.gameDate)
    const now = new Date()
    const gameStarted = now >= gameStartTime

    // Allow admins to pick even after game start
    if (!isAdminUser) {
      if (game.status === 'final') {
        return NextResponse.json(
          { error: "Picks are locked for this game. The game has already finished." },
          { status: 400 }
        )
      }
      
      if (gameStarted && game.status !== 'scheduled') {
        return NextResponse.json(
          { error: "Picks are locked for this game. The game has started." },
          { status: 400 }
        )
      }
    }

    // Check if target user already made a pick for this game in this league
    const existingPick = await prisma.pick.findUnique({
      where: {
        userId_leagueId_gameId: {
          userId: pickUserId,
          leagueId,
          gameId
        }
      }
    })

    if (existingPick) {
      // Update existing pick instead of creating new one
      const updatedPick = await prisma.pick.update({
        where: { id: existingPick.id },
        data: {
          playerId: isTeamPick ? null : playerId,
          playerName,
          pickType: isTeamPick ? "team" : "player"
        },
        include: {
          player: {
            select: {
              id: true,
              name: true,
              number: true,
              position: true
            }
          },
          game: {
            select: {
              id: true,
              opponent: true,
              gameDate: true
            }
          }
        }
      })

      // Check if all members have now picked - if so, lock all picks
      const allMemberships = await prisma.leagueMembership.findMany({
        where: { leagueId }
      })
      
      const allPicks = await prisma.pick.findMany({
        where: {
          leagueId,
          gameId
        }
      })

      if (allPicks.length === allMemberships.length) {
        await prisma.pick.updateMany({
          where: {
            leagueId,
            gameId
          },
          data: {
            lockedAt: new Date()
          }
        })
      }

      return NextResponse.json(
        { 
          message: "Pick updated successfully",
          pick: {
            id: updatedPick.id,
            playerId: updatedPick.playerId,
            playerName: updatedPick.playerName,
            player: updatedPick.player,
            gameId: updatedPick.gameId,
            game: updatedPick.game,
            leagueId: updatedPick.leagueId,
            pointsEarned: updatedPick.pointsEarned,
            pickedAt: updatedPick.pickedAt
          }
        },
        { status: 200 }
      )
    }

    // For player picks, verify player exists
    if (!isTeamPick && playerId) {
      try {
        const player = await prisma.player.findUnique({
          where: { id: playerId }
        })

        if (!player) {
          console.error(`Player not found: ${playerId}`)
          return NextResponse.json(
            { error: `Player not found: ${playerId}` },
            { status: 404 }
          )
        }
        
        console.log(`Player found: ${player.name} (${player.id})`)
      } catch (playerError: any) {
        console.error("Error looking up player:", playerError)
        return NextResponse.json(
          { error: "Failed to verify player", details: playerError.message },
          { status: 500 }
        )
      }
    }

    // Create the pick - only include scalar fields, no relations
    const pickData: {
      userId: string
      leagueId: string
      gameId: string
      playerId: string | null
      playerName: string
      pickType: string
      lockedAt: Date | null
    } = {
      userId: pickUserId,
      leagueId,
      gameId,
      playerId: isTeamPick ? null : (playerId || null),
      playerName,
      pickType: isTeamPick ? "team" : "player",
      lockedAt: null // Will be set when all picks are locked
    }
    
    console.log("Creating pick with data:", JSON.stringify(pickData, null, 2))
    
    // Verify all required fields are present
    if (!pickData.userId || !pickData.leagueId || !pickData.gameId || !pickData.playerName) {
      console.error("Missing required fields in pickData:", pickData)
      return NextResponse.json(
        { 
          error: "Missing required fields",
          details: {
            hasUserId: !!pickData.userId,
            hasLeagueId: !!pickData.leagueId,
            hasGameId: !!pickData.gameId,
            hasPlayerName: !!pickData.playerName,
            hasPlayerId: !!pickData.playerId,
            pickType: pickData.pickType
          }
        },
        { status: 400 }
      )
    }
    
    // Create the pick - use separate queries to avoid include issues
    let pick
    try {
      // Explicitly create with only scalar fields - no relations
      pick = await prisma.pick.create({
        data: {
          userId: pickData.userId,
          leagueId: pickData.leagueId,
          gameId: pickData.gameId,
          playerId: pickData.playerId,
          playerName: pickData.playerName,
          pickType: pickData.pickType,
          lockedAt: pickData.lockedAt
        }
      })
      console.log("Pick created successfully:", pick.id)
    } catch (createError: any) {
      console.error("Error creating pick:", createError)
      console.error("Create error details:", {
        code: createError.code,
        meta: createError.meta,
        message: createError.message,
        data: pickData
      })
      throw createError // Re-throw to be caught by outer catch
    }
    
    // Fetch related data separately - build include conditionally
    let pickWithRelations
    try {
      const includeQuery: any = {
        game: {
          select: {
            id: true,
            opponent: true,
            gameDate: true
          }
        }
      }
      
      // Only include player if it's not a team pick AND playerId is not null
      if (!isTeamPick && pick.playerId) {
        includeQuery.player = {
          select: {
            id: true,
            name: true,
            number: true,
            position: true
          }
        }
      }
      
      pickWithRelations = await prisma.pick.findUnique({
        where: { id: pick.id },
        include: includeQuery
      })
      
      console.log("Pick with relations fetched:", pickWithRelations?.id)
    } catch (fetchError: any) {
      console.error("Error fetching pick with relations:", fetchError)
      // If fetching relations fails, just use the pick we created
      pickWithRelations = pick
    }

    // Check if all members have now picked - if so, lock all picks
    const allMemberships = await prisma.leagueMembership.findMany({
      where: { leagueId }
    })
    
    const allPicks = await prisma.pick.findMany({
      where: {
        leagueId,
        gameId
      }
    })

    if (allPicks.length === allMemberships.length) {
      // All members have picked - lock all picks
      await prisma.pick.updateMany({
        where: {
          leagueId,
          gameId
        },
        data: {
          lockedAt: new Date()
        }
      })
    }

    if (!pickWithRelations) {
      console.error("pickWithRelations is null after fetch")
      throw new Error("Failed to fetch created pick")
    }
    
    // Build response safely
    const responsePick: any = {
      id: pickWithRelations.id,
      playerId: pickWithRelations.playerId,
      playerName: pickWithRelations.playerName,
      gameId: pickWithRelations.gameId,
      leagueId: pickWithRelations.leagueId,
      pointsEarned: pickWithRelations.pointsEarned,
      pickedAt: pickWithRelations.pickedAt
    }
    
    // Add player relation only if it exists and it's not a team pick
    if (!isTeamPick && pickWithRelations.player) {
      responsePick.player = pickWithRelations.player
    } else {
      responsePick.player = null
    }
    
    // Add game relation if it exists
    if (pickWithRelations.game) {
      responsePick.game = pickWithRelations.game
    }
    
    console.log("Returning successful response with pick:", responsePick.id)
    
    return NextResponse.json(
      { 
        message: "Pick created successfully",
        pick: responsePick
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("Create pick error:", error)
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack,
      name: error.name
    })
    
    // Handle unique constraint violations
    if (error.code === 'P2002') {
      const field = error.meta?.target?.join(', ') || 'unknown field'
      return NextResponse.json(
        { 
          error: "You have already made a pick for this game in this league",
          details: `Unique constraint violation on: ${field}`
        },
        { status: 400 }
      )
    }
    
    // Handle foreign key constraint violations
    if (error.code === 'P2003') {
      const field = error.meta?.field_name || 'unknown field'
      return NextResponse.json(
        { 
          error: `Invalid reference: ${field}`,
          details: error.meta?.message || 'Foreign key constraint violation'
        },
        { status: 400 }
      )
    }
    
    // Handle record not found
    if (error.code === 'P2025') {
      return NextResponse.json(
        { 
          error: "Record not found",
          details: error.meta?.cause || error.message
        },
        { status: 404 }
      )
    }
    
    // Return detailed error in development
    const errorMessage = error.message || 'Unknown error'
    const errorDetails: any = {
      message: errorMessage,
      code: error.code || 'UNKNOWN'
    }
    
    // Add meta if available (but sanitize it)
    if (error.meta) {
      errorDetails.meta = {
        target: error.meta.target,
        field_name: error.meta.field_name,
        cause: error.meta.cause
      }
    }
    
    // In development, add stack trace
    if (process.env.NODE_ENV === 'development') {
      errorDetails.stack = error.stack
    }
    
    console.error("Returning error response:", JSON.stringify(errorDetails, null, 2))
    
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: errorDetails
      },
      { status: 500 }
    )
  }
}

