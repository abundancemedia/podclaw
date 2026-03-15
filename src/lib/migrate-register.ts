/**
 * Migration — Add email column to api_keys for self-service registration
 */
import { neon } from '@neondatabase/serverless'

async function migrate() {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) throw new Error('DATABASE_URL not set')

  const sql = neon(dbUrl)

  console.log('Register migration starting...')

  await sql`ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS email TEXT`
  console.log('✅ email column added to api_keys')

  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_email ON api_keys(email) WHERE email IS NOT NULL`
  console.log('✅ unique index on email created')

  console.log('Migration complete!')
}

migrate().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
