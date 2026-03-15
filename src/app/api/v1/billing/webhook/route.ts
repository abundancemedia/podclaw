import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getStripe, STRIPE_PRICES } from '@/lib/stripe'
import Stripe from 'stripe'

/**
 * POST /api/v1/billing/webhook — Handle Stripe webhook events
 *
 * Events handled:
 * - checkout.session.completed → activate subscription
 * - customer.subscription.updated → plan change
 * - customer.subscription.deleted → downgrade to free
 * - invoice.payment_failed → flag account
 */
export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe()
    const body = await request.text()
    const sig = request.headers.get('stripe-signature')

    if (!sig) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
    }

    let event: Stripe.Event
    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
      if (!webhookSecret) {
        console.error('STRIPE_WEBHOOK_SECRET not configured')
        return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
      }
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const sql = getDb()

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const apiKey = session.metadata?.api_key
        const plan = session.metadata?.plan
        const subscriptionId = session.subscription as string

        if (apiKey && plan) {
          await sql`
            UPDATE api_keys
            SET plan = ${plan}, stripe_subscription_id = ${subscriptionId}
            WHERE key = ${apiKey}
          `
          console.log(`✅ Upgraded ${apiKey.slice(0, 16)}... to ${plan}`)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const apiKey = subscription.metadata?.api_key

        if (apiKey) {
          // Determine plan from price ID
          const priceId = subscription.items.data[0]?.price?.id
          let plan = 'free'
          if (priceId === STRIPE_PRICES.builder) plan = 'builder'
          else if (priceId === STRIPE_PRICES.pro) plan = 'pro'

          await sql`
            UPDATE api_keys SET plan = ${plan} WHERE key = ${apiKey}
          `
          console.log(`✅ Plan updated for ${apiKey.slice(0, 16)}... to ${plan}`)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const apiKey = subscription.metadata?.api_key

        if (apiKey) {
          await sql`
            UPDATE api_keys
            SET plan = 'free', stripe_subscription_id = NULL
            WHERE key = ${apiKey}
          `
          console.log(`✅ Downgraded ${apiKey.slice(0, 16)}... to free (subscription cancelled)`)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string
        console.warn(`⚠️ Payment failed for customer ${customerId}`)
        // Could add logic to send notifications or grace period
        break
      }

      default:
        // Unhandled event type — that's OK
        break
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('Webhook error:', err)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
