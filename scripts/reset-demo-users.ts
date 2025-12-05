import { PrismaClient } from '../src/generated/prisma/client'
import { hash } from 'bcryptjs'
import * as dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()

async function main() {
  console.log('Resetting demo users...')

  // 1. Keep admin, delete everyone else
  const adminEmail = 'admin@example.com'
  
  // Find admin user
  const admin = await prisma.user.findUnique({
    where: { email: adminEmail }
  })

  if (!admin) {
    console.log('Admin user not found, please run make-admin.ts first or create it.')
    return
  }

  console.log('Found admin:', admin.id)

  // Delete other users
  // We must delete dependent records first
  
  // 0. Delete leagues created by other users (and their cascade)
  const otherUserLeagues = await prisma.league.findMany({
    where: {
      creator: {
        email: {
          not: adminEmail
        }
      }
    }
  })

  for (const l of otherUserLeagues) {
    // Delete memberships in this league
    await prisma.leagueMembership.deleteMany({ where: { leagueId: l.id } })
    // Delete picks in this league
    await prisma.pick.deleteMany({ where: { leagueId: l.id } })
    // Delete league
    await prisma.league.delete({ where: { id: l.id } })
    console.log(`Deleted league ${l.name} created by other user`)
  }

  // 1. Delete picks by other users (in any other leagues)
  await prisma.pick.deleteMany({
    where: {
      user: {
        email: {
          not: adminEmail
        }
      }
    }
  })
  console.log('Deleted picks for other users')

  // 2. Delete memberships for other users
  await prisma.leagueMembership.deleteMany({
    where: {
      user: {
        email: {
          not: adminEmail
        }
      }
    }
  })
  console.log('Deleted memberships for other users')

  // 3. Delete users
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      email: {
        not: adminEmail
      }
    }
  })
  
  console.log(`Deleted ${deletedUsers.count} other users.`)

  // 2. Create 2 mock users
  const mockUsers = [
    { name: 'Alice', email: 'alice@example.com', password: 'password123' },
    { name: 'Bob', email: 'bob@example.com', password: 'password123' }
  ]

  const createdUsers = []

  for (const u of mockUsers) {
    const hashedPassword = await hash(u.password, 12)
    const user = await prisma.user.create({
      data: {
        name: u.name,
        email: u.email,
        password: hashedPassword
      }
    })
    createdUsers.push(user)
    console.log(`Created user: ${user.email}`)
  }

  // 3. Ensure a league exists and all 3 are in it
  let league = await prisma.league.findFirst({
    where: { createdById: admin.id }
  })

  if (!league) {
    league = await prisma.league.create({
      data: {
        name: 'Demo League',
        code: 'DEMO123',
        createdById: admin.id,
        seasonYear: 2024
      }
    })
    console.log('Created new league')
  } else {
    console.log('Using existing league:', league.name)
  }

  // 4. Add memberships
  const allUsers = [admin, ...createdUsers]
  
  for (const user of allUsers) {
    const role = user.id === admin.id ? 'admin' : 'member'
    const index = allUsers.indexOf(user)
    
    await prisma.leagueMembership.upsert({
      where: {
        leagueId_userId: {
          leagueId: league.id,
          userId: user.id
        }
      },
      update: {
        role,
        draftPosition: index + 1
      },
      create: {
        leagueId: league.id,
        userId: user.id,
        role,
        draftPosition: index + 1
      }
    })
    console.log(`Added ${user.email} to league as ${role} (position #${index + 1})`)
  }

  console.log('Done! You now have 3 users in the league.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
