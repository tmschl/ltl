import { PrismaClient } from '../src/generated/prisma/client'
import 'dotenv/config'

const prisma = new PrismaClient()

async function cleanGames() {
  try {
    console.log('Cleaning up all games...')
    
    // Delete all picks first (foreign key constraint)
    const deletedPicks = await prisma.pick.deleteMany({})
    console.log(`Deleted ${deletedPicks.count} picks`)
    
    // Delete all player performances
    const deletedPerformances = await prisma.playerPerformance.deleteMany({})
    console.log(`Deleted ${deletedPerformances.count} player performances`)
    
    // Delete all games
    const deletedGames = await prisma.game.deleteMany({})
    console.log(`Deleted ${deletedGames.count} games`)
    
    console.log('✅ All games cleaned up successfully!')
  } catch (error) {
    console.error('Error cleaning games:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

cleanGames()

