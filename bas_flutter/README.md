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

**3. Create the storage bucket**

Meal photos upload to a bucket named `meal_photos`. Create it in the Supabase
dashboard → Storage, and add policies allowing authenticated users to read and
write their own folder. Meal logging will fail until this exists.

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

## Not built yet

- Edge Functions for Claude: `analyze-meal-photo`, `generate-daily-insight`,
  `interpret-lab-values`, `stress-pattern-analysis`, `wellness-recommendation`
- Trends and AI insights screens (dashboard buttons are wired but inert)
- Social feed, follows, challenges
- Wearable sync
