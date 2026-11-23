# Travel Diary: Supabase dogfooding plan

A shared travel diary. Next.js frontend on Vercel, Supabase backend. Built to learn Supabase end to end.

## What the app does

- Anyone can create a **diary** and invite people by email. Only members see it.
- Members log **past trips** (country, optional city, month/year, notes, photos).
- Members keep a **wishlist** (same fields, plus an optional target month). "Mark as visited" turns a wish into a trip.
- Each country page shows a **visa badge** (visa-free, visa on arrival, eTA, visa required, plus allowed stay) for the **logged-in user's passport**.
- A **world map** colors visited and wishlist countries.
- The owner picks a **theme color** per diary.

## Roles

| Role | Can do |
|---|---|
| Owner | Everything: invite/remove members, change theme, edit anything |
| Member | Read everything in the diary. Edit/delete only their own entries |

## Data (Postgres tables, in plain words)

| Table | What it holds |
|---|---|
| `profiles` | name and passport country for each user |
| `countries` | ISO country list (seeded) |
| `diaries` | name, owner, `theme` (JSON) |
| `diary_members` | who is in which diary, and their role |
| `trips` | diary, user, country, city, month/year, notes |
| `wishlist_items` | same as trips, plus target month |
| `trip_photos` | links a trip to a file in Storage |
| `visa_requirements` | cached visa results: passport, destination, status, stay days, `fetched_at` |

## Build phases (each one teaches a Supabase feature)

| # | Phase | Supabase feature learned |
|---|---|---|
| 0 | Local setup: Supabase CLI + Docker, Next.js app, git, migrations folder | CLI, migrations, local dev |
| 1 | Sign-in: email+password, magic link, Google. Profile with passport country | **Auth**, triggers |
| 2 | Diaries, members, email invites. Lock data so only members can read it | **RLS** (row-level security), Auth invite |
| 3 | Seed the countries table (city stays free text) | seed files |
| 4 | Trips and wishlist. "Mark as visited" as one atomic action | CRUD, **RPC** (Postgres functions) |
| 5 | Photo upload per trip | **Storage** + storage policies |
| 6 | Visa lookup: check our table, call Travel Buddy only on a miss, save the result | **Edge Functions**, secrets |
| 7 | Live feed when someone adds a trip. Event when someone joins a diary | **Realtime**, **database webhooks** |
| 8 | World map and per-diary theme | JSON columns, queries/views |
| 9 | Tests, CI, preview deploys, production deploy | see next section |

## Engineering workflow

- **pgTAP tests**: automated checks that RLS really blocks outsiders (`supabase test db`).
- **GitHub Actions**: runs the tests and pushes migrations on each PR/merge.
- **Supabase Branching + Vercel previews**: each PR gets its own database and its own preview site.
- **Generated TypeScript types**: `supabase gen types` keeps the frontend in sync with the database.

## Decisions made

- Shared diaries, multiple allowed, members only
- Invite by email (name, email); passport country set on first login
- Visa data: Travel Buddy API, fetched only when not already in our DB
- Simple visa badge (not rich detail)
- Country from a free ISO alpha-2 dataset (seeded), so codes match Travel Buddy; city is free text
- Realtime and webhooks in scope. Not in scope for now: pg_cron refresh, pgvector

## Open items

- Sign up for a Travel Buddy API key and confirm free-tier limits
- Download the ISO alpha-2 countries CSV for the seed (phase 3)
- Check Travel Buddy's RapidAPI Endpoints tab for a list-countries endpoint once we have a key
- Google OAuth app setup (needs a Google Cloud project)
