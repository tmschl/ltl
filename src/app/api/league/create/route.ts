import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedUser } from "@/lib/auth-utils"

// Generate a unique 6-character league code
function generateLeagueCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Exclude confusing chars
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { name, maxMembers } = await request.json()

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: "League name is required" },
        { status: 400 }
      )
    }

    // Generate unique league code
    let code = generateLeagueCode()
    let attempts = 0
    let existingLeague = await prisma.league.findUnique({
      where: { code }
    })

    // Ensure code is unique (small chance of collision)
    while (existingLeague && attempts < 10) {
      code = generateLeagueCode()
      existingLeague = await prisma.league.findUnique({
        where: { code }
      })
      attempts++
    }

    if (existingLeague) {
      return NextResponse.json(
        { error: "Failed to generate unique league code. Please try again." },
        { status: 500 }
      )
    }

    // Create league and membership in a transaction
    const league = await prisma.league.create({
      data: {
        name: name.trim(),
        code,
        createdById: user.id,
        maxMembers: maxMembers || null,
        memberships: {
          create: {
            userId: user.id,
            role: 'admin',
          }
        }
      },
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
    })

    return NextResponse.json(
      { 
        message: "League created successfully",
        league: {
          id: league.id,
          name: league.name,
          code: league.code,
          maxMembers: league.maxMembers,
          seasonYear: league.seasonYear,
          memberCount: league.memberships.length,
        }
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Create league error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

