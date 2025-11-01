"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Image from "next/image"
import { TrophyIcon, CopyIcon, CheckIcon } from "lucide-react"

interface Member {
  id: string
  userId: string
  displayName: string
  totalPoints: number
  role: string
  rank: number
  joinedAt: string
}

interface League {
  id: string
  name: string
  code: string
  seasonYear: number
  maxMembers: number | null
  createdAt: string
  creator: {
    id: string
    email: string
    name: string | null
  }
}

interface UserMembership {
  role: string
  totalPoints: number
  rank: number
}

interface CurrentUser {
  id: string
  email: string
  name?: string | null
}

export default function LeagueDetailPage() {
  const [league, setLeague] = useState<League | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [userMembership, setUserMembership] = useState<UserMembership | null>(null)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const router = useRouter()
  const params = useParams()

  useEffect(() => {
    if (params?.id) {
      fetchLeagueData()
    }
  }, [params])

  const fetchLeagueData = async () => {
    try {
      // Fetch current user
      const userResponse = await fetch("/api/auth/me")
      if (userResponse.ok) {
        const userData = await userResponse.json()
        setCurrentUser(userData.user)
      } else {
        router.push("/login")
        return
      }

      // Fetch league data
      const response = await fetch(`/api/league/${params?.id}`)
      if (response.ok) {
        const data = await response.json()
        setLeague(data.league)
        setMembers(data.members)
        setUserMembership(data.userMembership)
      } else if (response.status === 403 || response.status === 404) {
        const data = await response.json()
        alert(data.error)
        router.push("/leagues")
      }
    } catch (error) {
      console.error("Error fetching league:", error)
    } finally {
      setLoading(false)
    }
  }

  const copyCode = () => {
    if (league) {
      navigator.clipboard.writeText(league.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-500/20 text-yellow-300 border-2 border-yellow-500/50'
    if (rank === 2) return 'bg-gray-400/20 text-gray-300 border-2 border-gray-400/50'
    if (rank === 3) return 'bg-orange-600/20 text-orange-300 border-2 border-orange-600/50'
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

  if (!league) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-red-950 py-8">
      <div className="container mx-auto px-4 max-w-5xl">
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
                {league.name}
              </h1>
            </div>
            <button
              onClick={() => router.push("/leagues")}
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              ← Back to Leagues
            </button>
          </div>
        </header>

        {/* League Info Card */}
        <div className="backdrop-blur-xl bg-white/5 p-6 rounded-3xl border border-white/10 shadow-2xl mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm text-gray-400 mb-2">League Details</h3>
              <div className="space-y-2">
                <p className="text-white">
                  <span className="text-gray-400">Season:</span> {league.seasonYear}
                </p>
                <p className="text-white">
                  <span className="text-gray-400">Created:</span> {new Date(league.createdAt).toLocaleDateString()}
                </p>
                <p className="text-white">
                  <span className="text-gray-400">Creator:</span> {league.creator.name || league.creator.email}
                </p>
              </div>
            </div>
            <div>
              <h3 className="text-sm text-gray-400 mb-2">Share League</h3>
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                  <p className="text-2xl font-mono tracking-widest text-white text-center">
                    {league.code}
                  </p>
                </div>
                <button
                  onClick={copyCode}
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white p-3 rounded-xl transition-all shadow-lg shadow-red-500/30"
                  title="Copy code"
                >
                  {copied ? (
                    <CheckIcon className="h-5 w-5" />
                  ) : (
                    <CopyIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Share this code to invite others to join
              </p>
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="backdrop-blur-xl bg-white/5 p-6 rounded-3xl border border-white/10 shadow-2xl mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center">
              <TrophyIcon className="h-7 w-7 mr-2 text-yellow-400" />
              League Rankings
            </h2>
            <span className="text-sm text-gray-400">Season {league.seasonYear}</span>
          </div>
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="backdrop-blur-xl p-4 rounded-2xl border transition-all bg-white/5 border-white/10 hover:bg-white/10"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${getRankBadgeColor(member.rank)}`}>
                      {member.rank}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-200">
                        {member.displayName}
                        {member.userId === currentUser?.id && (
                          <span className="ml-2 text-xs bg-red-500/30 px-2 py-1 rounded-full">
                            You
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-400">
                        Joined {new Date(member.joinedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-white">{member.totalPoints}</p>
                      <p className="text-xs text-gray-400">points</p>
                    </div>
                    {member.role === 'admin' && (
                      <span className="inline-block px-3 py-1 text-xs rounded-full bg-red-500/20 text-red-200 border border-red-500/30">
                        Admin
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* User's Stats */}
        {userMembership && (
          <div className="backdrop-blur-xl bg-red-500/10 p-6 rounded-3xl border border-red-500/30 shadow-lg shadow-red-500/20">
            <h3 className="text-xl font-bold text-white mb-4">Your Stats</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-white">{userMembership.rank}</p>
                <p className="text-sm text-gray-400">Rank</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-white">{userMembership.totalPoints}</p>
                <p className="text-sm text-gray-400">Points</p>
              </div>
              <div className="text-center">
                <span className={`inline-block px-3 py-1 text-xs rounded-full ${
                  userMembership.role === 'admin' 
                    ? 'bg-red-500/30 text-red-200' 
                    : 'bg-white/20 text-gray-200'
                }`}>
                  {userMembership.role}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

