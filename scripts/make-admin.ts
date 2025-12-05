import { PrismaClient } from '../src/generated/prisma/client'
import 'dotenv/config'

const prisma = new PrismaClient()

async function makeAdmin() {
  try {
    console.log('Making admin@example.com an admin in all leagues...')
    
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: 'admin@example.com' }
    })

    if (!user) {
      console.log('❌ User admin@example.com not found')
      process.exit(1)
    }

    console.log(`Found user: ${user.email}`)

    // Update all league memberships for this user to be admin
    const updated = await prisma.leagueMembership.updateMany({
      where: {
        userId: user.id
      },
      data: {
        role: 'admin'
      }
    })

    console.log(`✅ Updated ${updated.count} league memberships to admin role`)
    
    // Also unlock all picks
    console.log('Unlocking all picks...')
    const unlockedPicks = await prisma.pick.updateMany({
      where: {},
      data: {
        lockedAt: null
      }
    })
    console.log(`✅ Unlocked ${unlockedPicks.count} picks`)
    
  } catch (error) {
    console.error('Error making admin:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

makeAdmin()



