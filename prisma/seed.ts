import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Hash password once (all users will use the same password for dev)
  const password = 'password123'
  const hashedPassword = await bcrypt.hash(password, 12)

  // Test users to seed
  const users = [
    {
      email: 'test@example.com',
      name: 'Test User',
      password: hashedPassword,
    },
    {
      email: 'admin@example.com',
      name: 'Admin User',
      password: hashedPassword,
    },
    {
      email: 'user@example.com',
      name: null, // Test optional name field
      password: hashedPassword,
    },
    {
      email: 'demo@example.com',
      name: 'Demo User',
      password: hashedPassword,
    },
  ]

  // Use upsert to avoid duplicate key errors (idempotent)
  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        password: user.password,
      },
      create: user,
    })
    console.log(`✅ Seeded user: ${user.email} (${user.name || 'no name'})`)
  }

  // Red Wings players to seed
  const redWingsPlayers = [
    { name: 'Dylan Larkin', number: 71, position: 'Forward' },
    { name: 'Patrick Kane', number: 88, position: 'Forward' },
    { name: 'Alex DeBrincat', number: 93, position: 'Forward' },
    { name: 'Lucas Raymond', number: 23, position: 'Forward' },
    { name: 'David Perron', number: 57, position: 'Forward' },
    { name: 'Andrew Copp', number: 18, position: 'Forward' },
    { name: 'J.T. Compher', number: 37, position: 'Forward' },
    { name: 'Robby Fabbri', number: 14, position: 'Forward' },
    { name: 'Michael Rasmussen', number: 27, position: 'Forward' },
    { name: 'Joe Veleno', number: 90, position: 'Forward' },
    { name: 'Christian Fischer', number: 36, position: 'Forward' },
    { name: 'Daniel Sprong', number: 17, position: 'Forward' },
    { name: 'Moritz Seider', number: 53, position: 'Defense' },
    { name: 'Ben Chiarot', number: 8, position: 'Defense' },
    { name: 'Jake Walman', number: 96, position: 'Defense' },
    { name: 'Jeff Petry', number: 26, position: 'Defense' },
    { name: 'Shayne Gostisbehere', number: 41, position: 'Defense' },
    { name: 'Justin Holl', number: 3, position: 'Defense' },
    { name: 'Olli Maatta', number: 2, position: 'Defense' },
    { name: 'Alex Lyon', number: 34, position: 'Goalie' },
    { name: 'James Reimer', number: 47, position: 'Goalie' },
  ]

  console.log('\n🏒 Seeding Red Wings players...')
  for (const player of redWingsPlayers) {
    await prisma.player.upsert({
      where: { 
        name_number: {
          name: player.name,
          number: player.number
        }
      },
      update: {},
      create: player,
    })
    console.log(`✅ Seeded player: ${player.number} - ${player.name} (${player.position})`)
  }

  console.log('\n✨ Seed completed successfully!')
  console.log(`📧 Test credentials: Any user with password "${password}"`)
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

