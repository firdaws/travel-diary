-- Visa requirements: a cache of answers from the Travel Buddy API.
-- One row per (passport country, destination country). We only call the API when a
-- pair isn't here yet, or when a row is old.

create table public.visa_requirements (
  passport_country char(2) not null references public.countries (code),
  destination_country char(2) not null references public.countries (code),
  -- A simple, app-friendly status. The Edge Function maps the API's wording onto these.
  status text not null check (status in ('visa_free', 'visa_on_arrival', 'evisa', 'eta', 'visa_required')),
  stay_days integer check (stay_days > 0),
  stay_text text,        -- e.g. "90 days"
  link text,             -- official or e-visa link, when the API gives one
  source text not null default 'travel-buddy',
  raw jsonb,             -- the original API answer, kept for debugging
  fetched_at timestamptz not null default now(),
  primary key (passport_country, destination_country)
);

alter table public.visa_requirements enable row level security;

-- Anyone signed in can read the cache (it's reference data, not personal data).
-- There are NO insert/update/delete policies on purpose: only the Edge Function,
-- using the service role key, can write. Users can't plant fake visa answers.
create policy "Signed-in users can read visa requirements"
  on public.visa_requirements for select to authenticated
  using (true);
