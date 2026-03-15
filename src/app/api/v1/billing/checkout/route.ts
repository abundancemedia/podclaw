import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth'
import { getStripe, STRIPE_PRICES } from '@/lib/stripe'

/**
 * POST /api/v1/billing/checkout — Create a Stripe Checkout session for upgrade
 *
 * Body: { "plan": "pro" | "scale" }
 * Returns: { "checkout_url": "https://checkout.stripe.com/..." }
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (!auth.valid) return auth.response

  try {
    const body = await request.json()
    const targetPlan = body.plan

    if (!targetPlan || !['builder', 'pro'].includes(targetPlan)) {
      if (targetPlan === 'scale') {
        return NextResponse.json(
          { error: 'Scale is a custom plan. Contact us at sales@podclaw.io to discuss your needs.' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: 'plan must be "builder" or "pro". For Scale, contact sales@podclaw.io.' },
        { status: 400 }
      )
    }

    const priceId = STRIPE_PRICES[targetPlan as keyof typeof STRIPE_PRICES]
    if (!priceId) {
      return NextResponse.json(
        { error: `Stripe price not configured for ${targetPlan}. Contact support.` },
        { status: 503 }
      )
    }

    if (auth.plan === targetPlan) {
      return NextResponse.json(
        { error: `Already on ${targetPlan} plan.` },
        { status: 400 }
      )
    }

    const stripe = getStripe()
    const sql = getDb()

    // Get or create Stripe customer
    const keys = await sql`SELECT email, stripe_customer_id FROM api_keys WHERE key = ${auth.apiKey}`
    const email = keys[0].email
    let customerId = keys[0].stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: email || undefined,
        metadata: { api_key: auth.apiKey },
      })
      customerId = customer.id
      await sql`UPDATE api_keys SET stripe_customer_id = ${customerId} WHERE key = ${auth.apiKey}`
    }

    // If user already has a subscription, use billing portal to change plan
    const existingKeys = await sql`SELECT stripe_subscription_id FROM api_keys WHERE key = ${auth.apiKey}`
    if (existingKeys[0].stripe_subscription_id) {
      // Redirect to portal for plan change
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://podclaw.vercel.app'
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: baseUrl,
      })
      return NextResponse.json({
        portal_url: portalSession.url,
        message: 'You already have a subscription. Use the portal to change your plan.',
      })
    }

    // Create checkout session
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://podclaw.vercel.app'
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}?billing=success&plan=${targetPlan}`,
      cancel_url: `${baseUrl}?billing=cancelled`,
      metadata: { api_key: auth.apiKey, plan: targetPlan },
      subscription_data: {
        metadata: { api_key: auth.apiKey, plan: targetPlan },
      },
    })

    return NextResponse.json({
      checkout_url: session.url,
      plan: targetPlan,
      message: `Complete checkout to upgrade to ${targetPlan}. Your API limits will increase immediately after payment.`,
    })
  } catch (err: any) {
    if (err.message?.includes('STRIPE_SECRET_KEY')) {
      return NextResponse.json(
        { error: 'Billing not yet configured. Contact support.' },
        { status: 503 }
      )
    }
    console.error('Checkout error:', err)
    return NextResponse.json(
      { error: 'Failed to create checkout session', debug: err.message || String(err) },
      { status: 500 }
    )
  }
}
