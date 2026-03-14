import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { randomUUID } from 'crypto'

/**
 * POST /api/v1/shows — Create a new show
 */
export async function POST(request: NextRequest) {
  try {
  // Authenticate
  const auth = await authenticateRequest(request)
  if (!auth.valid) return auth.response
    const body = await request.json()

    // Validate required fields
    const required = ['title', 'description', 'author', 'owner_name', 'owner_email', 'category']
    const missing = required.filter(f => !body[f])
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate title length
    if (body.title.length > 150) {
      return NextResponse.json(
        { error: 'Title must be 150 characters or less' },
        { status: 400 }
      )
    }

    // Validate description length
    if (body.description.length > 4000) {
      return NextResponse.json(
        { error: 'Description must be 4000 characters or less' },
        { status: 400 }
      )
    }

    // Validate image_url is HTTPS if provided
    if (body.image_url && !body.image_url.startsWith('https://')) {
      return NextResponse.json(
        { error: 'image_url must be HTTPS' },
        { status: 400 }
      )
    }

    const sql = getDb()
    const showId = `show_${randomUUID().replace(/-/g, '').slice(0, 16)}`

    await sql`
      INSERT INTO shows (id, api_key, title, description, language, author, owner_name, owner_email, image_url, category, subcategory, explicit, website_url)
      VALUES (
        ${showId},
        ${auth.apiKey},
        ${body.title},
        ${body.description},
        ${body.language || 'en'},
        ${body.author},
        ${body.owner_name},
        ${body.owner_email},
        ${body.image_url || null},
        ${body.category},
        ${body.subcategory || null},
        ${body.explicit || false},
        ${body.website_url || null}
      )
    `

    // Build the feed URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://podclaw.vercel.app'
    const feedUrl = `${baseUrl}/api/v1/shows/${showId}/feed.xml`

    return NextResponse.json(
      {
        id: showId,
        title: body.title,
        description: body.description,
        language: body.language || 'en',
        author: body.author,
        owner_name: body.owner_name,
        owner_email: body.owner_email,
        image_url: body.image_url || null,
        category: body.category,
        subcategory: body.subcategory || null,
        explicit: body.explicit || false,
        website_url: body.website_url || null,
        feed_url: feedUrl,
        created_at: new Date().toISOString(),
      },
      { status: 201 }
    )
  } catch (err: any) {
    console.error('Create show error:', err)
    return NextResponse.json(
      { error: 'Failed to create show', detail: err.message || String(err) },
      { status: 500 }
    )
  }
}
