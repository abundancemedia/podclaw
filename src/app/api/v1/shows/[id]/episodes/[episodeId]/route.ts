import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'

type Params = { params: Promise<{ id: string; episodeId: string }> }

/**
 * GET /api/v1/shows/:id/episodes/:episodeId — Get episode details
 */
export async function GET(request: NextRequest, { params }: Params) {
  const auth = await authenticateRequest(request)
  if (!auth.valid) return auth.response

  const { id: showId, episodeId } = await params

  try {
    const sql = getDb()

    // Verify show ownership
    const shows = await sql`SELECT id FROM shows WHERE id = ${showId} AND api_key = ${auth.apiKey}`
    if (shows.length === 0) {
      return NextResponse.json({ error: 'Show not found' }, { status: 404 })
    }

    const episodes = await sql`
      SELECT * FROM episodes WHERE id = ${episodeId} AND show_id = ${showId}
    `
    if (episodes.length === 0) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 })
    }

    return NextResponse.json(episodes[0])
  } catch (err: any) {
    console.error('Get episode error:', err)
    return NextResponse.json({ error: 'Failed to retrieve episode' }, { status: 500 })
  }
}

/**
 * PATCH /api/v1/shows/:id/episodes/:episodeId — Update episode
 *
 * Only provided fields are updated. Cannot change id, show_id, or guid.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await authenticateRequest(request)
  if (!auth.valid) return auth.response

  const { id: showId, episodeId } = await params

  try {
    const sql = getDb()

    // Verify show ownership
    const shows = await sql`SELECT id FROM shows WHERE id = ${showId} AND api_key = ${auth.apiKey}`
    if (shows.length === 0) {
      return NextResponse.json({ error: 'Show not found' }, { status: 404 })
    }

    // Verify episode exists
    const episodes = await sql`SELECT id FROM episodes WHERE id = ${episodeId} AND show_id = ${showId}`
    if (episodes.length === 0) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 })
    }

    const body = await request.json()
    const updatable = ['title', 'description', 'audio_url', 'audio_length', 'audio_type', 'duration', 'explicit', 'episode_type', 'season', 'episode_number', 'pub_date']
    const fields = Object.keys(body).filter(k => updatable.includes(k))

    if (fields.length === 0) {
      return NextResponse.json(
        { error: `No updatable fields provided. Updatable: ${updatable.join(', ')}. Note: guid cannot be changed after publishing.` },
        { status: 400 }
      )
    }

    // Validate audio_url is HTTPS if provided
    if (body.audio_url && !body.audio_url.startsWith('https://')) {
      return NextResponse.json({ error: 'audio_url must be HTTPS' }, { status: 400 })
    }

    // Validate episode_type if provided
    if (body.episode_type && !['full', 'trailer', 'bonus'].includes(body.episode_type)) {
      return NextResponse.json({ error: 'episode_type must be one of: full, trailer, bonus' }, { status: 400 })
    }

    // Update each field (tagged templates don't support dynamic column names)
    if (body.title !== undefined) await sql`UPDATE episodes SET title = ${body.title} WHERE id = ${episodeId}`
    if (body.description !== undefined) await sql`UPDATE episodes SET description = ${body.description} WHERE id = ${episodeId}`
    if (body.audio_url !== undefined) await sql`UPDATE episodes SET audio_url = ${body.audio_url} WHERE id = ${episodeId}`
    if (body.audio_length !== undefined) await sql`UPDATE episodes SET audio_length = ${body.audio_length} WHERE id = ${episodeId}`
    if (body.audio_type !== undefined) await sql`UPDATE episodes SET audio_type = ${body.audio_type} WHERE id = ${episodeId}`
    if (body.duration !== undefined) await sql`UPDATE episodes SET duration = ${body.duration} WHERE id = ${episodeId}`
    if (body.explicit !== undefined) await sql`UPDATE episodes SET explicit = ${body.explicit} WHERE id = ${episodeId}`
    if (body.episode_type !== undefined) await sql`UPDATE episodes SET episode_type = ${body.episode_type} WHERE id = ${episodeId}`
    if (body.season !== undefined) await sql`UPDATE episodes SET season = ${body.season} WHERE id = ${episodeId}`
    if (body.episode_number !== undefined) await sql`UPDATE episodes SET episode_number = ${body.episode_number} WHERE id = ${episodeId}`
    if (body.pub_date !== undefined) await sql`UPDATE episodes SET pub_date = ${new Date(body.pub_date).toISOString()} WHERE id = ${episodeId}`

    // Return updated episode
    const updated = await sql`SELECT * FROM episodes WHERE id = ${episodeId}`

    return NextResponse.json(updated[0])
  } catch (err: any) {
    console.error('Update episode error:', err)
    return NextResponse.json({ error: 'Failed to update episode' }, { status: 500 })
  }
}

/**
 * DELETE /api/v1/shows/:id/episodes/:episodeId — Delete an episode
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await authenticateRequest(request)
  if (!auth.valid) return auth.response

  const { id: showId, episodeId } = await params

  try {
    const sql = getDb()

    // Verify show ownership
    const shows = await sql`SELECT id FROM shows WHERE id = ${showId} AND api_key = ${auth.apiKey}`
    if (shows.length === 0) {
      return NextResponse.json({ error: 'Show not found' }, { status: 404 })
    }

    // Delete the episode
    const deleted = await sql`
      DELETE FROM episodes WHERE id = ${episodeId} AND show_id = ${showId} RETURNING id, title
    `
    if (deleted.length === 0) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 })
    }

    return NextResponse.json({
      deleted: true,
      episode_id: episodeId,
      title: deleted[0].title,
      show_id: showId,
    })
  } catch (err: any) {
    console.error('Delete episode error:', err)
    return NextResponse.json({ error: 'Failed to delete episode' }, { status: 500 })
  }
}
