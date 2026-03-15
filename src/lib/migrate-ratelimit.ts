/**
 * Migration — Add plan column to api_keys, create rate_limits table
 */
import { neon } from '@neondatabase/serverless'

async function migrate() {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) throw new Error('DATABASE_URL not set')

  const sql = neon(dbUrl)

  console.log('Rate limit migration starting...')

  // 1. Add plan column to api_keys
  await sql`ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free'`
  console.log('✅ plan column added to api_keys')

  // 2. Create rate_limits table for request-per-minute tracking
  await sql`
    CREATE TABLE IF NOT EXISTS rate_limits (
      api_key TEXT NOT NULL,
      time_window TEXT NOT NULL,
      count INTEGER DEFAULT 1,
      PRIMARY KEY (api_key, time_window)
    )
  `
  console.log('✅ rate_limits table created')

  // 3. Index for cleanup
  await sql`CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(time_window)`
  console.log('✅ index created')

  console.log('Migration complete!')
}

migrate().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
