# 🏮 Light The Lamp

A Next.js fantasy hockey pick'em game for Detroit Red Wings fans. Pick players before each game and earn points based on their performance!

## Tech Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Prisma** - Database ORM with SQLite
- **ESLint** - Code linting and formatting
- **NHL API** - Real-time game data and player statistics

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="file:./prisma/dev.db"
   NEXTAUTH_SECRET="your-secret-key-change-in-production"
   CRON_SECRET="optional-cron-secret-for-production"
   NEXT_PUBLIC_BASE_URL="http://localhost:3000"
   ```

4. Set up the database:
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                 # Next.js App Router pages
├── lib/                 # Utility functions and configurations
│   └── prisma.ts       # Prisma client configuration
└── generated/           # Generated Prisma client
prisma/
├── schema.prisma       # Database schema
└── migrations/         # Database migrations
```

## Environment Variables

### Required

- `DATABASE_URL` - Database connection string (defaults to `file:./prisma/dev.db` in development)
- `NEXTAUTH_SECRET` - Secret key for JWT token signing (required in production)

### Optional

- `CRON_SECRET` - Secret for protecting cron job endpoints (recommended in production)
- `NEXT_PUBLIC_BASE_URL` - Base URL of your application (for cron jobs calling internal APIs)
- `USE_MOCK_NHL_API` - Set to `true` to use mock NHL API data (for development/testing)

### Example `.env` file

```env
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_SECRET="your-secret-key-change-in-production"
CRON_SECRET="your-cron-secret"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

## Database

This project uses SQLite with Prisma ORM. The database file (`dev.db`) is created automatically when you run the first migration.

### Useful Prisma Commands

- `npx prisma studio` - Open Prisma Studio to view/edit data
- `npx prisma generate` - Generate Prisma client
- `npx prisma migrate dev` - Create and apply migrations
- `npx prisma db push` - Push schema changes to database

## Cron Jobs

The application uses automated background jobs to keep game data and scores up to date:

### Available Cron Jobs

1. **Update Game Status** (`/api/cron/update-game-status`)
   - Updates game statuses from `scheduled` → `in_progress` → `final`
   - Runs every 5 minutes
   - Updates scores when available

2. **Sync Player Performance** (`/api/cron/sync-player-performance`)
   - Syncs player statistics from NHL API for active/completed games
   - Runs every 15 minutes
   - Updates `PlayerPerformance` records

3. **Calculate Points** (`/api/cron/calculate-points`)
   - Calculates points for all picks in completed games
   - Runs every 15 minutes
   - Updates pick points and league standings

### Vercel Deployment

If deploying to Vercel, cron jobs are automatically configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/update-game-status",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/sync-player-performance",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/cron/calculate-points",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

### External Cron Services

If not using Vercel, set up external cron jobs:

1. **cron-job.org** or **EasyCron**
   - Create cron jobs that call your API endpoints
   - Set schedules:
     - Update game status: Every 5 minutes
     - Sync player performance: Every 15 minutes
     - Calculate points: Every 15 minutes

2. **GitHub Actions** (for GitHub-hosted projects)
   ```yaml
   name: Update Game Status
   on:
     schedule:
       - cron: '*/5 * * * *'
   jobs:
     update:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v2
         - run: curl -X GET https://your-domain.com/api/cron/update-game-status
   ```

3. **Manual Testing**
   ```bash
   curl -X GET http://localhost:3000/api/cron/update-game-status
   curl -X GET http://localhost:3000/api/cron/sync-player-performance
   curl -X GET http://localhost:3000/api/cron/calculate-points
   ```

### Cron Security

If `CRON_SECRET` is set, cron endpoints require authentication:

```bash
curl -X GET https://your-domain.com/api/cron/update-game-status \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## NHL API Integration

The application integrates with the NHL API to fetch:
- Game schedules and scores
- Player rosters
- Game boxscores and player statistics
- Real-time game status updates

### API Endpoints Used

- `https://api-web.nhle.com/v1/schedule/{date}` - Game schedules
- `https://api-web.nhle.com/v1/roster/{team}/{season}` - Team rosters
- `https://api-web.nhle.com/v1/gamecenter/{gameId}/boxscore` - Game boxscores

### Manual Sync Commands

You can manually sync data via API endpoints:

```bash
# Sync games
curl -X POST http://localhost:3000/api/games/sync

# Sync players
curl -X POST http://localhost:3000/api/players/sync

# Sync player performance for a specific game
curl -X POST http://localhost:3000/api/players/sync-performance \
  -H "Content-Type: application/json" \
  -d '{"gameId": "game-id-here"}'

# Calculate points for a completed game
curl -X POST http://localhost:3000/api/pick/calculate \
  -H "Content-Type: application/json" \
  -d '{"gameId": "game-id-here"}'
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy - cron jobs will be automatically configured

### Other Platforms

For other platforms (AWS, Railway, etc.):

1. Set environment variables
2. Configure external cron jobs (see above)
3. Ensure database is accessible (consider PostgreSQL for production)
4. Update `DATABASE_URL` for production database

### Production Considerations

- Use PostgreSQL or another production database instead of SQLite
- Set strong `NEXTAUTH_SECRET` and `CRON_SECRET` values
- Configure `NEXT_PUBLIC_BASE_URL` to your production domain
- Set up monitoring and error alerting for cron jobs
- Consider rate limiting for NHL API calls

## Development

- The project uses TypeScript for type safety
- Tailwind CSS is configured for styling
- ESLint is set up for code quality
- Hot reload is enabled for development

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)