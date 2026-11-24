# Going live: step by step

You do these once. Each step says where to click or what to run.

## 1. Create the hosted Supabase project
1. supabase.com/dashboard → **New project**. Pick a region near you. Save the database password.
2. Note the **project ref** (the id in the URL) and, under Project Settings → API, the URL and publishable key.

## 2. Push the database
```bash
supabase login
supabase link --project-ref <your-ref>
supabase db push
supabase functions deploy
```

## 3. Webhook secrets (production)
The member-added webhook reads two Vault secrets. Run in the dashboard SQL editor:
```sql
select vault.create_secret('https://<your-ref>.supabase.co', 'webhook_base_url');
select vault.create_secret('<a long random string>', 'webhook_secret');
```
Then give the function the same string:
```bash
supabase secrets set WEBHOOK_SECRET=<same long random string>
supabase secrets set TRAVEL_BUDDY_API_KEY=<your key>
```

## 4. Auth settings (dashboard → Authentication)
- **URL Configuration**: Site URL = your Vercel URL. Add `https://<your-app>.vercel.app/auth/callback` and `https://*-<team>.vercel.app/auth/callback` (previews) to Redirect URLs.
- **Providers → Google**: paste the client ID and secret.

## 5. Deploy the frontend to Vercel
1. vercel.com → **Add New → Project** → import `firdaws/travel-diary`.
2. Environment variables: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (from step 1).
3. Deploy. Every pull request now gets its own preview URL automatically.

## 6. Turn on CI deploys of the database
GitHub repo → Settings → Secrets and variables → Actions → add:
- `SUPABASE_ACCESS_TOKEN` (supabase.com/dashboard/account/tokens)
- `SUPABASE_DB_PASSWORD` (from step 1)
- `SUPABASE_PROJECT_REF`

Also create an environment named `production` (Settings → Environments); add yourself as a required reviewer if you want a manual approval before each database push.

## 7. Optional: Supabase Branching (a database per pull request)
Dashboard → Project Settings → Integrations → GitHub → connect the repo, then Branching → enable.
Each pull request gets its own temporary database built from `supabase/migrations`, and `supabase/seed.sql` runs on it.
Note: Branching needs a paid plan. Pair it with the Vercel Supabase integration so each preview points at its branch database.

## Everyday workflow
```bash
supabase migration new my_change   # write SQL
supabase db reset                  # apply all migrations locally
npm run test:db                    # run the RLS tests
npm run types                      # refresh TypeScript types
```
Open a pull request: CI runs the tests. Merge to main: CI pushes the migrations.
