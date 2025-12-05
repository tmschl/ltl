import { PrismaClient } from '../src/generated/prisma/client'
import { hash } from 'bcryptjs'
import * as dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()

async function main() {
  console.log('Setting up Meijer League...')

  // 1. Create admin user if not exists
  const adminEmail = 'admin@example.com'
  let admin = await prisma.user.findUnique({
    where: { email: adminEmail }
  })

  if (!admin) {
    console.log('Admin user not found, creating...')
    const hashedPassword = await hash('password123', 12)
    admin = await prisma.user.create({
      data: {
        name: 'Admin',
        email: adminEmail,
        password: hashedPassword
      }
    })
  }
  console.log('Admin user:', admin.id)

  // 2. Create Meijer League
  let league = await prisma.league.findFirst({
    where: { 
      name: 'Meijer League',
      createdById: admin.id
    }
  })

  if (!league) {
    league = await prisma.league.create({
      data: {
        name: 'Meijer League',
        code: 'MEIJER24', // Short code for joining
        createdById: admin.id,
        seasonYear: 2024
      }
    })
    console.log('Created Meijer League')
  } else {
    console.log('Found existing Meijer League:', league.id)
  }

  // 3. Create 3 mock users for Meijer League
  const meijerUsers = [
    { name: 'Sarah', email: 'sarah@meijer.com', password: 'password123' },
    { name: 'Mike', email: 'mike@meijer.com', password: 'password123' },
    { name: 'Tom', email: 'tom@meijer.com', password: 'password123' }
  ]

  const createdUsers = []

  // Create admin membership first if not exists
  await prisma.leagueMembership.upsert({
    where: {
      leagueId_userId: {
        leagueId: league.id,
        userId: admin.id
      }
    },
    update: {
      role: 'admin',
      draftPosition: 1
    },
    create: {
      leagueId: league.id,
      userId: admin.id,
      role: 'admin',
      draftPosition: 1
    }
  })

  for (const u of meijerUsers) {
    // Create user or get existing
    let user = await prisma.user.findUnique({ where: { email: u.email } })
    if (!user) {
      const hashedPassword = await hash(u.password, 12)
      user = await prisma.user.create({
        data: {
          name: u.name,
          email: u.email,
          password: hashedPassword
        }
      })
      console.log(`Created user: ${user.email}`)
    } else {
      console.log(`Found user: ${user.email}`)
    }
    createdUsers.push(user)
  }

  // 4. Add users to Meijer League
  // Calculate draft positions: Admin is 1, then these 3 users
  const allUsers = [admin, ...createdUsers]
  
  for (let i = 0; i < createdUsers.length; i++) {
    const user = createdUsers[i]
    const position = i + 2 // Start at 2 because admin is 1
    
    await prisma.leagueMembership.upsert({
      where: {
        leagueId_userId: {
          leagueId: league.id,
          userId: user.id
        }
      },
      update: {
        role: 'member',
        draftPosition: position
      },
      create: {
        leagueId: league.id,
        userId: user.id,
        role: 'member',
        draftPosition: position
      }
    })
    console.log(`Added ${user.email} to Meijer League (position #${position})`)
  }

  console.log('Done! Meijer League setup complete with 4 users (1 admin + 3 members).')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

