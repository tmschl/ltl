"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Image from "next/image"
import { NextGame } from "@/components/dashboard/NextGame"
import { LeagueMembers } from "@/components/dashboard/LeagueMembers"
import { GameResults } from "@/components/dashboard/GameResults"

interface User {
  id: string
  email: string
  name?: string
}

interface DashboardData {
  league: {
    id: string
    name: string
    code: string
    seasonYear: number
  } | null
  members: Array<{
    userId: string
    displayName: string
    hasPicked: boolean
    pick?: {
      playerId: string | null
      playerName: string
      playerNumber: number | null
      pickType: string
    }
    rank: number
    totalPoints: number
  }>
  isAdmin: boolean
  nextGame: {
    id: string
    opponent: string
    gameDate: string
    isHome: boolean
    status: string
    isLocked: boolean
    userPick?: {
      playerId: string | null
      playerName: string
      playerNumber: number | null
      pickType: string
    }
  } | null
  lastGameResults: {
    gameId: string
    opponent: string
    gameDate: string
    isHome: boolean
    redWingsScore: number | null
    opponentScore: number | null
    redWingsWon: boolean
    playerStats: Array<{
      playerId: string
      playerName: string
      playerNumber: number | null
      position: string
      goals: number
      assists: number
      points: number
      shortHandedPoints: number
      gamePoints: Array<{
        userId: string
        userName: string
        pointsEarned: number
      }>
    }>
    teamPicks: Array<{
      userId: string
      userName: string
      pointsEarned: number
    }>
  } | null
}

interface Player {
  id: string
  name: string
  number: number | null
  position: string
}


export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [submittingPicks, setSubmittingPicks] = useState<Set<string>>(new Set())
  const [simulating, setSimulating] = useState(false)
  const [creatingNextGame, setCreatingNextGame] = useState(false)
  const router = useRouter()

  // Get leagueId from URL query params if present
  // We need to handle this in useEffect since useSearchParams is not available in all contexts or might need Suspense
  const [leagueIdParam, setLeagueIdParam] = useState<string | null>(null)

  useEffect(() => {
    // Parse query params from window.location to avoid Suspense requirements for now
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search)
      setLeagueIdParam(searchParams.get('leagueId'))
    }
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check auth
        const authResponse = await fetch("/api/auth/me")
        if (!authResponse.ok) {
          router.push("/login")
          return
        }
        const userData = await authResponse.json()
        setUser(userData.user)

        // Fetch dashboard data
        // Append leagueId to query if present
        const endpoint = leagueIdParam 
          ? `/api/dashboard?leagueId=${leagueIdParam}`
          : "/api/dashboard"
          
        const dashboardResponse = await fetch(endpoint)
        if (dashboardResponse.ok) {
          const data = await dashboardResponse.json()
          setDashboardData(data)
        }

        // Fetch players
        const playersResponse = await fetch("/api/players")
        if (playersResponse.ok) {
          const playersData = await playersResponse.json()
          setPlayers(playersData.players || [])
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router, leagueIdParam])

  const handlePickUpdate = async () => {
    // Refresh dashboard data after pick update
    try {
      const endpoint = leagueIdParam 
        ? `/api/dashboard?leagueId=${leagueIdParam}`
        : "/api/dashboard"

      const response = await fetch(endpoint)
      if (response.ok) {
        const data = await response.json()
        console.log("Dashboard data refreshed:", data)
        setDashboardData(data)
      } else {
        console.error("Failed to refresh dashboard:", response.status, response.statusText)
      }
    } catch (error) {
      console.error("Error refreshing dashboard:", error)
    }
  }

  const handleMakePick = async (targetUserId: string, playerId: string | null, playerName: string, pickType: string) => {
    if (!dashboardData || !dashboardData.league || !dashboardData.nextGame) {
      alert("Game or league information is missing. Please refresh the page.")
      return
    }
    
    if (pickType === "player" && !playerId) {
      alert("Invalid pick: Player ID is required for player picks.")
      return
    }
    
    if (!playerName || playerName.trim() === "") {
      alert("Invalid pick: Player name is required.")
      return
    }

    setSubmittingPicks(prev => new Set(prev).add(targetUserId))

    try {
      const response = await fetch("/api/pick/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leagueId: dashboardData.league.id,
          gameId: dashboardData.nextGame.id,
          targetUserId,
          playerId,
          playerName,
          pickType
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMsg = data.error || 'Unknown error'
        alert(errorMsg)
        await handlePickUpdate()
        return
      }

      // Refresh dashboard
      await handlePickUpdate()
    } catch (error) {
      console.error("Error making pick:", error)
      await handlePickUpdate()
      alert("Failed to submit pick. Please try again.")
    } finally {
      setSubmittingPicks(prev => {
        const newSet = new Set(prev)
        newSet.delete(targetUserId)
        return newSet
      })
    }
  }

  const handleSimulateGame = async () => {
    if (!dashboardData?.nextGame) {
      alert("No game available to simulate.")
      return
    }

    if (!confirm("Simulate this game? This will generate game results, player stats, and calculate scores for all picks.")) {
      return
    }

    setSimulating(true)

    try {
      const response = await fetch(`/api/game/${dashboardData.nextGame.id}/simulate`, {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMsg = data.error || 'Unknown error'
        alert(`Failed to simulate game: ${errorMsg}`)
        return
      }

      alert(`Game simulated successfully!\n\nRed Wings: ${data.game.redWingsScore}\n${dashboardData.nextGame.opponent}: ${data.game.opponentScore}\n\nPoints calculated for ${data.picksUpdated} picks.`)
      
      // Refresh dashboard to show updated scores
      await handlePickUpdate()
    } catch (error) {
      console.error("Error simulating game:", error)
      alert("Failed to simulate game. Please try again.")
    } finally {
      setSimulating(false)
    }
  }

  const handleCreateNextGame = async () => {
    if (!dashboardData?.league) {
      alert("League information is missing.")
      return
    }

    setCreatingNextGame(true)

    try {
      const response = await fetch("/api/game/create-mock", {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMsg = data.error || 'Unknown error'
        alert(`Failed to create next game: ${errorMsg}`)
        return
      }

      alert(`Next game created!\n\n${data.game.opponent} on ${new Date(data.game.gameDate).toLocaleDateString()}`)
      
      // Refresh dashboard to show the new game
      await handlePickUpdate()
    } catch (error) {
      console.error("Error creating next game:", error)
      alert("Failed to create next game. Please try again.")
    } finally {
      setCreatingNextGame(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-red-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      router.push("/login")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-red-950 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <header className="mb-8">
          <div className="flex justify-between items-center backdrop-blur-xl bg-white/5 p-4 rounded-2xl border border-white/10">
            <div className="flex items-center space-x-4">
              <Image
                src="https://upload.wikimedia.org/wikipedia/en/thumb/e/e0/Detroit_Red_Wings_logo.svg/1200px-Detroit_Red_Wings_logo.svg.png"
                alt="Red Wings Logo"
                width={40}
                height={40}
              />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-red-200 bg-clip-text text-transparent">
                Light The Lamp
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-300">
                Welcome, {user.name || user.email}
              </div>
              <button
                onClick={handleSignOut}
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-lg shadow-red-500/30"
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="space-y-8">
          {dashboardData?.league ? (
            <>
              {/* League Header */}
              <div className="backdrop-blur-xl bg-white/5 p-6 rounded-3xl border border-white/10 shadow-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-bold text-white mb-2">{dashboardData.league.name}</h2>
                    <p className="text-gray-400">Season {dashboardData.league.seasonYear}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400 mb-1">League Code</p>
                    <p className="text-2xl font-mono tracking-widest text-white">{dashboardData.league.code}</p>
                  </div>
                </div>
              </div>

              {/* Last Game Results */}
              {dashboardData.lastGameResults && (
                <div className="mb-8">
                  <GameResults results={dashboardData.lastGameResults} />
                  {/* Next Game Button - Show after game is completed */}
                  {dashboardData.isAdmin && (!dashboardData.nextGame || dashboardData.nextGame.status === 'final') && (
                    <div className="mt-4 backdrop-blur-xl bg-blue-500/10 p-4 rounded-2xl border border-blue-500/30">
                      <button
                        onClick={handleCreateNextGame}
                        disabled={creatingNextGame}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-lg shadow-blue-500/20 disabled:cursor-not-allowed"
                      >
                        {creatingNextGame ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            Creating Next Game...
                          </div>
                        ) : (
                          "➡️ Create Next Game"
                        )}
                      </button>
                      <p className="text-sm text-blue-300/70 mt-2 text-center">
                        Create a new scheduled game for the league. Point totals are preserved.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Next Game */}
              {dashboardData.nextGame && (
                <div className="mb-8">
                  <NextGame
                    game={{
                      ...dashboardData.nextGame,
                      lockTime: dashboardData.nextGame.gameDate
                    }}
                    leagueId={dashboardData.league.id}
                    onPickUpdate={handlePickUpdate}
                  />
                  {/* Simulate Game Button - Admin Only */}
                  {dashboardData.isAdmin && dashboardData.nextGame.status === 'scheduled' && (
                    <div className="mt-4 backdrop-blur-xl bg-purple-500/10 p-4 rounded-2xl border border-purple-500/30">
                      <button
                        onClick={handleSimulateGame}
                        disabled={simulating}
                        className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-lg shadow-purple-500/20 disabled:cursor-not-allowed"
                      >
                        {simulating ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            Simulating Game...
                          </div>
                        ) : (
                          "🎮 Simulate Game & Calculate Scores"
                        )}
                      </button>
                      <p className="text-sm text-purple-300/70 mt-2 text-center">
                        Generate game results, player stats, and calculate points for all picks
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* No Next Game - Show Create Button */}
              {!dashboardData.nextGame && dashboardData.isAdmin && (
                <div className="mb-8 backdrop-blur-xl bg-blue-500/10 p-6 rounded-2xl border border-blue-500/30">
                  <h3 className="text-xl font-bold text-blue-200 mb-2">No Upcoming Game</h3>
                  <p className="text-blue-300/70 mb-4">Create a new game to start making picks!</p>
                  <button
                    onClick={handleCreateNextGame}
                    disabled={creatingNextGame}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-lg shadow-blue-500/20 disabled:cursor-not-allowed"
                  >
                    {creatingNextGame ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Creating Game...
                      </div>
                    ) : (
                      "➕ Create Next Game"
                    )}
                  </button>
                </div>
              )}

              {/* League Members */}
              <div className="mb-8">
                <LeagueMembers
                  members={dashboardData.members.map((member) => ({
                    ...member,
                    isCurrentUser: member.userId === user.id
                  }))}
                  nextGame={dashboardData.nextGame ? {
                    id: dashboardData.nextGame.id,
                    isLocked: dashboardData.nextGame.isLocked
                  } : undefined}
                  players={players}
                  onMakePick={(targetUserId, playerId, playerName, pickType) => {
                    if (dashboardData?.league && dashboardData?.nextGame) {
                      handleMakePick(targetUserId, playerId, playerName, pickType)
                    } else {
                      alert("No game available.")
                    }
                  }}
                  isAdmin={dashboardData.isAdmin}
                  submittingPicks={submittingPicks}
                />
              </div>
            </>
          ) : (
            /* No League State */
            <div className="backdrop-blur-xl bg-white/5 p-12 rounded-3xl border border-white/10 shadow-2xl text-center">
              <h2 className="text-3xl font-bold text-white mb-4">Welcome to Light The Lamp!</h2>
              <p className="text-gray-300 mb-8 text-lg">
                You are not currently in a league. Please contact an administrator to be added to a league.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
