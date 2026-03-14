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
  // Authenticate
  const auth = await authenticateRequest(request)
  if (!auth.valid) return auth.response

  const { id } = await params

  try {
    const sql = getDb()

    // Get the show
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

    // Get episode count
    const countResult = await sql`
      SELECT COUNT(*) as count FROM episodes WHERE show_id = ${id}
    `

    // Get distribution status if live
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

    // Build feed URL
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
