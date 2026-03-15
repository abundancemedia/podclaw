import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { TIERS } from '@/lib/limits'

/**
 * GET /api/v1/billing/usage — Current plan, usage counts, and limits
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (!auth.valid) return auth.response

  try {
    const sql = getDb()
    const plan = auth.plan
    const limits = TIERS[plan] || TIERS.free

    // Count shows
    const showResult = await sql`
      SELECT COUNT(*)::int as count FROM shows WHERE api_key = ${auth.apiKey}
    `

    // Count episodes this month
    const episodeResult = await sql`
      SELECT COUNT(*)::int as count FROM episodes e
      JOIN shows s ON e.show_id = s.id
      WHERE s.api_key = ${auth.apiKey}
      AND e.created_at >= date_trunc('month', NOW())
    `

    // Count total episodes
    const totalEpResult = await sql`
      SELECT COUNT(*)::int as count FROM episodes e
      JOIN shows s ON e.show_id = s.id
      WHERE s.api_key = ${auth.apiKey}
    `

    return NextResponse.json({
      plan,
      usage: {
        shows: {
          current: showResult[0].count,
          limit: limits.shows === 999999 ? 'unlimited' : limits.shows,
        },
        episodes_this_month: {
          current: episodeResult[0].count,
          limit: limits.episodes_per_month === 999999 ? 'unlimited' : limits.episodes_per_month,
        },
        episodes_total: totalEpResult[0].count,
      },
      rate_limit: {
        requests_per_minute: limits.requests_per_minute,
      },
      billing: {
        upgrade: plan === 'free'
          ? 'POST /v1/billing/checkout with { "plan": "builder" } or { "plan": "pro" }'
          : plan === 'builder'
            ? 'POST /v1/billing/checkout with { "plan": "pro" }'
            : plan === 'pro'
              ? 'Contact sales for Scale — custom limits for your needs.'
              : null,
        manage: 'POST /v1/billing/portal — manage subscription, update payment, or cancel',
      },
      tiers: {
        free: { price: '$0/mo', shows: 1, episodes_per_month: 5, storage: '500 MB' },
        builder: { price: '$19/mo', shows: 5, episodes_per_month: 100, storage: '10 GB' },
        pro: { price: '$49/mo', shows: 25, episodes_per_month: 500, storage: '50 GB' },
        scale: { price: 'Contact us', shows: 'Custom', episodes_per_month: 'Custom', storage: 'Custom' },
      }
    }, {
      headers: { 'X-Plan': plan }
    })
  } catch (err: any) {
    console.error('Usage error:', err)
    return NextResponse.json(
      { error: 'Failed to retrieve usage' },
      { status: 500 }
    )
  }
}
