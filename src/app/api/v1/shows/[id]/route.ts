import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'

/**
 * GET /api/v1/shows/:id — Get show details (includes status + distribution)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request)
  if (!auth.valid) return auth.response

  const { id } = await params

  try {
    const sql = getDb()

    const shows = await sql`
      SELECT id, title, description, language, author, owner_name, owner_email,
             image_url, category, subcategory, explicit, website_url, status, created_at, updated_at
      FROM shows
      WHERE id = ${id} AND api_key = ${auth.apiKey}
    `

    if (shows.length === 0) {
      return NextResponse.json(
        { error: 'Show not found' },
        { status: 404 }
      )
    }

    const show = shows[0]

    const countResult = await sql`
      SELECT COUNT(*) as count FROM episodes WHERE show_id = ${id}
    `

    let distribution = null
    if (show.status === 'live') {
      const dists = await sql`
        SELECT directory, status, submit_url, submitted_at
        FROM distributions WHERE show_id = ${id}
      `
      if (dists.length > 0) {
        distribution = Object.fromEntries(
          dists.map((d: any) => [d.directory, {
            status: d.status,
            submit_url: d.submit_url,
            submitted_at: d.submitted_at
          }])
        )
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://podclaw.vercel.app'
    const feedUrl = `${baseUrl}/api/v1/shows/${id}/feed.xml`

    return NextResponse.json({
      ...show,
      episode_count: parseInt(countResult[0].count),
      feed_url: feedUrl,
      distribution,
    })
  } catch (err: any) {
    console.error('Get show error:', err)
    return NextResponse.json(
      { error: 'Failed to retrieve show' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/v1/shows/:id — Update show metadata
 *
 * Only provided fields are updated. Cannot change id or api_key.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request)
  if (!auth.valid) return auth.response

  const { id } = await params

  try {
    const sql = getDb()

    // Verify ownership
    const shows = await sql`
      SELECT id FROM shows WHERE id = ${id} AND api_key = ${auth.apiKey}
    `
    if (shows.length === 0) {
      return NextResponse.json({ error: 'Show not found' }, { status: 404 })
    }

    const body = await request.json()
    const updatable = ['title', 'description', 'language', 'author', 'owner_name', 'owner_email', 'image_url', 'category', 'subcategory', 'explicit', 'website_url']
    const fields = Object.keys(body).filter(k => updatable.includes(k))

    if (fields.length === 0) {
      return NextResponse.json(
        { error: `No updatable fields provided. Updatable: ${updatable.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate title length
    if (body.title && body.title.length > 150) {
      return NextResponse.json({ error: 'Title must be 150 characters or less' }, { status: 400 })
    }
    if (body.description && body.description.length > 4000) {
      return NextResponse.json({ error: 'Description must be 4000 characters or less' }, { status: 400 })
    }
    if (body.image_url && !body.image_url.startsWith('https://')) {
      return NextResponse.json({ error: 'image_url must be HTTPS' }, { status: 400 })
    }

    // Update each field (tagged templates don't support dynamic column names)
    if (body.title !== undefined) await sql`UPDATE shows SET title = ${body.title}, updated_at = NOW() WHERE id = ${id}`
    if (body.description !== undefined) await sql`UPDATE shows SET description = ${body.description}, updated_at = NOW() WHERE id = ${id}`
    if (body.language !== undefined) await sql`UPDATE shows SET language = ${body.language}, updated_at = NOW() WHERE id = ${id}`
    if (body.author !== undefined) await sql`UPDATE shows SET author = ${body.author}, updated_at = NOW() WHERE id = ${id}`
    if (body.owner_name !== undefined) await sql`UPDATE shows SET owner_name = ${body.owner_name}, updated_at = NOW() WHERE id = ${id}`
    if (body.owner_email !== undefined) await sql`UPDATE shows SET owner_email = ${body.owner_email}, updated_at = NOW() WHERE id = ${id}`
    if (body.image_url !== undefined) await sql`UPDATE shows SET image_url = ${body.image_url}, updated_at = NOW() WHERE id = ${id}`
    if (body.category !== undefined) await sql`UPDATE shows SET category = ${body.category}, updated_at = NOW() WHERE id = ${id}`
    if (body.subcategory !== undefined) await sql`UPDATE shows SET subcategory = ${body.subcategory}, updated_at = NOW() WHERE id = ${id}`
    if (body.explicit !== undefined) await sql`UPDATE shows SET explicit = ${body.explicit}, updated_at = NOW() WHERE id = ${id}`
    if (body.website_url !== undefined) await sql`UPDATE shows SET website_url = ${body.website_url}, updated_at = NOW() WHERE id = ${id}`

    // Return updated show
    const updated = await sql`
      SELECT id, title, description, language, author, owner_name, owner_email,
             image_url, category, subcategory, explicit, website_url, status, created_at, updated_at
      FROM shows WHERE id = ${id}
    `

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://podclaw.vercel.app'

    return NextResponse.json({
      ...updated[0],
      feed_url: `${baseUrl}/api/v1/shows/${id}/feed.xml`,
    })
  } catch (err: any) {
    console.error('Update show error:', err)
    return NextResponse.json({ error: 'Failed to update show' }, { status: 500 })
  }
}

/**
 * DELETE /api/v1/shows/:id — Delete a show and all its episodes
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request)
  if (!auth.valid) return auth.response

  const { id } = await params

  try {
    const sql = getDb()

    // Verify ownership
    const shows = await sql`
      SELECT id, title FROM shows WHERE id = ${id} AND api_key = ${auth.apiKey}
    `
    if (shows.length === 0) {
      return NextResponse.json({ error: 'Show not found' }, { status: 404 })
    }

    // Delete in FK order
    const epCount = await sql`DELETE FROM episodes WHERE show_id = ${id} RETURNING id`
    await sql`DELETE FROM distributions WHERE show_id = ${id}`
    await sql`DELETE FROM validations WHERE show_id = ${id}`
    await sql`DELETE FROM shows WHERE id = ${id}`

    return NextResponse.json({
      deleted: true,
      show_id: id,
      title: shows[0].title,
      episodes_deleted: epCount.length,
    })
  } catch (err: any) {
    console.error('Delete show error:', err)
    return NextResponse.json({ error: 'Failed to delete show' }, { status: 500 })
  }
}
