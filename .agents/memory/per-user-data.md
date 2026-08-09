---
name: Per-user data model
description: User scoping conventions after Clerk auth landed
---
Rule: every data table has `user_id` (text, default 'seed-user' — legacy pre-auth rows). All API routes are behind requireAuth (routes/index.ts) and must filter/insert with `req.userId`. daily_logs is unique on (user_id, date). health_profile / targets / plan_settings are per-user singletons via ensureX(userId) helpers. food_items has no user_id — ownership is enforced through the parent meal (getMealWithItems(id, userId)).
**Why:** app migrated from single-user to multi-user; forgetting the userId filter silently leaks other users' data.
**How to apply:** any new table gets user_id; any new route/query must scope by req.userId; new food-item-style child tables must verify parent ownership.
Legacy seed data (30 days logs, 25 meals) still belongs to 'seed-user'; the real user imports their history via the Excel import on /profile.
