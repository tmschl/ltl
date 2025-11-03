import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Resetting picks and related data...')

  // Delete all picks
  const picksDeleted = await prisma.pick.deleteMany({})
  console.log(`✅ Deleted ${picksDeleted.count} picks`)

  // Reset all player performance records
  const performanceDeleted = await prisma.playerPerformance.deleteMany({})
  console.log(`✅ Deleted ${performanceDeleted.count} player performance records`)

  // Reset all league membership points to 0
  const membershipsReset = await prisma.leagueMembership.updateMany({
    data: {
      totalPoints: 0
    }
  })
  console.log(`✅ Reset ${membershipsReset.count} league membership points to 0`)

  // Reset game statuses to scheduled (if they were final)
  const gamesReset = await prisma.game.updateMany({
    where: {
      status: 'final'
    },
    data: {
      status: 'scheduled',
      homeScore: null,
      awayScore: null
    }
  })
  console.log(`✅ Reset ${gamesReset.count} games from final to scheduled`)

  console.log('\n✨ Reset completed successfully!')
  console.log('📝 Ready for mock testing workflow')
}

main()
  .catch((e) => {
    console.error('❌ Error resetting data:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

