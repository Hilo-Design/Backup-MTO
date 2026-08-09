import { Router, type IRouter } from 'express';
import { eq } from 'drizzle-orm';
import { db, planSettingsTable } from '@workspace/db';
import { getUncachableStripeClient } from '../stripeClient';
import { ensurePlanSettings } from './plan';

const router: IRouter = Router();

// Single server-side source of truth for the approved Svasth Pro price.
// Both the display endpoint and checkout use this ID — preventing advertised/charged divergence.
const APPROVED_PRICE_ID = 'price_1U2V79GRqeLr5cxTvNetBE6t';

// Validate and return the approved price from Stripe; throws if not found or invalid.
async function getApprovedPrice() {
  const stripe = await getUncachableStripeClient();
  const price = await stripe.prices.retrieve(APPROVED_PRICE_ID);
  if (
    !price.active ||
    price.currency !== 'inr' ||
    price.recurring?.interval !== 'month' ||
    !price.unit_amount
  ) {
    throw new Error('Approved Svasth Pro price is not valid (must be active INR monthly)');
  }
  const product = await stripe.products.retrieve(price.product as string);
  return { price, product };
}

/** GET /api/stripe/price — returns the approved Pro price validated against Stripe */
router.get('/stripe/price', async (_req, res): Promise<void> => {
  try {
    const { price, product } = await getApprovedPrice();
    res.json({
      priceId: price.id,
      unitAmount: price.unit_amount,
      currency: price.currency,
      recurring: price.recurring,
      productName: product.name,
    });
  } catch {
    res.status(503).json({ error: 'Price data not yet available' });
  }
});

/** POST /api/stripe/checkout — create a hosted checkout session */
router.post('/stripe/checkout', async (_req, res): Promise<void> => {
  try {
    // Validate the approved price server-side before creating a session
    const { price } = await getApprovedPrice();

    const plan = await ensurePlanSettings(_req.userId!);
    const stripe = await getUncachableStripeClient();

    // Create or reuse customer
    let customerId = plan.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ metadata: { app: 'svasth' } });
      customerId = customer.id;
      await db
        .update(planSettingsTable)
        .set({ stripeCustomerId: customerId, updatedAt: new Date() })
        .where(eq(planSettingsTable.id, plan.id));
    }

    // Build app base URL — previewPath is '/', so profile is at /profile
    const appBase = process.env.REPLIT_DOMAINS
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
      : `http://localhost:${process.env.PORT}`;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      // No payment_method_types restriction — Stripe auto-selects card, UPI, netbanking etc for INR
      line_items: [{ price: price.id, quantity: 1 }],
      mode: 'subscription',
      success_url: `${appBase}/profile?checkout=success`,
      cancel_url: `${appBase}/profile?checkout=cancelled`,
    });

    res.json({ url: session.url });
  } catch {
    res.status(500).json({ error: 'Could not create checkout session. Please try again.' });
  }
});

/** POST /api/stripe/portal — create a customer portal session */
router.post('/stripe/portal', async (_req, res): Promise<void> => {
  try {
    const plan = await ensurePlanSettings(_req.userId!);
    if (!plan.stripeCustomerId) {
      res.status(400).json({ error: 'No active subscription found' });
      return;
    }

    const stripe = await getUncachableStripeClient();
    const appBase = process.env.REPLIT_DOMAINS
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
      : `http://localhost:${process.env.PORT}`;

    const session = await stripe.billingPortal.sessions.create({
      customer: plan.stripeCustomerId,
      return_url: `${appBase}/profile`,
    });

    res.json({ url: session.url });
  } catch {
    res.status(500).json({ error: 'Could not open billing portal. Please try again.' });
  }
});

/** GET /api/stripe/subscription — current subscription status */
router.get('/stripe/subscription', async (_req, res): Promise<void> => {
  try {
    const plan = await ensurePlanSettings(_req.userId!);
    if (!plan.stripeSubscriptionId) {
      res.json({ subscription: null });
      return;
    }

    const stripe = await getUncachableStripeClient();
    const sub = await stripe.subscriptions.retrieve(plan.stripeSubscriptionId) as any;
    res.json({
      subscription: {
        id: sub.id,
        status: sub.status,
        currentPeriodEnd: sub.current_period_end ?? null,
      },
    });
  } catch {
    res.json({ subscription: null });
  }
});

export default router;
