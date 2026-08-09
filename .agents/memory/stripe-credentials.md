---
name: Stripe credentials field names
description: The Replit Stripe connector exposes credentials under different keys than the stripe-replit-sync template expects.
---

The Replit Stripe connection settings use `settings.secret` (not `settings.secret_key`) and `settings.publishable` (not `settings.publishable_key`).

The stripe-replit-sync code template ships with `settings.secret_key` — this will always return undefined. Fix pattern:

```ts
const secretKey = settings?.secret || settings?.secret_key;
```

**Why:** The Replit connector was built with field names `secret` and `publishable`; the stripe-replit-sync template was written assuming a different field naming convention.

**How to apply:** Any time stripeClient.ts is written from the template, apply this fix before testing.
