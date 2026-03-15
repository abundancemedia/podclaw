import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { getStripe } from '@/lib/stripe'

/**
 * POST /api/v1/billing/portal — Get Stripe Customer Portal URL
 *
 * Returns a URL where the user can manage their subscription,
 * update payment method, or cancel.
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (!auth.valid) return auth.response

  try {
    const sql = getDb()
    const keys = await sql`SELECT stripe_customer_id FROM api_keys WHERE key = ${auth.apiKey}`
    const customerId = keys[0].stripe_customer_id

    if (!customerId) {
      return NextResponse.json(
        { error: 'No billing account found. You are on the free plan.' },
        { status: 404 }
      )
    }

    const stripe = getStripe()
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://podclaw.vercel.app'

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: baseUrl,
    })

    return NextResponse.json({
      portal_url: session.url,
      message: 'Manage your subscription, update payment method, or cancel.',
    })
  } catch (err: any) {
    if (err.message?.includes('STRIPE_SECRET_KEY')) {
      return NextResponse.json({ error: 'Billing not yet configured.' }, { status: 503 })
    }
    console.error('Portal error:', err)
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 })
  }
}
