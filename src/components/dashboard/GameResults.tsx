"use client"

import { TrophyIcon, TargetIcon, UsersIcon } from "lucide-react"

interface PlayerStat {
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
}

interface GameResults {
  gameId: string
  opponent: string
  gameDate: string
  isHome: boolean
  redWingsScore: number | null
  opponentScore: number | null
  redWingsWon: boolean
  playerStats: PlayerStat[]
  teamPicks: Array<{
    userId: string
    userName: string
    pointsEarned: number
  }>
}

interface GameResultsProps {
  results: GameResults
}

// Calculate point breakdown for a player
function calculatePointBreakdown(stat: PlayerStat): string {
  const { position, goals, assists, shortHandedPoints } = stat
  
  if (position === 'Goalie') {
    // Goalies: 5 points per assist
    if (assists > 0) {
      return `${assists} assist${assists > 1 ? 's' : ''} × 5 = ${assists * 5} points`
    }
    return '0 points (no assists)'
  }
  
  const breakdown: string[] = []
  let totalPoints = 0
  
  // Calculate goal points
  if (goals > 0) {
    const shGoals = Math.min(shortHandedPoints, goals)
    const regGoals = goals - shGoals
    
    if (position === 'Forward') {
      // Forward: 2 pts per goal, doubled if shorthanded
      if (regGoals > 0) {
        const regPoints = regGoals * 2
        breakdown.push(`${regGoals} goal${regGoals > 1 ? 's' : ''} × 2 = ${regPoints} pts`)
        totalPoints += regPoints
      }
      if (shGoals > 0) {
        const shPoints = shGoals * 2 * 2 // doubled for shorthanded
        breakdown.push(`${shGoals} SH goal${shGoals > 1 ? 's' : ''} × 4 = ${shPoints} pts`)
        totalPoints += shPoints
      }
    } else if (position === 'Defense') {
      // Defense: 3 pts per goal, doubled if shorthanded
      if (regGoals > 0) {
        const regPoints = regGoals * 3
        breakdown.push(`${regGoals} goal${regGoals > 1 ? 's' : ''} × 3 = ${regPoints} pts`)
        totalPoints += regPoints
      }
      if (shGoals > 0) {
        const shPoints = shGoals * 3 * 2 // doubled for shorthanded
        breakdown.push(`${shGoals} SH goal${shGoals > 1 ? 's' : ''} × 6 = ${shPoints} pts`)
        totalPoints += shPoints
      }
    }
  }
  
  // Calculate assist points (1 pt per assist, doubled if shorthanded)
  if (assists > 0) {
    // Note: We don't track shorthanded assists separately in the current system
    // So we'll just show regular assists
    const assistPoints = assists * 1
    breakdown.push(`${assists} assist${assists > 1 ? 's' : ''} × 1 = ${assistPoints} pts`)
    totalPoints += assistPoints
  }
  
  if (breakdown.length === 0) {
    return '0 points (no goals or assists)'
  }
  
  return breakdown.join(' + ') + ` = ${totalPoints} total points`
}

export function GameResults({ results }: GameResultsProps) {
  const formattedDate = new Date(results.gameDate).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="backdrop-blur-xl bg-white/5 p-6 rounded-3xl border border-white/10 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center">
          <TrophyIcon className="h-6 w-6 mr-2 text-yellow-400" />
          Game Results
        </h2>
        <span className="text-sm text-gray-400">{formattedDate}</span>
      </div>

      {/* Game Score */}
      <div className="mb-8 p-6 bg-gradient-to-r from-red-500/20 to-red-600/20 rounded-2xl border border-red-500/30">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-6">
            <div className="text-center">
              <p className="text-sm text-gray-400 mb-2">Detroit Red Wings</p>
              <p className="text-5xl font-bold text-white">{results.redWingsScore ?? 0}</p>
            </div>
            <span className="text-3xl font-bold text-gray-300">vs</span>
            <div className="text-center">
              <p className="text-sm text-gray-400 mb-2">{results.opponent}</p>
              <p className="text-5xl font-bold text-white">{results.opponentScore ?? 0}</p>
            </div>
          </div>
          <div className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${
            results.redWingsWon 
              ? "bg-green-500/20 text-green-300 border border-green-500/50" 
              : "bg-red-500/20 text-red-300 border border-red-500/50"
          }`}>
            {results.redWingsWon ? "✓ Red Wings Win" : "✗ Red Wings Loss"}
          </div>
        </div>
      </div>

      {/* Team Picks Results */}
      {results.teamPicks.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-bold text-white mb-3 flex items-center">
            <TargetIcon className="h-5 w-5 mr-2 text-blue-400" />
            Team Picks
          </h3>
          <div className="space-y-2">
            {results.teamPicks.map((pick) => {
              // Team pick scoring: 4 points if 4+ goals and won, +1 per goal after 4
              const redWingsScore = results.redWingsScore ?? 0
              const teamWon = results.redWingsWon
              let calculation = ''
              
              if (teamWon && redWingsScore >= 4) {
                const basePoints = 4
                const bonusGoals = redWingsScore - 4
                calculation = `4+ goals and win: 4 base + ${bonusGoals} bonus = ${pick.pointsEarned} points`
              } else if (!teamWon) {
                calculation = '0 points (team lost)'
              } else {
                calculation = `0 points (team won but scored less than 4 goals)`
              }
              
              return (
                <div
                  key={pick.userId}
                  className="p-4 bg-white/5 rounded-xl border border-white/10"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">{pick.userName}</span>
                    <span className={`text-lg font-bold ${
                      pick.pointsEarned > 0 ? "text-green-400" : "text-gray-400"
                    }`}>
                      {pick.pointsEarned} points
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 font-mono bg-white/5 p-2 rounded">
                    {calculation}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Player Stats */}
      <div>
        <h3 className="text-lg font-bold text-white mb-3 flex items-center">
          <UsersIcon className="h-5 w-5 mr-2 text-purple-400" />
          Player Statistics & Points
        </h3>
        <div className="space-y-3">
          {results.playerStats.map((stat) => (
            <div
              key={stat.playerId}
              className="p-4 bg-white/5 rounded-xl border border-white/10"
            >
              {/* Player Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/30">
                    <span className="text-red-300 font-bold text-sm">
                      {stat.playerNumber || "?"}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-white">{stat.playerName}</p>
                    <p className="text-xs text-gray-400">{stat.position}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Total Points</p>
                  <p className="text-xl font-bold text-white">{stat.points}</p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="bg-white/5 p-2 rounded-lg text-center">
                  <p className="text-xs text-gray-400 mb-1">Goals</p>
                  <p className="text-lg font-bold text-white">{stat.goals}</p>
                </div>
                <div className="bg-white/5 p-2 rounded-lg text-center">
                  <p className="text-xs text-gray-400 mb-1">Assists</p>
                  <p className="text-lg font-bold text-white">{stat.assists}</p>
                </div>
                <div className="bg-white/5 p-2 rounded-lg text-center">
                  <p className="text-xs text-gray-400 mb-1">SH Points</p>
                  <p className="text-lg font-bold text-yellow-400">{stat.shortHandedPoints}</p>
                </div>
              </div>

              {/* Point Calculation Breakdown */}
              <div className="pt-3 border-t border-white/10 mb-3">
                <p className="text-xs text-gray-400 mb-1">Point Calculation:</p>
                <p className="text-xs text-gray-300 font-mono bg-white/5 p-2 rounded">
                  {calculatePointBreakdown(stat)}
                </p>
              </div>

              {/* Game Points Earned */}
              {stat.gamePoints.length > 0 ? (
                <div className="pt-3 border-t border-white/10">
                  <p className="text-xs text-gray-400 mb-2">Points Earned by League Members:</p>
                  <div className="space-y-2">
                    {stat.gamePoints.map((gp) => (
                      <div
                        key={gp.userId}
                        className="flex items-center justify-between text-sm p-2 bg-white/5 rounded-lg"
                      >
                        <span className="text-gray-300 font-medium">{gp.userName}</span>
                        <span className={`font-bold text-lg ${
                          gp.pointsEarned > 0 ? "text-green-400" : "text-gray-400"
                        }`}>
                          {gp.pointsEarned} points
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="pt-3 border-t border-white/10">
                  <p className="text-xs text-gray-500 italic">No league members picked this player</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

