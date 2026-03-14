import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { validateShow } from '@/lib/validate'
import { randomUUID } from 'crypto'

/**
 * POST /api/v1/shows/:id/go-live — Validate and publish a show
 *
 * Runs all pre-flight checks (Apple/Spotify requirements),
 * updates show status to 'live', and returns directory submission URLs.
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

    // Get the show
    const shows = await sql`
      SELECT * FROM shows WHERE id = ${showId} AND api_key = ${auth.apiKey}
    `
    if (shows.length === 0) {
      return NextResponse.json(
        { error: 'Show not found' },
        { status: 404 }
      )
    }

    const show = shows[0]

    // Check if already live
    if (show.status === 'live') {
      // Return current distribution status
      const dists = await sql`
        SELECT directory, status, submit_url, instructions, submitted_at
        FROM distributions WHERE show_id = ${showId}
      `

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://podclaw.vercel.app'
      const feedUrl = `${baseUrl}/api/v1/shows/${showId}/feed.xml`

      return NextResponse.json({
        status: 'live',
        feed_url: feedUrl,
        message: 'Show is already live.',
        distribution: Object.fromEntries(
          dists.map((d: any) => [d.directory, {
            status: d.status,
            submit_url: d.submit_url,
            instructions: d.instructions,
            submitted_at: d.submitted_at
          }])
        )
      })
    }

    // Get all episodes
    const episodes = await sql`
      SELECT * FROM episodes WHERE show_id = ${showId} ORDER BY pub_date DESC
    `

    // Run pre-flight validation
    await sql`UPDATE shows SET status = 'validating' WHERE id = ${showId}`
    const validation = await validateShow(show, episodes)

    // Store validation result
    const validationId = `val_${randomUUID().replace(/-/g, '').slice(0, 16)}`
    await sql`
      INSERT INTO validations (id, show_id, passed, checks)
      VALUES (${validationId}, ${showId}, ${validation.passed}, ${JSON.stringify(validation.checks)})
    `

    if (!validation.passed) {
      // Revert to draft
      await sql`UPDATE shows SET status = 'draft' WHERE id = ${showId}`

      return NextResponse.json({
        status: 'failed',
        validation: {
          passed: false,
          checks: validation.checks
        },
        message: 'Pre-flight validation failed. Fix the issues above and try again.'
      }, { status: 422 })
    }

    // Validation passed — mark as live
    await sql`UPDATE shows SET status = 'live', updated_at = NOW() WHERE id = ${showId}`

    // Build distribution info
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://podclaw.vercel.app'
    const feedUrl = `${baseUrl}/api/v1/shows/${showId}/feed.xml`
    const encodedFeedUrl = encodeURIComponent(feedUrl)

    // Apple Podcasts submission
    const appleSubmitUrl = 'https://podcasters.apple.com/my-podcasts/new-feed'
    const appleInstructions = [
      '1. Go to the Apple Podcasts Connect URL below',
      '2. Sign in with your Apple ID',
      `3. Paste your RSS feed URL: ${feedUrl}`,
      '4. Click "Validate" — your feed is pre-validated and should pass',
      '5. Submit and wait for Apple review (typically 24-48 hours)'
    ].join('\n')

    // Spotify submission
    const spotifySubmitUrl = 'https://podcasters.spotify.com/pod/dashboard/episode/wizard'
    const spotifyInstructions = [
      '1. Go to Spotify for Podcasters URL below',
      '2. Sign in or create a Spotify for Podcasters account',
      '3. Select "Add your podcast" → "I have a podcast"',
      `4. Paste your RSS feed URL: ${feedUrl}`,
      '5. Verify ownership via the email sent to your owner_email',
      '6. Once verified, your podcast will appear on Spotify within hours'
    ].join('\n')

    // Store distribution records
    const appleDistId = `dist_${randomUUID().replace(/-/g, '').slice(0, 16)}`
    const spotifyDistId = `dist_${randomUUID().replace(/-/g, '').slice(0, 16)}`

    await sql`
      INSERT INTO distributions (id, show_id, directory, status, submit_url, instructions)
      VALUES (${appleDistId}, ${showId}, 'apple', 'ready', ${appleSubmitUrl}, ${appleInstructions})
      ON CONFLICT (show_id, directory) DO UPDATE SET status = 'ready', submit_url = ${appleSubmitUrl}, instructions = ${appleInstructions}
    `

    await sql`
      INSERT INTO distributions (id, show_id, directory, status, submit_url, instructions)
      VALUES (${spotifyDistId}, ${showId}, 'spotify', 'ready', ${spotifySubmitUrl}, ${spotifyInstructions})
      ON CONFLICT (show_id, directory) DO UPDATE SET status = 'ready', submit_url = ${spotifySubmitUrl}, instructions = ${spotifyInstructions}
    `

    return NextResponse.json({
      status: 'live',
      feed_url: feedUrl,
      validation: {
        passed: true,
        checks: validation.checks
      },
      distribution: {
        apple: {
          status: 'ready',
          submit_url: appleSubmitUrl,
          instructions: appleInstructions
        },
        spotify: {
          status: 'ready',
          submit_url: spotifySubmitUrl,
          instructions: spotifyInstructions
        }
      }
    }, { status: 200 })
  } catch (err: any) {
    console.error('Go-live error:', err)
    return NextResponse.json(
      { error: 'Failed to process go-live request' },
      { status: 500 }
    )
  }
}
