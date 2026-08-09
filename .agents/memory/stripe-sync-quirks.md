---
name: stripe-replit-sync backfill behavior
description: syncBackfill() silently skips products in sandbox/test Stripe accounts; use Stripe API directly for product/price lookups.
---

`StripeSync.syncBackfill()` may complete without error but leave `stripe.products` and `stripe.prices` tables empty in sandbox accounts. The `_sync_status` table remains empty.

**Fix:** For the `/api/stripe/price` route (and any route that reads product/price data), call the Stripe API directly:

```ts
const stripe = await getUncachableStripeClient();
const products = await stripe.products.search({ query: "name:'Svasth Pro' AND active:'true'" });
const prices = await stripe.prices.list({ product: product.id, active: true });
```

**Why:** The stripe schema tables are useful for subscription queries (which DO get synced via webhooks), but product/price listing relies on backfill which may not work for sandboxes.

**How to apply:** Never rely on `stripe.products` or `stripe.prices` DB tables for reads that need to be immediately available. Use Stripe API directly for those. Webhook-synced subscription data (stripe.subscriptions) is more reliable.
