"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { TrophyIcon } from "lucide-react"

export default function CreateLeaguePage() {
  const [name, setName] = useState("")
  const [maxMembers, setMaxMembers] = useState<number | undefined>(undefined)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/league/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          maxMembers: maxMembers || null,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        router.push(`/league/${data.league.id}`)
      } else {
        const data = await response.json()
        setError(data.error || "Failed to create league")
      }
    } catch (error) {
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-red-950 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-red-700 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-700"></div>
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Glass card */}
        <div className="backdrop-blur-xl bg-white/10 p-8 rounded-3xl border border-white/20 shadow-2xl">
          <div className="text-center">
            <TrophyIcon className="mx-auto h-16 w-16 text-yellow-400 mb-4" />
            <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-red-200 bg-clip-text text-transparent">
              Create League
            </h2>
            <p className="mt-2 text-sm text-gray-300">
              Start your own fantasy league
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="sr-only">
                  League Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="appearance-none relative block w-full px-4 py-3 bg-white/5 border border-white/10 placeholder-gray-400 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent backdrop-blur-sm transition-all"
                  placeholder="League Name"
                />
              </div>

              <div>
                <label htmlFor="maxMembers" className="sr-only">
                  Max Members (Optional)
                </label>
                <input
                  id="maxMembers"
                  name="maxMembers"
                  type="number"
                  min="2"
                  value={maxMembers || ""}
                  onChange={(e) => setMaxMembers(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="appearance-none relative block w-full px-4 py-3 bg-white/5 border border-white/10 placeholder-gray-400 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent backdrop-blur-sm transition-all"
                  placeholder="Max Members (Optional)"
                />
                <p className="mt-1 text-xs text-gray-400">Leave empty for unlimited members</p>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl">
                <p className="text-sm text-red-200">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all shadow-lg shadow-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating..." : "Create League"}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => router.push("/leagues")}
                className="text-sm text-gray-300 hover:text-white transition-colors"
              >
                ← Back to My Leagues
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

