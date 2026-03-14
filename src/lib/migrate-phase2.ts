/**
 * Phase 2 Migration — Add status to shows, create distributions table
 */
import { neon } from '@neondatabase/serverless'

async function migrate() {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) throw new Error('DATABASE_URL not set')

  const sql = neon(dbUrl)

  console.log('Phase 2 migration starting...')

  // 1. Add status column to shows
  console.log('Adding status column to shows...')
  await sql`ALTER TABLE shows ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft'`
  console.log('✅ status column added')

  // 2. Create distributions table
  console.log('Creating distributions table...')
  await sql`
    CREATE TABLE IF NOT EXISTS distributions (
      id TEXT PRIMARY KEY,
      show_id TEXT NOT NULL REFERENCES shows(id),
      directory TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      submit_url TEXT,
      instructions TEXT,
      submitted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(show_id, directory)
    )
  `
  console.log('✅ distributions table created')

  // 3. Create index
  await sql`CREATE INDEX IF NOT EXISTS idx_distributions_show ON distributions(show_id)`
  console.log('✅ index created')

  // 4. Create validations table to store go-live check results
  console.log('Creating validations table...')
  await sql`
    CREATE TABLE IF NOT EXISTS validations (
      id TEXT PRIMARY KEY,
      show_id TEXT NOT NULL REFERENCES shows(id),
      passed BOOLEAN NOT NULL,
      checks JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_validations_show ON validations(show_id)`
  console.log('✅ validations table created')

  console.log('Phase 2 migration complete!')
}

migrate().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
