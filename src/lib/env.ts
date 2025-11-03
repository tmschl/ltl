/**
 * Environment variable validation and configuration
 * Validates required env vars and provides defaults for development
 */

interface EnvConfig {
  DATABASE_URL: string
  NEXTAUTH_SECRET: string
  CRON_SECRET?: string
  NEXT_PUBLIC_BASE_URL?: string
}

function getEnvVar(key: string, defaultValue?: string, required = false): string {
  const value = process.env[key] || defaultValue

  if (required && !value) {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
      `Please set ${key} in your .env file or environment variables.`
    )
  }

  return value || ''
}

/**
 * Get and validate environment configuration
 * Throws clear errors if required variables are missing
 */
export function getEnv(): EnvConfig {
  const isProduction = process.env.NODE_ENV === 'production'

  // Required in all environments
  const DATABASE_URL = getEnvVar(
    'DATABASE_URL',
    isProduction ? undefined : 'file:./prisma/dev.db',
    true
  )

  const NEXTAUTH_SECRET = getEnvVar(
    'NEXTAUTH_SECRET',
    isProduction ? undefined : 'your-secret-key-change-in-production',
    isProduction // Required in production only
  )

  // Optional configuration
  const CRON_SECRET = getEnvVar('CRON_SECRET', undefined, false)
  const NEXT_PUBLIC_BASE_URL = getEnvVar('NEXT_PUBLIC_BASE_URL', undefined, false)

  return {
    DATABASE_URL,
    NEXTAUTH_SECRET,
    CRON_SECRET,
    NEXT_PUBLIC_BASE_URL
  }
}

/**
 * Validate environment variables on startup
 * Call this in your application entry point
 */
export function validateEnv(): void {
  try {
    getEnv()
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Environment validation failed:', error.message)
      process.exit(1)
    }
    throw error
  }
}

// Export validated env for convenience
export const env = getEnv()

