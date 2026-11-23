# Travel Diary: Supabase dogfooding plan

Next.js frontend on Vercel, Supabase backend. Built to learn Supabase end to end.

## What the app does

- Anyone can sign up and keep **their own lists**: places they've **visited** (country, optional city, month/year, notes, photos) and a **wishlist** (same, plus optional target month).
- "Mark as visited" turns a wishlist item into a visited trip.
- Anyone can start a **group trip** and invite people by email. The group trip view pulls in **every member's visited and wishlist places** in one view, so everyone sees where each member has been and wants to go.
- Each country shows a **visa badge** (visa-free, visa on arrival, eTA, visa required, plus allowed stay) for the **logged-in user's passport**.
- A **world map** colors visited and wishlist countries.
- The group trip owner picks a **theme color** for that group trip.

## Sharing rule

You share your **whole list** with everyone in any group trip you're in. Leaving a group trip removes their access. Per-group sharing choices are a possible later upgrade.

## Roles

| Who | Can do |
|---|---|
| You (on your own lists) | Add, edit, delete your own trips and wishlist |
| Group trip owner | Invite/remove members, change theme, delete the group trip |
| Group trip member | See the group trip and every member's lists. Can leave. Cannot edit others' entries |

## Data

| Table | What it holds |
|---|---|
| `profiles` | name and passport country per user |
| `trips` | **personal** visited places: user, country, city, month/year, notes |
| `wishlist_items` | **personal** wishlist: user, country, city, target month, notes |
| `trip_photos` | links a trip to a file in Storage |
| `group_trips` | name, owner, `theme` (JSON) |
| `group_trip_members` | who is in which group trip, and their role |
| `countries` | ISO alpha-2 list (seeded) |
| `visa_requirements` | cached visa results: passport, destination, status, stay days, `fetched_at` |

A group trip stores no places itself. It reads its members' `trips` and `wishlist_items` through an RLS rule: *you can read a row if it's yours, or you share a group trip with its owner.*

## Build phases

| # | Phase | Supabase feature learned | Status |
|---|---|---|---|
| 0 | Local setup: CLI, OrbStack/Docker, Next.js, git | CLI, migrations, local dev | done |
| 1 | Sign-in (email+password, magic link, Google), profiles | **Auth**, triggers | done (Google untested) |
| 2 | Group trips, members, email invites | **RLS**, **Edge Functions**, Auth invite | done |
| 2b | Personal `trips` and `wishlist_items` tables with sharing RLS | RLS across tables | done (tables only, no UI) |
| 3 | Seed `countries`; replace the temporary country list | reference data in migrations, foreign keys | done |
| 4 | UI: my visited list and my wishlist, "Mark as visited" | CRUD, **RPC** (Postgres function) | done (photos come in phase 6) |
| 5 | Group trip view: all members' places together, filter by member | joins, views (`security_invoker`) | done |
| 6 | Trip photos | **Storage** + storage policies | next |
| 7 | Visa lookup: check our table, call Travel Buddy only on a miss, cache | Edge Functions, secrets | |
| 8 | Live updates in the group trip; event when someone joins | **Realtime**, **database webhooks** | |
| 9 | World map and per-group-trip theme | JSON columns | |
| 10 | Tests, CI, preview deploys, production deploy | see below | |

## Engineering workflow

- **pgTAP tests**: automated checks that RLS really blocks outsiders (`supabase test db`).
- **GitHub Actions**: runs tests and pushes migrations on each PR/merge.
- **Supabase Branching + Vercel previews**: each PR gets its own database and preview site.
- **Generated TypeScript types**: `supabase gen types` (already in use).

## Decisions made

- Personal lists first; group trips pull members' lists together
- Whole list is shared with group trip members
- Invite by email; passport country set on first login
- Visa data: Travel Buddy API, fetched only when not already in our DB; simple color-coded badge
- Countries from a free ISO alpha-2 dataset (seeded); city is free text
- Sign-in: email+password, magic link, Google
- Realtime and webhooks in scope. Not in scope for now: pg_cron refresh, pgvector
- Next.js "Cache Components" mode turned off (our pages are all per-user)

## Open items

- Sign up for a Travel Buddy API key and confirm free-tier limits; check its Endpoints tab for a countries list
- Phase 7: the ISO list has 249 countries and no Kosovo (`XK`); check Travel Buddy's codes against it
- Cosmetic: country names sort by byte order, so "Åland Islands" lands second
- Google OAuth app setup (needs a Google Cloud project)
