import Stripe from 'stripe'

let stripeInstance: Stripe | null = null

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY not configured. Add it to Vercel environment variables.')
  }
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-12-18.acacia' as any,
      typescript: true,
    })
  }
  return stripeInstance
}

/**
 * PodClaw pricing tiers mapped to Stripe price IDs.
 * Set these env vars after creating products in Stripe Dashboard.
 */
export const STRIPE_PRICES = {
  pro: process.env.STRIPE_PRICE_PRO || '',
  scale: process.env.STRIPE_PRICE_SCALE || '',
}

export const PLAN_NAMES: Record<string, string> = {
  free: 'Free',
  pro: 'Agent Pro',
  scale: 'Agent Scale',
}
