import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { randomUUID } from 'crypto'

/**
 * POST /api/v1/shows/:id/episodes — Publish an episode
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Authenticate
  const auth = await authenticateRequest(request)
  if (!auth.valid) return auth.response

  const { id: showId } = await params

  try {
    const sql = getDb()

    // Verify the show exists and belongs to this API key
    const shows = await sql`
      SELECT id FROM shows WHERE id = ${showId} AND api_key = ${auth.apiKey}
    `
    if (shows.length === 0) {
      return NextResponse.json(
        { error: 'Show not found' },
        { status: 404 }
      )
    }

    const body = await request.json()

    // Validate required fields
    const required = ['title', 'description', 'audio_url']
    const missing = required.filter(f => !body[f])
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate audio_url is HTTPS
    if (!body.audio_url.startsWith('https://')) {
      return NextResponse.json(
        { error: 'audio_url must be HTTPS' },
        { status: 400 }
      )
    }

    // Validate episode_type if provided
    const validTypes = ['full', 'trailer', 'bonus']
    if (body.episode_type && !validTypes.includes(body.episode_type)) {
      return NextResponse.json(
        { error: `episode_type must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    const episodeId = `ep_${randomUUID().replace(/-/g, '').slice(0, 16)}`
    const guid = body.guid || episodeId
    const pubDate = body.pub_date ? new Date(body.pub_date).toISOString() : new Date().toISOString()

    await sql`
      INSERT INTO episodes (id, show_id, title, description, audio_url, audio_length, audio_type, duration, explicit, episode_type, season, episode_number, pub_date, guid)
      VALUES (
        ${episodeId},
        ${showId},
        ${body.title},
        ${body.description},
        ${body.audio_url},
        ${body.audio_length || null},
        ${body.audio_type || 'audio/mpeg'},
        ${body.duration || null},
        ${body.explicit || false},
        ${body.episode_type || 'full'},
        ${body.season || null},
        ${body.episode_number || null},
        ${pubDate},
        ${guid}
      )
    `

    return NextResponse.json(
      {
        id: episodeId,
        show_id: showId,
        title: body.title,
        description: body.description,
        audio_url: body.audio_url,
        audio_length: body.audio_length || null,
        audio_type: body.audio_type || 'audio/mpeg',
        duration: body.duration || null,
        explicit: body.explicit || false,
        episode_type: body.episode_type || 'full',
        season: body.season || null,
        episode_number: body.episode_number || null,
        pub_date: pubDate,
        guid,
        created_at: new Date().toISOString(),
      },
      { status: 201 }
    )
  } catch (err: any) {
    // Handle duplicate GUID
    if (err.message?.includes('unique') || err.message?.includes('duplicate')) {
      return NextResponse.json(
        { error: 'Episode with this GUID already exists' },
        { status: 409 }
      )
    }
    console.error('Create episode error:', err)
    return NextResponse.json(
      { error: 'Failed to create episode' },
      { status: 500 }
    )
  }
}
