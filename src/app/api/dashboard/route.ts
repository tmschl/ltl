import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedUser } from "@/lib/auth-utils"

// GET: Fetch dashboard data (primary league, members, next game)
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Get user's league
    const url = new URL(request.url)
    const leagueId = url.searchParams.get("leagueId")

    let membership;
    
    if (leagueId) {
      // If leagueId is provided, get that specific membership
      membership = await prisma.leagueMembership.findUnique({
        where: {
          leagueId_userId: {
            leagueId,
            userId: user.id
          }
        },
        include: {
          league: {
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
                      name: true
                    }
                  }
                }
              }
            }
          }
        }
      })
    } else {
      // Otherwise get user's primary league (most recently joined)
      const memberships = await prisma.leagueMembership.findMany({
        where: {
          userId: user.id
        },
        include: {
          league: {
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
                      name: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: {
          joinedAt: 'desc'
        },
        take: 1
      })
      membership = memberships[0]
    }

    // If user has no leagues or specified league not found, return empty data
    if (!membership) {
      return NextResponse.json({
        league: null,
        members: [],
        nextGame: null
      }, { status: 200 })
    }

    const league = membership.league

    // Get the next upcoming game (scheduled or in_progress)
    const now = new Date()
    const nextGame = await prisma.game.findFirst({
      where: {
        status: {
          in: ['scheduled', 'in_progress']
        }
      },
      orderBy: {
        gameDate: 'asc'
      }
    })

    // Get picks for the next game if it exists
    let memberPicks = new Map<string, { 
      playerId: string | null; 
      playerName: string; 
      playerNumber: number | null;
      pickType: string;
    }>()
    
    if (nextGame) {
      const picks = await prisma.pick.findMany({
        where: {
          leagueId: league.id,
          gameId: nextGame.id
        },
        include: {
          player: {
            select: {
              id: true,
              name: true,
              number: true
            }
          }
        }
      })

      for (const pick of picks) {
        memberPicks.set(pick.userId, {
          playerId: pick.playerId,
          playerName: pick.playerName,
          playerNumber: pick.player?.number || null,
          pickType: pick.pickType
        })
      }
    }

    // Check if picks are locked (game has started or is final)
    const isAdmin = membership.role === "admin"
    let picksLocked = false
    if (nextGame) {
      const gameStartTime = new Date(nextGame.gameDate)
      const gameStarted = now >= gameStartTime
      picksLocked = !isAdmin && (nextGame.status === 'final' || gameStarted)
    }

    // Build members list sorted by total points
    const members = league.memberships
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((member, index) => {
        const userPick = memberPicks.get(member.userId)
        const hasPicked = !!userPick

        return {
          userId: member.user.id,
          displayName: member.user.name || member.user.email,
          hasPicked,
          pick: userPick || undefined,
          rank: index + 1,
          totalPoints: member.totalPoints
        }
      })

    // Get user's pick for next game if it exists
    let userPick = undefined
    if (nextGame) {
      const pick = await prisma.pick.findUnique({
        where: {
          userId_leagueId_gameId: {
            userId: user.id,
            leagueId: league.id,
            gameId: nextGame.id
          }
        },
        include: {
          player: {
            select: {
              id: true,
              name: true,
              number: true
            }
          }
        }
      })

      if (pick) {
        userPick = {
          playerId: pick.playerId,
          playerName: pick.playerName,
          playerNumber: pick.player?.number || null,
          pickType: pick.pickType
        }
      }
    }

    // Get the most recent completed game for this league
    const lastCompletedGame = await prisma.game.findFirst({
      where: {
        status: 'final'
      },
      orderBy: {
        gameDate: 'desc'
      },
      include: {
        picks: {
          where: {
            leagueId: league.id
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
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        playerPerformances: {
          include: {
            player: {
              select: {
                id: true,
                name: true,
                number: true,
                position: true
              }
            }
          }
        }
      }
    })

    // Build last game results if it exists
    let lastGameResults = null
    if (lastCompletedGame) {
      const redWingsScore = lastCompletedGame.isHome ? lastCompletedGame.homeScore : lastCompletedGame.awayScore
      const opponentScore = lastCompletedGame.isHome ? lastCompletedGame.awayScore : lastCompletedGame.homeScore

      // Get player performances with their calculated points from picks
      const playerStats = lastCompletedGame.playerPerformances
        .filter(perf => perf.goals > 0 || perf.assists > 0) // Only show players with stats
        .map(perf => {
          // Find picks for this player in this game for this league
          const playerPicks = lastCompletedGame.picks.filter(
            p => p.playerId === perf.playerId && p.leagueId === league.id
          )

          return {
            playerId: perf.player.id,
            playerName: perf.player.name,
            playerNumber: perf.player.number,
            position: perf.player.position,
            goals: perf.goals,
            assists: perf.assists,
            points: perf.points,
            shortHandedPoints: perf.shortHandedPoints || 0,
            gamePoints: playerPicks.map(p => ({
              userId: p.userId,
              userName: p.user.name || p.user.email,
              pointsEarned: p.pointsEarned
            }))
          }
        })
        .sort((a, b) => b.points - a.points) // Sort by total points (goals + assists)

      // Get team pick results
      const teamPicks = lastCompletedGame.picks.filter(
        p => p.pickType === 'team' && p.leagueId === league.id
      )

      lastGameResults = {
        gameId: lastCompletedGame.id,
        opponent: lastCompletedGame.opponent,
        gameDate: lastCompletedGame.gameDate.toISOString(),
        isHome: lastCompletedGame.isHome,
        redWingsScore,
        opponentScore,
        redWingsWon: redWingsScore !== null && opponentScore !== null && redWingsScore > opponentScore,
        playerStats,
        teamPicks: teamPicks.map(p => ({
          userId: p.userId,
          userName: p.user.name || p.user.email,
          pointsEarned: p.pointsEarned
        }))
      }
    }

    return NextResponse.json({
      league: {
        id: league.id,
        name: league.name,
        code: league.code,
        seasonYear: league.seasonYear
      },
      members,
      nextGame: nextGame ? {
        id: nextGame.id,
        opponent: nextGame.opponent,
        gameDate: nextGame.gameDate.toISOString(),
        isHome: nextGame.isHome,
        status: nextGame.status,
        isLocked: picksLocked,
        userPick
      } : null,
      lastGameResults,
      isAdmin
    }, { status: 200 })
  } catch (error) {
    console.error("Get dashboard error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}


