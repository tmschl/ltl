"use client"

import { useState, useEffect } from "react"
import { CheckIcon, ClockIcon, TrophyIcon, LockIcon } from "lucide-react"

interface Player {
  id: string
  name: string
  number: number | null
  position: string
}

interface Member {
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
  isCurrentUser?: boolean
}

interface LeagueMembersProps {
  members: Member[]
  nextGame?: {
    id: string
    isLocked: boolean
  } | null
  players: Player[]
  onMakePick: (targetUserId: string, playerId: string | null, playerName: string, pickType: string) => void
  isAdmin: boolean
  submittingPicks: Set<string>
}

export function LeagueMembers({ members, nextGame, players, onMakePick, isAdmin, submittingPicks }: LeagueMembersProps) {
  if (!members || members.length === 0) {
    return (
      <div className="backdrop-blur-xl bg-white/5 p-6 rounded-3xl border border-white/10 shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-4">League Members</h2>
        <p className="text-gray-400">No members in this league.</p>
      </div>
    )
  }

  const getStatusIcon = (member: Member) => {
    if (member.hasPicked) {
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500/20 text-green-300 border border-green-500/50">
          <CheckIcon className="h-4 w-4" />
        </div>
      )
    }

    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/50">
        <ClockIcon className="h-4 w-4" />
      </div>
    )
  }

  const getStatusText = (member: Member) => {
    if (member.hasPicked) {
      return `Picked: ${member.pick?.playerName || 'Unknown'}`
    }

    return "Pending"
  }

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-500/20 text-yellow-300 border-2 border-yellow-500/50'
    if (rank === 2) return 'bg-gray-400/20 text-gray-300 border-2 border-gray-400/50'
    if (rank === 3) return 'bg-orange-600/20 text-orange-300 border-2 border-orange-600/50'
    return 'bg-white/10 text-gray-300'
  }

  return (
    <div className="backdrop-blur-xl bg-white/5 p-6 rounded-3xl border border-white/10 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center">
          <TrophyIcon className="h-6 w-6 mr-2 text-yellow-400" />
          League Members
        </h2>
        <span className="text-sm text-gray-400">{members.length} member{members.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="space-y-3">
        {members.map((member) => {
          const isSubmitting = submittingPicks.has(member.userId)
          const currentPick = member.pick
          
          // Use local state to track dropdown value to prevent reset
          const savedValue = currentPick?.pickType === "team" ? "team" : (currentPick?.playerId || "")
          
          return (
            <div
              key={member.userId}
              className={`backdrop-blur-xl p-4 rounded-2xl border transition-all ${
                member.isCurrentUser 
                  ? 'bg-red-500/20 border-red-500/50 shadow-lg shadow-red-500/20' 
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-4 flex-1">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm ${getRankBadgeColor(member.rank)}`}
                  >
                    {member.rank}
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold ${member.isCurrentUser ? 'text-white' : 'text-gray-200'}`}>
                      {member.displayName}
                      {member.isCurrentUser && (
                        <span className="ml-2 text-xs bg-red-500/30 px-2 py-1 rounded-full">
                          You
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-400">
                      {getStatusText(member)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  {getStatusIcon(member)}
                  <div className="text-right">
                    <p className="text-xl font-bold text-white">{member.totalPoints}</p>
                    <p className="text-xs text-gray-400">points</p>
                  </div>
                </div>
              </div>
              
              {/* Pick Dropdown with Submit Button */}
              <MemberPickSelector
                member={member}
                currentPick={currentPick}
                savedValue={savedValue}
                players={players}
                isSubmitting={isSubmitting}
                isAdmin={isAdmin}
                nextGame={nextGame}
                onMakePick={onMakePick}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Separate component for pick selector to properly manage state
function MemberPickSelector({
  member,
  currentPick,
  savedValue,
  players,
  isSubmitting,
  isAdmin,
  nextGame,
  onMakePick
}: {
  member: Member
  currentPick?: { playerId: string | null; playerName: string; playerNumber: number | null; pickType: string }
  savedValue: string
  players: Player[]
  isSubmitting: boolean
  isAdmin: boolean
  nextGame?: { id: string; isLocked: boolean } | null
  onMakePick: (targetUserId: string, playerId: string | null, playerName: string, pickType: string) => void
}) {
  const [localValue, setLocalValue] = useState<string>(savedValue)
  
  // Sync local value when saved pick changes
  useEffect(() => {
    setLocalValue(savedValue)
  }, [savedValue])
  
  const isButtonDisabled = isSubmitting || 
    member.hasPicked ||
    !localValue || 
    localValue === "" ||
    (!isAdmin && !member.isCurrentUser && nextGame?.isLocked)
  
  // Only show pick selector if user can pick (current user or admin)
  const canPick = member.isCurrentUser || isAdmin
  
  if (!canPick || !nextGame) {
    return null
  }
  
  return (
    <div className="flex items-center space-x-2 mt-3">
      <select
        value={localValue}
        onChange={(e) => {
          if (!member.hasPicked) {
            setLocalValue(e.target.value)
          }
        }}
        disabled={isSubmitting || member.hasPicked || (!isAdmin && !member.isCurrentUser && nextGame?.isLocked)}
        className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="">Select player or team...</option>
        <option value="team">Detroit Red Wings (Team)</option>
        {players.map((player) => (
          <option key={player.id} value={player.id}>
            {player.name} {player.number ? `#${player.number}` : ""} ({player.position})
          </option>
        ))}
      </select>
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          
          if (member.hasPicked) {
            alert("This pick has already been submitted and locked.")
            return
          }
          
          if (!localValue || localValue === "") {
            alert("Please select a player or team before submitting.")
            return
          }
          
          if (!isAdmin && !member.isCurrentUser && nextGame?.isLocked) {
            alert("Picks are locked for this game.")
            return
          }
          
          if (localValue === "team") {
            onMakePick(member.userId, null, "Detroit Red Wings (Team)", "team")
          } else {
            const selectedPlayer = players.find(p => p.id === localValue)
            if (selectedPlayer) {
              onMakePick(member.userId, selectedPlayer.id, selectedPlayer.name, "player")
            } else {
              alert("Selected player not found. Please try again.")
            }
          }
        }}
        disabled={isButtonDisabled || !onMakePick}
        className={`px-4 py-2 rounded-xl font-medium transition-all shadow-lg disabled:cursor-not-allowed ${
          member.hasPicked
            ? "bg-gray-600 text-gray-300 cursor-not-allowed"
            : "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-red-500/30"
        } disabled:opacity-50`}
      >
        {isSubmitting ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        ) : member.hasPicked ? (
          <LockIcon className="h-4 w-4" />
        ) : (
          "Submit"
        )}
      </button>
    </div>
  )
}

