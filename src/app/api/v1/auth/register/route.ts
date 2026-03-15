import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { randomUUID, randomBytes } from 'crypto'

/**
 * POST /api/v1/auth/register — Self-service API key provisioning
 *
 * No auth required. Takes an email, returns an API key.
 * One key per email. Re-registering the same email returns the existing key.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate email
    if (!body.email || typeof body.email !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: email' },
        { status: 400 }
      )
    }

    const email = body.email.trim().toLowerCase()
    if (!email.includes('@') || !email.includes('.')) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const sql = getDb()

    // Check if email already has a key
    const existing = await sql`
      SELECT key FROM api_keys WHERE email = ${email}
    `

    if (existing.length > 0) {
      return NextResponse.json({
        api_key: existing[0].key,
        email,
        message: 'Existing API key returned. Store this securely — it will not be shown again after this response.',
        docs: 'https://podclaw.vercel.app/api/v1/openapi.json'
      })
    }

    // Generate a new API key
    const apiKey = `pk_live_${randomBytes(24).toString('hex')}`

    await sql`
      INSERT INTO api_keys (key, email, show_id)
      VALUES (${apiKey}, ${email}, NULL)
    `

    return NextResponse.json({
      api_key: apiKey,
      email,
      message: 'API key created. Store this securely — it will not be shown again after this response.',
      docs: 'https://podclaw.vercel.app/api/v1/openapi.json',
      quickstart: {
        step_1: 'Create a show: POST /api/v1/shows with Authorization: Bearer <your_key>',
        step_2: 'Publish an episode: POST /api/v1/shows/:id/episodes',
        step_3: 'Go live: POST /api/v1/shows/:id/go-live',
        feed: 'Your RSS feed will be at /api/v1/shows/:id/feed.xml'
      }
    }, { status: 201 })
  } catch (err: any) {
    console.error('Register error:', err)
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    )
  }
}
