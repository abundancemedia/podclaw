/**
 * Tier definitions and resource/rate limit enforcement.
 */

import { NextResponse } from 'next/server'
import { getDb } from './db'

export interface TierLimits {
  shows: number
  episodes_per_month: number
  requests_per_minute: number
  file_uploads_per_day: number
}

export const TIERS: Record<string, TierLimits> = {
  free: {
    shows: 1,
    episodes_per_month: 5,
    requests_per_minute: 60,
    file_uploads_per_day: 10,
  },
  builder: {
    shows: 5,
    episodes_per_month: 100,
    requests_per_minute: 300,
    file_uploads_per_day: 50,
  },
  pro: {
    shows: 25,
    episodes_per_month: 500,
    requests_per_minute: 1000,
    file_uploads_per_day: 200,
  },
  scale: {
    shows: 100,
    episodes_per_month: 2000,
    requests_per_minute: 5000,
    file_uploads_per_day: 1000,
  },
}

/**
 * Check if an API key can create another show.
 */
export async function checkShowLimit(apiKey: string, plan: string): Promise<NextResponse | null> {
  const limits = TIERS[plan] || TIERS.free
  const sql = getDb()

  const result = await sql`
    SELECT COUNT(*)::int as count FROM shows WHERE api_key = ${apiKey}
  `
  const current = result[0].count

  if (current >= limits.shows) {
    return NextResponse.json({
      error: 'Show limit reached',
      plan,
      current,
      limit: limits.shows,
      upgrade: plan === 'free'
        ? 'Upgrade to Builder ($19/mo) for 5 shows, or Pro ($49/mo) for 25.'
        : plan === 'builder'
          ? 'Upgrade to Pro ($49/mo) for 25 shows.'
          : plan === 'pro'
            ? 'Contact us for Scale — custom limits for your needs.'
            : null
    }, {
      status: 429,
      headers: { 'X-Plan': plan, 'X-Limit-Shows': String(limits.shows) }
    })
  }

  return null // OK
}

/**
 * Check if an API key can create another episode this month.
 */
export async function checkEpisodeLimit(apiKey: string, plan: string): Promise<NextResponse | null> {
  const limits = TIERS[plan] || TIERS.free
  const sql = getDb()

  const result = await sql`
    SELECT COUNT(*)::int as count FROM episodes e
    JOIN shows s ON e.show_id = s.id
    WHERE s.api_key = ${apiKey}
    AND e.created_at >= date_trunc('month', NOW())
  `
  const current = result[0].count

  if (current >= limits.episodes_per_month) {
    return NextResponse.json({
      error: 'Monthly episode limit reached',
      plan,
      current,
      limit: limits.episodes_per_month,
      resets: 'First of next month',
      upgrade: plan === 'free'
        ? 'Upgrade to Builder ($19/mo) for 100 episodes/month, or Pro ($49/mo) for 500.'
        : plan === 'builder'
          ? 'Upgrade to Pro ($49/mo) for 500 episodes/month.'
          : plan === 'pro'
            ? 'Contact us for Scale — custom limits for your needs.'
            : null
    }, {
      status: 429,
      headers: { 'X-Plan': plan, 'X-Limit-Episodes': String(limits.episodes_per_month) }
    })
  }

  return null // OK
}

/**
 * Check request rate limit (per minute).
 * Uses a sliding window with 1-minute granularity.
 */
export async function checkRateLimit(apiKey: string, plan: string): Promise<NextResponse | null> {
  const limits = TIERS[plan] || TIERS.free
  const sql = getDb()

  // Current minute window key
  const now = new Date()
  const timeWindow = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}T${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`

  // Upsert: increment counter for this window
  const result = await sql`
    INSERT INTO rate_limits (api_key, time_window, count)
    VALUES (${apiKey}, ${timeWindow}, 1)
    ON CONFLICT (api_key, time_window)
    DO UPDATE SET count = rate_limits.count + 1
    RETURNING count
  `

  const count = result[0].count

  if (count > limits.requests_per_minute) {
    return NextResponse.json({
      error: 'Rate limit exceeded',
      plan,
      limit: limits.requests_per_minute,
      window: '1 minute',
      retry_after: 60 - now.getUTCSeconds(),
    }, {
      status: 429,
      headers: {
        'Retry-After': String(60 - now.getUTCSeconds()),
        'X-RateLimit-Limit': String(limits.requests_per_minute),
        'X-RateLimit-Remaining': '0',
        'X-Plan': plan,
      }
    })
  }

  return null // OK — headers added by caller
}

/**
 * Get rate limit headers for successful requests.
 */
export function rateLimitHeaders(plan: string, currentCount: number): Record<string, string> {
  const limits = TIERS[plan] || TIERS.free
  return {
    'X-RateLimit-Limit': String(limits.requests_per_minute),
    'X-RateLimit-Remaining': String(Math.max(0, limits.requests_per_minute - currentCount)),
    'X-Plan': plan,
  }
}
