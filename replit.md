# Svasth — Personal Health & Nutrition Tracker

A premium mobile-first personal health companion for health-conscious Indian millennials and Gen Z. Tracks daily nutrition, symptoms, meals, water, weight, steps, sleep, and more. Features a luxury Indian Gen Z brand identity (warm ivory, deep teal, saffron, Hindi microcopy), a rules-based meal advisor, weekly trends, health profile with lab values, freemium plan architecture, and CSV export.

## Run & Operate

- `pnpm --filter @workspace/health-tracker run dev` — frontend dev server
- `pnpm --filter @workspace/api-server run dev` — API server (port 8080)
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm run typecheck` — full typecheck across all packages
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite + Tailwind CSS v4 + wouter + React Query + Recharts + Framer Motion
- API: Express 5 + Zod validation
- DB: PostgreSQL + Drizzle ORM
- API codegen: Orval (from OpenAPI spec in `lib/api-spec/openapi.yaml`)

## Where things live

- `artifacts/health-tracker/src/pages/` — all 6 pages (dashboard, meals, log, advisor, trends, profile)
- `artifacts/health-tracker/src/components/` — layout, plan-context (freemium), UI components
- `artifacts/health-tracker/src/index.css` — Svasth color theme (ivory/teal/saffron palette)
- `artifacts/api-server/src/routes/` — all API routes (daily-logs, meals, health-profile, advisor, trends, dashboard, export, plan)
- `lib/db/src/schema/` — DB schema (daily-logs, meals, health-profile, targets, plan-settings)
- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth)
- `lib/api-client-react/src/generated/` — generated React Query hooks (do not edit)
- `lib/api-zod/src/generated/` — generated Zod schemas (do not edit)

## Architecture decisions

- **All integer fields in OpenAPI spec use `type: number`** (not `type: integer`) — Orval v8.23+ generates `zod.int()` for integer types which is Zod v4 syntax incompatible with the v3 catalog pin. Using `number` generates `zod.number()` which works in both.
- **Singleton pattern for targets, health profile, plan settings** — app has a single user; these tables always have one row, created on first access.
- **Upsert pattern for daily logs** — POST to `/daily-logs` and PATCH to `/daily-logs/:date` both upsert so the UI never has to distinguish create vs update.
- **Meal macro totals from food items** — dashboard sums meal `totalCalories` etc. from the meals table; the daily log totals are a secondary manual-entry path.
- **Freemium via `plan_settings` table** — `plan` ("free"|"pro"), `beta_pro_access` boolean string, `advisor_usage_this_month` counter with monthly auto-reset. Toggle beta pro access via `/plan` PUT for testing without real payments.

## Product

- **Dashboard (/)**: Progress rings for calories/protein/water, bars for carbs/fiber, meal timeline, key symptom chips, streak badge, FAB
- **Meals (/meals)**: Meal timeline by type, food items with portions, add/edit/delete meals, photo capture
- **Daily Log (/log)**: All symptom ratings (energy, reflux, sleepiness, headache, stress, stiffness), body metrics (weight, steps, sleep, workout), digestion, water tracker
- **Advisor (/advisor)**: Rules-based meal guidance using remaining targets; free plan limited to 5 checks/month
- **Trends (/trends)**: Weekly charts for 8 key metrics; recharts area/line with teal palette
- **Profile (/profile)**: Daily targets, lab values (ferritin, B12, vitamin D, HbA1c, lipids), plan status, beta toggle, CSV export

## User preferences

- Brand: Svasth — luxury Indian Gen Z health app
- Visual: warm ivory background, deep teal primary, saffron accent, Hindi microcopy as brand layer
- Hindi phrases used: आज का सारांश, नमस्ते, खाना, सेहत, रुझान, सलाह, प्रोफाइल, आज का लक्ष्य, शाबाश!, थोड़ा और
- Freemium: Free (5 advisor checks/month, ad banners) vs Pro (₹199–399/month, unlimited)
- Medical/lab info is tracking-only — no diagnoses or prescriptions

## Gotchas

- After any OpenAPI spec change, run `pnpm --filter @workspace/api-spec run codegen` — generated files must never be edited by hand
- Use `type: number` (not `type: integer`) in openapi.yaml for all numeric fields — see Architecture decisions above
- DB push will conflict if columns already exist; use `pnpm --filter @workspace/db run push-force` if needed
- The `plan_settings.beta_pro_access` column is a text "true"/"false" (not boolean) due to Drizzle type mapping
- Food items table has a cascade delete on `meal_id` — deleting a meal deletes all its food items

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- API contract: `lib/api-spec/openapi.yaml`
- DB schema source: `lib/db/src/schema/`
