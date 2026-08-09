# Bas — Flutter app

AI-powered wellness app for 30–40 year old professionals.
Backend lives in Supabase project **Bas** (`jaynfestjiidkfwbhbhw`, ap-southeast-1).

## Status

The Dart source is written. The `ios/` and `android/` platform folders are **not**
generated yet — do step 1 before running.

## Setup

**1. Generate the platform folders**

From inside `bas_flutter/`:

```bash
flutter create --platforms=ios,android --org co.hilodesign --project-name bas .
```

If that overwrites anything under `lib/`, restore it with `git checkout -- lib/`
(commit before running so you have something to restore to).

**2. Add the Supabase anon key**

In `lib/main.dart`, replace `YOUR_ANON_KEY_HERE` with the anon (public) key from
the Supabase dashboard → Settings → API. The anon key is safe in a client app;
row-level security is what protects the data. Never put the service-role key here.

**3. Storage — already set up**

The `meal_photos` bucket exists and is **private**, capped at 10MB per file and
limited to jpeg/png/webp/heic. Four RLS policies on `storage.objects` restrict
every operation to objects under `<auth.uid()>/`, so a signed-in user can only
touch their own photos.

Because the bucket is private there is no public URL. `uploadMealPhoto` returns
the object *path*, which is what `meals.photo_url` stores. To display a photo,
call `signedPhotoUrl(path)` for a time-limited link (one hour by default).

**4. Install and run**

```bash
flutter pub get
flutter run
```

## Structure

```
lib/
├── main.dart                  Supabase init, theme, auth gate
├── constants/colors.dart      Palette
├── providers/auth_provider.dart   Riverpod: client, auth stream, sign in/up/out
├── services/supabase_service.dart Data layer over the 19-table schema
└── screens/
    ├── auth/login_screen.dart
    ├── home/dashboard_screen.dart
    ├── meals/meal_logging_screen.dart
    └── daily_check_in/daily_check_in_screen.dart
```

## Schema notes that affect this code

- `meals.photo_url` and `meals.photo_uploaded_at` are `NOT NULL` — upload the
  photo before inserting the row.
- `daily_logs` has a `UNIQUE(user_id, date)` constraint, so saving a check-in
  upserts on that key rather than inserting.
- Every table has RLS enabled. Policies key off `auth.uid() = user_id`, so the
  user must be signed in for any read or write to return rows.

## Edge Functions (Claude)

Five functions are deployed to the Bas project. Source lives in
`supabase/functions/`, shared helpers in `supabase/functions/_shared/`.

| Function | Body | Effect |
|---|---|---|
| `analyze-meal-photo` | `{meal_id}` | Vision analysis; writes `meals` totals + `food_items` |
| `generate-daily-insight` | `{date?}` | One insight; inserts into `ai_insights` |
| `interpret-lab-values` | `{lab_value_id}` | Writes `lab_values.ai_interpretation` |
| `stress-pattern-analysis` | `{days?}` | Patterns over 7–90 days; needs 5+ stress logs |
| `wellness-recommendation` | `{question?}` | One focused recommendation |

Call them through `lib/services/ai_service.dart`, which maps non-2xx responses
to `AiException`. A 422 means "not enough data yet" rather than a real failure —
check `isNotEnoughData` and prompt the user to log more instead of showing an
error.

### Required secret

**Nothing works until this is set.** In the Supabase dashboard, Edge Functions →
Secrets, add:

```
ANTHROPIC_API_KEY = sk-ant-...
```

Optionally `CLAUDE_MODEL` to override the default (`claude-sonnet-5`).

The key lives only in Supabase. It must never go in `pubspec.yaml`, `main.dart`,
or anywhere else in the Flutter app — anything shipped in the binary can be
extracted from an installed APK or IPA.

### How they stay safe

Every function builds its Supabase client from the *caller's* JWT, not the
service-role key, so row-level security still applies inside the function. User
identity comes from the verified token, never from the request body — passing a
different `user_id` in the payload achieves nothing. All five have `verify_jwt`
enabled, so unauthenticated calls are rejected at the edge.

### Redeploying after an edit

```bash
supabase functions deploy analyze-meal-photo --project-ref jaynfestjiidkfwbhbhw
```

## Not built yet

- Trends and AI insights screens (dashboard buttons are wired but inert)
- Social feed, follows, challenges (schema and policies exist)
- Wearable sync
- Google sign-in
