# Dogfooding overview

What we built and where to look. The app is a travel diary: personal visited places and wishlist, plus group trips that pull every member's places into one view.

| Area | What we did | Where to look |
|---|---|---|
| **Database (Postgres)** | Tables for profiles, trips, wishlist, group trips and members. Also a countries table (249 rows), a view, an RPC (`mark_wishlist_visited`) and triggers. | `supabase/migrations/`; Studio → Table Editor |
| **Auth** | Email and password, magic link, and Google. Invites go through the admin API. Redirect URL allow-list for production and previews. | `supabase/config.toml`; Dashboard → Authentication |
| **RLS** | Everything is private by default. You can see your own rows and your group trip members' rows. Only owners can change a group trip. Security-definer helper functions avoid policy recursion. | the `create policy` lines in the migrations; `supabase/tests/database/rls.test.sql` |
| **Storage** | Private photo bucket with size and type limits, storage policies, and signed URLs. | the `trip_photos` migration; Dashboard → Storage |
| **Edge Functions** | `invite-member`, `visa-lookup` (API cache, calls the API only on a cache miss) and `member-joined` (a webhook receiver). | `supabase/functions/`; Dashboard → Edge Functions → Logs |
| **Realtime** | Broadcast from the database, private channels with RLS, and Presence avatars. A member joining, a theme change or a new chat message shows up live. | `src/components/group-live.tsx`; the realtime migration |
| **Database webhooks** | `pg_net` calls the `member-joined` function when a member is added. The secret is in Vault. | `20261123160335_realtime_and_webhooks.sql`; Dashboard → Integrations → Vault |
| **Types** | Generated TypeScript types. CI fails if they're out of date. | `src/lib/database.types.ts`; `npm run types` |
| **Local-first CLI workflow** | `supabase start`, `migration new`, `db reset` and `db push`. | `supabase/` folder; `DEPLOY.md` |
| **Testing** | pgTAP tests of the security rules (30). | `npm run test:db` |
| **CI/CD** | Lint, build and database tests on every push. On `main`, migrations and functions deploy automatically. | `.github/workflows/ci.yml`; GitHub → Actions |
| **Hosting** | Vercel for the frontend, with preview URLs per pull request. | Vercel dashboard |

## See how it works

1. **Follow one feature end to end.** Adding a trip touches the form in `src/app/(app)/trips/`, then a table insert, then RLS, then the group view reading it.
2. **Break a rule on purpose.** Read `rls.test.sql`, then try to read another user's trip. It returns nothing.
3. **Watch the live parts.** Open a group trip in two windows and add a member or change the theme.
4. **Read the logs.** Dashboard → Edge Functions → `visa-lookup` → Logs shows the cache-miss API calls.

## Not covered yet

Supabase Branching (needs a paid plan). Not used at all: cron jobs, vector search and AI, GraphQL.

See `PLAN.md` for decisions and phases, and `DEPLOY.md` for going live.
