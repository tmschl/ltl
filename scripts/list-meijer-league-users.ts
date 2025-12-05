import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Looking for users in "meijer" league...\n')

  // Find the meijer league (case-insensitive search)
  const allLeagues = await prisma.league.findMany({
    include: {
      memberships: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              password: true,
              createdAt: true
            }
          }
        }
      }
    }
  })
  const league = allLeagues.find(l => l.name.toLowerCase() === 'meijer')

  if (!league) {
    console.log('❌ No league found with name "meijer"')
    
    // Try to find by code
    const leagueByCode = allLeagues.find(l => l.code.toLowerCase() === 'meijer')
    
    if (leagueByCode) {
      console.log(`ℹ️  Found league by code: ${leagueByCode.name} (${leagueByCode.code})`)
      console.log('   Please run again, or check if the league name is different\n')
    } else {
      console.log('\n📋 Available leagues:')
      allLeagues.forEach(l => {
        console.log(`   - ${l.name} (${l.code})`)
      })
    }
    return
  }

  console.log(`✅ Found league: ${league.name} (${league.code})`)
  console.log(`👥 Members: ${league.memberships.length}\n`)
  console.log('='.repeat(60))
  console.log('📧 EMAIL AND PASSWORD INFORMATION')
  console.log('='.repeat(60))
  console.log()

  const commonPasswords = ['password123', 'password', '123456', 'admin', 'test123']

  for (const membership of league.memberships) {
    const user = membership.user
    console.log(`👤 User: ${user.name || 'No name'}`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Password Hash: ${user.password}`)
    
    // Try to match against common passwords
    let matchedPassword: string | null = null
    for (const testPassword of commonPasswords) {
      const matches = await bcrypt.compare(testPassword, user.password)
      if (matches) {
        matchedPassword = testPassword
        break
      }
    }
    
    if (matchedPassword) {
      console.log(`   ✅ Password: ${matchedPassword}`)
    } else {
      console.log(`   ⚠️  Password: [HASHED - Unable to determine]`)
      console.log(`      Try common passwords like: password123, password, 123456, admin, test123`)
    }
    
    console.log(`   Created: ${user.createdAt.toLocaleString()}`)
    console.log()
  }

  console.log('='.repeat(60))
  console.log('\n💡 Note: If password is hashed and you cannot determine it,')
  console.log('   you may need to reset passwords or check with the users.')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

