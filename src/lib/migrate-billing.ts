/**
 * Migration — Add Stripe billing columns to api_keys
 */
import { neon } from '@neondatabase/serverless'

async function migrate() {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) throw new Error('DATABASE_URL not set')

  const sql = neon(dbUrl)

  console.log('Billing migration starting...')

  await sql`ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT`
  console.log('✅ stripe_customer_id added')

  await sql`ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT`
  console.log('✅ stripe_subscription_id added')

  await sql`CREATE INDEX IF NOT EXISTS idx_api_keys_stripe_customer ON api_keys(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL`
  console.log('✅ stripe_customer_id index created')

  console.log('Migration complete!')
}

migrate().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
