"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { TrophyIcon, PlusIcon, UserPlusIcon } from "lucide-react"

interface League {
  id: string
  name: string
  code: string
  seasonYear: number
  maxMembers: number | null
  memberCount: number
  role: string
  totalPoints: number
  rank: number
  joinedAt: string
  createdAt: string
}

export default function LeaguesPage() {
  const [leagues, setLeagues] = useState<League[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchLeagues()
  }, [])

  const fetchLeagues = async () => {
    try {
      const response = await fetch("/api/leagues")
      if (response.ok) {
        const data = await response.json()
        setLeagues(data.leagues || [])
      }
    } catch (error) {
      console.error("Error fetching leagues:", error)
    } finally {
      setLoading(false)
    }
  }

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50'
    if (rank === 2) return 'bg-gray-400/20 text-gray-300 border-gray-400/50'
    if (rank === 3) return 'bg-orange-600/20 text-orange-300 border-orange-600/50'
    return 'bg-white/10 text-gray-300'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-red-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading...</p>
        </div>
      </div>
    )
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
                My Leagues
              </h1>
            </div>
            {/* Buttons removed for simplified workflow */}
          </div>
        </header>

        {/* Leagues List */}
        {leagues.length === 0 ? (
          <div className="backdrop-blur-xl bg-white/5 p-12 rounded-3xl border border-white/10 shadow-2xl text-center">
            <TrophyIcon className="mx-auto h-20 w-20 text-gray-400 mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">No leagues yet</h3>
            <p className="text-gray-400 mb-6">You are not currently in a league. Please contact an administrator.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {leagues.map((league) => (
              <div
                key={league.id}
                onClick={() => router.push(`/league/${league.id}`)}
                className="backdrop-blur-xl bg-white/5 p-6 rounded-2xl border border-white/10 hover:bg-white/10 hover:border-red-500/30 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-bold text-white group-hover:text-red-200 transition-colors">
                    {league.name}
                  </h3>
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold border-2 ${getRankBadgeColor(league.rank)}`}>
                    {league.rank}
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <p className="text-sm text-gray-400">
                    <TrophyIcon className="h-4 w-4 inline mr-1" />
                    Season {league.seasonYear}
                  </p>
                  <p className="text-sm text-gray-400">
                    Code: <span className="text-white font-mono">{league.code}</span>
                  </p>
                  <p className="text-sm text-gray-400">
                    {league.memberCount} {league.memberCount === 1 ? 'member' : 'members'}
                    {league.maxMembers && ` / ${league.maxMembers}`}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <div>
                    <p className="text-2xl font-bold text-white">{league.totalPoints}</p>
                    <p className="text-xs text-gray-400">points</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-3 py-1 text-xs rounded-full ${
                      league.role === 'admin' 
                        ? 'bg-red-500/20 text-red-200 border border-red-500/30' 
                        : 'bg-white/10 text-gray-300 border border-white/20'
                    }`}>
                      {league.role}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Back to Dashboard */}
        <div className="mt-8 text-center">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-sm text-gray-300 hover:text-white transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}

