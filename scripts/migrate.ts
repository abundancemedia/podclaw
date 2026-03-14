/**
 * Run database migrations against Neon Postgres.
 * Usage: npx tsx scripts/migrate.ts
 * Requires DATABASE_URL env var.
 */
import { neon } from '@neondatabase/serverless'

async function migrate() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not set')
    process.exit(1)
  }

  const sql = neon(databaseUrl)

  console.log('🔄 Running PodClaw Phase 1 migration...')

  try {
    // Create shows table
    await sql`
      CREATE TABLE IF NOT EXISTS shows (
        id TEXT PRIMARY KEY,
        api_key TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        language TEXT DEFAULT 'en',
        author TEXT NOT NULL,
        owner_name TEXT NOT NULL,
        owner_email TEXT NOT NULL,
        image_url TEXT,
        category TEXT NOT NULL,
        subcategory TEXT,
        explicit BOOLEAN DEFAULT false,
        website_url TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `
    console.log('  ✅ shows table')

    // Create episodes table
    await sql`
      CREATE TABLE IF NOT EXISTS episodes (
        id TEXT PRIMARY KEY,
        show_id TEXT NOT NULL REFERENCES shows(id),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        audio_url TEXT NOT NULL,
        audio_length INTEGER,
        audio_type TEXT DEFAULT 'audio/mpeg',
        duration INTEGER,
        explicit BOOLEAN DEFAULT false,
        episode_type TEXT DEFAULT 'full',
        season INTEGER,
        episode_number INTEGER,
        pub_date TIMESTAMPTZ DEFAULT now(),
        guid TEXT UNIQUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `
    console.log('  ✅ episodes table')

    // Create api_keys table
    await sql`
      CREATE TABLE IF NOT EXISTS api_keys (
        key TEXT PRIMARY KEY,
        show_id TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `
    console.log('  ✅ api_keys table')

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_episodes_show ON episodes(show_id)`
    console.log('  ✅ idx_episodes_show index')

    await sql`CREATE INDEX IF NOT EXISTS idx_api_keys_show ON api_keys(show_id)`
    console.log('  ✅ idx_api_keys_show index')

    console.log('✅ Migration complete — 3 tables, 2 indexes')
  } catch (err: any) {
    console.error('❌ Migration failed:', err.message)
    process.exit(1)
  }
}

migrate()
