---
name: Plan entitlements & AI quota
description: How Pro status and the free AI quota must be handled in Svasth
---
Rule: `plan` and `betaProAccess` in plan_settings may only be changed by trusted server code (payment-provider webhooks/admin), never via the public API. `PUT /api/plan` rejects entitlement fields with 403.
**Why:** Code review found any signed-in user could self-grant Pro; the beta toggle from the single-user era became a privilege escalation once multi-user auth landed.
**How to apply:** When the Stripe task merges, its webhook/trusted flow is the only writer of these fields. Never re-add a client-side upgrade toggle.

Quota: free users share one monthly counter (advisorUsageThisMonth, limit advisorMonthlyLimit) across advisor + AI composer. Pattern: `checkAiQuota` (read-only) before the AI call, `commitAiUsage` (conditional SQL increment) only after success — failures must not burn quota.
