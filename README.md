# 🏮 Light The Lamp

A Next.js fantasy hockey pick 'em game for the Detroit Red Wings. Pick players, simulate games, and compete with friends!

## Tech Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS v4** - Utility-first CSS framework
- **Prisma** - Database ORM with SQLite
- **NHL API** - Real-time game data and rosters

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **Git** - [Download here](https://git-scm.com/)

## Step-by-Step Setup

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd light-the-lamp
```

### Step 2: Install Dependencies

Install all required npm packages:

```bash
npm install
```

This will install:
- Next.js and React
- Prisma and Prisma Client
- Tailwind CSS
- TypeScript
- Lucide React (icons)
- And other dependencies

### Step 3: Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
# Create .env file
touch .env
```

Add the following to `.env`:

```env
# Database
DATABASE_URL="file:./dev.db"
```

**Note:** The database file will be created automatically in the `prisma/` directory when you run migrations.

### Step 4: Set Up the Database

Generate the Prisma Client and run migrations:

```bash
# Generate Prisma Client
npm run prisma:generate

# Create and apply database migrations
npm run prisma:migrate
```

This will:
- Create the SQLite database file at `prisma/dev.db`
- Create all tables (User, Pick, UserScore)
- Set up indexes and relationships

**Alternative:** If you just want to push the schema without creating a migration:

```bash
npx prisma db push
```

### Step 5: Verify Database Setup (Optional)

Open Prisma Studio to view your database:

```bash
npm run prisma:studio
```

This opens a web interface at `http://localhost:5555` where you can:
- View all tables
- Add/edit/delete records
- Inspect data

Press `Ctrl+C` to stop Prisma Studio when done.

### Step 6: Start the Development Server

Start the Next.js development server:

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

### Step 7: Open in Browser

Open your browser and navigate to:

```
http://localhost:3000
```

You should see the Light The Lamp home page!

## Project Structure

```
light-the-lamp/
├── prisma/
│   ├── schema.prisma          # Database schema (User, Pick, UserScore)
│   ├── migrations/            # Database migration files
│   └── dev.db                 # SQLite database (created after migration)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── nhl/           # NHL API routes (game, roster)
│   │   ├── dashboard/         # Dashboard page
│   │   ├── login/             # Login page
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Home page
│   ├── components/
│   │   ├── dashboard/         # Dashboard components
│   │   └── layout/           # Layout components (Navbar)
│   ├── contexts/
│   │   ├── AuthContext.tsx   # Authentication context
│   │   └── GameContext.tsx   # Game state management
│   └── lib/
│       ├── nhlApi.ts         # NHL API client
│       ├── prisma.ts         # Prisma client singleton
│       ├── gameSimulator.ts  # Game simulation logic
│       └── types.ts          # TypeScript types
├── .env                       # Environment variables (create this)
├── package.json              # Dependencies and scripts
├── next.config.ts            # Next.js configuration
├── tsconfig.json             # TypeScript configuration
└── tailwind.config.js        # Tailwind CSS configuration
```

## Available Scripts

### Development

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Database (Prisma)

```bash
npm run prisma:generate   # Generate Prisma Client
npm run prisma:migrate    # Create and apply migrations
npm run prisma:studio     # Open Prisma Studio (database GUI)
```

### Manual Prisma Commands

```bash
npx prisma generate              # Generate Prisma Client
npx prisma migrate dev           # Create migration and apply
npx prisma migrate dev --name <name>  # Create named migration
npx prisma db push               # Push schema changes (no migration)
npx prisma studio                # Open Prisma Studio
npx prisma format                # Format schema file
```

## Database Schema

The app uses a minimal schema with 3 models:

### User
- Stores user information (id, name, email)
- One-to-one relationship with UserScore
- One-to-many relationship with Pick

### Pick
- Stores user picks for games
- References external `gameId` from NHL API
- `playerId` can be a player ID or `'team'`
- Unique constraint: one pick per user per game

### UserScore
- Stores cumulative season points per user
- Updated after each game simulation

## Troubleshooting

### Database Issues

**Problem:** `Error: P1001: Can't reach database server`

**Solution:** Make sure you've run migrations:
```bash
npm run prisma:migrate
```

**Problem:** `Error: Migration failed`

**Solution:** Reset the database (⚠️ **WARNING:** This deletes all data):
```bash
npx prisma migrate reset
```

### Port Already in Use

**Problem:** `Error: Port 3000 is already in use`

**Solution:** Use a different port:
```bash
PORT=3001 npm run dev
```

### Prisma Client Not Generated

**Problem:** `Error: Cannot find module '@prisma/client'`

**Solution:** Generate Prisma Client:
```bash
npm run prisma:generate
```

### Module Not Found Errors

**Problem:** Import errors after adding new files

**Solution:** Restart the dev server:
```bash
# Stop the server (Ctrl+C) and restart
npm run dev
```

## Development Tips

1. **Hot Reload**: Next.js automatically reloads when you save files
2. **TypeScript Errors**: Check the terminal for type errors
3. **Database Changes**: After modifying `schema.prisma`, run `npm run prisma:migrate`
4. **View Database**: Use `npm run prisma:studio` to inspect data
5. **API Routes**: Test API routes at `http://localhost:3000/api/nhl/game` and `/api/nhl/roster`

## Next Steps

Once the app is running:

1. Navigate to the dashboard
2. The app will automatically fetch tonight's Red Wings game from the NHL API
3. The current roster will be loaded automatically
4. Start making picks and simulating games!

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [NHL API Reference](https://github.com/Zmalski/NHL-API-Reference)

## Support

If you encounter issues:

1. Check that all prerequisites are installed
2. Verify `.env` file exists with `DATABASE_URL`
3. Ensure migrations have been run
4. Check the terminal for error messages
5. Try resetting the database (⚠️ deletes data): `npx prisma migrate reset`
