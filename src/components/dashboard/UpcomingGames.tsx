"use client"

import { CalendarIcon, MapPinIcon } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"

interface Game {
  id: string
  opponent: string
  opponentLogo: string
  date: string
  time: string
  venue: string
  isHome: boolean
  isPast?: boolean
  redWingsScore?: number
  opponentScore?: number
}

export function UpcomingGames() {
  const router = useRouter()

  // Mock data - in production, this would come from an NHL API
  const games: Game[] = [
    {
      id: '0',
      opponent: 'Tampa Bay Lightning',
      opponentLogo:
        'https://upload.wikimedia.org/wikipedia/en/thumb/4/43/Tampa_Bay_Lightning_Logo_2011.svg/1200px-Tampa_Bay_Lightning_Logo_2011.svg.png',
      date: 'Jan 24',
      time: 'Final',
      venue: 'Little Caesars Arena',
      isHome: true,
      isPast: true,
      redWingsScore: 4,
      opponentScore: 2,
    },
    {
      id: '1',
      opponent: 'Toronto Maple Leafs',
      opponentLogo:
        'https://upload.wikimedia.org/wikipedia/en/thumb/b/b6/Toronto_Maple_Leafs_2016_logo.svg/1200px-Toronto_Maple_Leafs_2016_logo.svg.png',
      date: 'Tonight',
      time: '7:00 PM EST',
      venue: 'Little Caesars Arena',
      isHome: true,
    },
    {
      id: '2',
      opponent: 'Chicago Blackhawks',
      opponentLogo:
        'https://upload.wikimedia.org/wikipedia/en/thumb/2/29/Chicago_Blackhawks_logo.svg/1200px-Chicago_Blackhawks_logo.svg.png',
      date: 'Tomorrow',
      time: '7:30 PM EST',
      venue: 'United Center',
      isHome: false,
    },
  ]

  const handleGameClick = (game: Game) => {
    if (!game.isPast) {
      router.push(`/game/${game.id}`)
    }
  }

  return (
    <div className="backdrop-blur-xl bg-white/5 p-6 rounded-3xl border border-white/10 shadow-2xl">
      <h2 className="text-2xl font-bold text-white mb-6">Games</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {games.map((game, index) => (
          <div
            key={game.id}
            onClick={() => handleGameClick(game)}
            className={`backdrop-blur-xl p-4 rounded-2xl border transition-all ${index === 1 ? 'bg-red-500/20 border-red-500/50 shadow-lg shadow-red-500/20 scale-105' : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-red-500/30'} group ${!game.isPast ? 'cursor-pointer' : ''}`}
          >
            <div className="flex flex-col items-center text-center space-y-3">
              {game.isPast ? (
                <>
                  <div className="flex items-center justify-center space-x-4 w-full">
                    <div className="flex flex-col items-center">
                      <Image
                        src="https://upload.wikimedia.org/wikipedia/en/thumb/e/e0/Detroit_Red_Wings_logo.svg/1200px-Detroit_Red_Wings_logo.svg.png"
                        alt="Red Wings"
                        width={48}
                        height={48}
                        className="mb-2"
                      />
                      <span className="text-2xl font-bold text-white">
                        {game.redWingsScore}
                      </span>
                    </div>
                    <span className="text-gray-400 font-semibold">-</span>
                    <div className="flex flex-col items-center">
                      <Image
                        src={game.opponentLogo}
                        alt={game.opponent}
                        width={48}
                        height={48}
                        className="mb-2"
                      />
                      <span className="text-2xl font-bold text-white">
                        {game.opponentScore}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-white font-semibold">{game.opponent}</p>
                    <div className="flex items-center justify-center text-gray-400 text-sm mt-2">
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      {game.date} • {game.time}
                    </div>
                    <span
                      className={`mt-3 inline-block px-3 py-1 text-xs rounded-full ${(game.redWingsScore ?? 0) > (game.opponentScore ?? 0) ? 'bg-green-500/20 text-green-200 border border-green-500/30' : 'bg-red-500/20 text-red-200 border border-red-500/30'}`}
                    >
                      {(game.redWingsScore ?? 0) > (game.opponentScore ?? 0)
                        ? 'Win'
                        : 'Loss'}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center space-x-3">
                    <Image
                      src="https://upload.wikimedia.org/wikipedia/en/thumb/e/e0/Detroit_Red_Wings_logo.svg/1200px-Detroit_Red_Wings_logo.svg.png"
                      alt="Red Wings"
                      width={48}
                      height={48}
                    />
                    <span className="text-white font-semibold">vs</span>
                    <Image
                      src={game.opponentLogo}
                      alt={game.opponent}
                      width={48}
                      height={48}
                    />
                  </div>
                  <div>
                    <p className="text-white font-semibold">{game.opponent}</p>
                    <div className="flex items-center justify-center text-gray-400 text-sm mt-2">
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      {game.date} • {game.time}
                    </div>
                    <div className="flex items-center justify-center text-gray-400 text-sm mt-1">
                      <MapPinIcon className="h-4 w-4 mr-1" />
                      {game.venue}
                    </div>
                    <span
                      className={`mt-3 inline-block px-3 py-1 text-xs rounded-full ${game.isHome ? 'bg-red-500/20 text-red-200 border border-red-500/30' : 'bg-white/10 text-gray-300 border border-white/20'}`}
                    >
                      {game.isHome ? 'Home' : 'Away'}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

