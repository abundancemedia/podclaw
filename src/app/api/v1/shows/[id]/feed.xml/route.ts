import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Convert ISO date to RFC 2822 format (required by RSS/Apple/Spotify)
 */
function toRfc2822(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toUTCString()
}

/**
 * Format duration as HH:MM:SS
 */
function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

/**
 * GET /api/v1/shows/:id/feed.xml — Serve Apple/Spotify-compliant RSS feed
 *
 * This endpoint is PUBLIC (no auth) — podcast directories need to fetch it.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const sql = getDb()

    // Get the show
    const shows = await sql`
      SELECT * FROM shows WHERE id = ${id}
    `

    if (shows.length === 0) {
      return new NextResponse('Show not found', { status: 404 })
    }

    const show = shows[0]

    // Get all episodes, newest first
    const episodes = await sql`
      SELECT * FROM episodes
      WHERE show_id = ${id}
      ORDER BY pub_date DESC
    `

    // Build feed URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://podclaw.vercel.app'
    const feedUrl = `${baseUrl}/api/v1/shows/${id}/feed.xml`
    const showLink = show.website_url || baseUrl

    // Build episode items
    const episodeItems = episodes
      .map((ep: any) => {
        const durationTag = ep.duration
          ? `    <itunes:duration>${formatDuration(ep.duration)}</itunes:duration>`
          : ''
        const seasonTag = ep.season
          ? `    <itunes:season>${ep.season}</itunes:season>`
          : ''
        const episodeTag = ep.episode_number
          ? `    <itunes:episode>${ep.episode_number}</itunes:episode>`
          : ''

        return `  <item>
    <title>${escapeXml(ep.title)}</title>
    <description>${escapeXml(ep.description)}</description>
    <pubDate>${toRfc2822(ep.pub_date)}</pubDate>
    <enclosure url="${escapeXml(ep.audio_url)}" length="${ep.audio_length || 0}" type="${ep.audio_type || 'audio/mpeg'}"/>
    <guid isPermaLink="false">${escapeXml(ep.guid)}</guid>
${durationTag}
    <itunes:explicit>${ep.explicit ? 'true' : 'false'}</itunes:explicit>
    <itunes:episodeType>${ep.episode_type || 'full'}</itunes:episodeType>
${seasonTag}
${episodeTag}
  </item>`
      })
      .join('\n')

    // Build subcategory tag
    const subcategoryTag = show.subcategory
      ? `\n    <itunes:category text="${escapeXml(show.subcategory)}"/>`
      : ''

    // Build image tag
    const imageTag = show.image_url
      ? `  <itunes:image href="${escapeXml(show.image_url)}"/>`
      : ''

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel>
  <title>${escapeXml(show.title)}</title>
  <link>${escapeXml(showLink)}</link>
  <description>${escapeXml(show.description)}</description>
  <language>${show.language || 'en'}</language>
  <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml"/>
  <itunes:author>${escapeXml(show.author)}</itunes:author>
  <itunes:owner>
    <itunes:name>${escapeXml(show.owner_name)}</itunes:name>
    <itunes:email>${escapeXml(show.owner_email)}</itunes:email>
  </itunes:owner>
${imageTag}
  <itunes:category text="${escapeXml(show.category)}">${subcategoryTag}
  </itunes:category>
  <itunes:explicit>${show.explicit ? 'true' : 'false'}</itunes:explicit>
${episodeItems}
</channel>
</rss>`

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=300',
      },
    })
  } catch (err: any) {
    console.error('Feed generation error:', err)
    return new NextResponse('Feed generation failed', { status: 500 })
  }
}
