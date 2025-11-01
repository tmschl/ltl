"use client"

import { TrophyIcon, TrendingUpIcon, TrendingDownIcon } from "lucide-react"

interface LeaderboardEntry {
  rank: number
  userId: string
  displayName: string
  points: number
  correctPredictions: number
  totalPredictions: number
  trend: 'up' | 'down' | 'same'
  isCurrentUser?: boolean
}

export function Leaderboard({ currentUserId }: { currentUserId: string }) {
  // Mock data - in production, this would come from a database
  const leaderboardData: LeaderboardEntry[] = [
    {
      rank: 1,
      userId: '1',
      displayName: 'HockeyPro23',
      points: 245,
      correctPredictions: 18,
      totalPredictions: 25,
      trend: 'up',
    },
    {
      rank: 2,
      userId: '2',
      displayName: 'WingsForever',
      points: 232,
      correctPredictions: 17,
      totalPredictions: 25,
      trend: 'same',
    },
    {
      rank: 3,
      userId: currentUserId,
      displayName: 'You',
      points: 218,
      correctPredictions: 16,
      totalPredictions: 25,
      trend: 'up',
      isCurrentUser: true,
    },
    {
      rank: 4,
      userId: '4',
      displayName: 'DetroitFan88',
      points: 205,
      correctPredictions: 15,
      totalPredictions: 25,
      trend: 'down',
    },
    {
      rank: 5,
      userId: '5',
      displayName: 'IceKing',
      points: 198,
      correctPredictions: 14,
      totalPredictions: 25,
      trend: 'same',
    },
    {
      rank: 6,
      userId: '6',
      displayName: 'PuckMaster',
      points: 187,
      correctPredictions: 13,
      totalPredictions: 25,
      trend: 'down',
    },
    {
      rank: 7,
      userId: '7',
      displayName: 'GoalGetter',
      points: 175,
      correctPredictions: 12,
      totalPredictions: 25,
      trend: 'up',
    },
    {
      rank: 8,
      userId: '8',
      displayName: 'HockeyNut',
      points: 162,
      correctPredictions: 11,
      totalPredictions: 25,
      trend: 'down',
    },
  ]

  return (
    <div className="backdrop-blur-xl bg-white/5 p-6 rounded-3xl border border-white/10 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center">
          <TrophyIcon className="h-7 w-7 mr-2 text-yellow-400" />
          League Rankings
        </h2>
        <span className="text-sm text-gray-400">Season 2023-24</span>
      </div>
      <div className="space-y-3">
        {leaderboardData.map((entry) => (
          <div
            key={entry.userId}
            className={`backdrop-blur-xl p-4 rounded-2xl border transition-all ${entry.isCurrentUser ? 'bg-red-500/20 border-red-500/50 shadow-lg shadow-red-500/20' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${entry.rank === 1 ? 'bg-yellow-500/20 text-yellow-300 border-2 border-yellow-500/50' : entry.rank === 2 ? 'bg-gray-400/20 text-gray-300 border-2 border-gray-400/50' : entry.rank === 3 ? 'bg-orange-600/20 text-orange-300 border-2 border-orange-600/50' : 'bg-white/10 text-gray-300'}`}
                >
                  {entry.rank}
                </div>
                <div>
                  <p
                    className={`font-semibold ${entry.isCurrentUser ? 'text-white' : 'text-gray-200'}`}
                  >
                    {entry.displayName}
                    {entry.isCurrentUser && (
                      <span className="ml-2 text-xs bg-red-500/30 px-2 py-1 rounded-full">
                        You
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-gray-400">
                    {entry.correctPredictions}/{entry.totalPredictions} correct
                    predictions
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-2xl font-bold text-white">
                    {entry.points}
                  </p>
                  <p className="text-xs text-gray-400">points</p>
                </div>
                {entry.trend === 'up' && (
                  <TrendingUpIcon className="h-5 w-5 text-green-400" />
                )}
                {entry.trend === 'down' && (
                  <TrendingDownIcon className="h-5 w-5 text-red-400" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

