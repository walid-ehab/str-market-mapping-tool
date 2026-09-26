-- STR Market Mapping Tool — Supabase schema
--
-- Run this once in the Supabase project's SQL Editor (Dashboard → SQL Editor → New query).
-- Re-running is safe: every statement is idempotent (create-if-not-exists / drop-then-create).
--
-- Two tables:
--   listings       Read-only reference data, refreshed monthly from a Snowflake CSV export.
--   state_projects One row per US state: that state's saved clusters + map/report settings,
--                  the direct analog of today's per-project IndexedDB record, keyed by state
--                  instead of an arbitrary project id.

-- ---------------------------------------------------------------------------
-- listings
-- ---------------------------------------------------------------------------

create table if not exists public.listings (
  id text primary key,
  state_code text not null,
  title text,
  property_type text,
  property_host_type text,
  city_name text,
  neighborhood_name text,
  latitude double precision not null,
  longitude double precision not null,
  bedrooms integer,
  bathrooms numeric,
  accommodates integer,
  average_daily_rate_ltm numeric,
  revenue_ltm numeric,
  revenue_potential_ltm numeric,
  occupancy_rate_ltm numeric,
  listing_url text,
  superhost boolean not null default false,
  imported_at timestamptz not null default now()
);

-- The app always queries "give me this state's listings" — this index makes that fast.
create index if not exists listings_state_code_idx on public.listings (state_code);

alter table public.listings enable row level security;

-- Anyone with the anon key can read listings. There is no per-user login yet (open question,
-- see the session's persistence/auth discussion) — tighten this to `to authenticated` once
-- Supabase Auth is wired up.
drop policy if exists "Allow read access to listings" on public.listings;
create policy "Allow read access to listings"
  on public.listings
  for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- state_projects
-- ---------------------------------------------------------------------------

create table if not exists public.state_projects (
  state_code text primary key,
  clusters jsonb not null default '[]'::jsonb,
  revenue_threshold numeric not null default 0,
  color_mode_id text not null default 'default',
  hidden_legend_entries jsonb not null default '{}'::jsonb,
  filter_values jsonb not null default '{}'::jsonb,
  map_style_id text not null default 'default',
  professional_host_types jsonb,
  updated_at timestamptz not null default now()
);

alter table public.state_projects enable row level security;

-- Same open-for-now posture as listings: anyone with the anon key can read and write a
-- state's clusters/settings. Revisit alongside the listings policy once there's real auth.
drop policy if exists "Allow read access to state_projects" on public.state_projects;
create policy "Allow read access to state_projects"
  on public.state_projects
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Allow insert access to state_projects" on public.state_projects;
create policy "Allow insert access to state_projects"
  on public.state_projects
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Allow update access to state_projects" on public.state_projects;
create policy "Allow update access to state_projects"
  on public.state_projects
  for update
  to anon, authenticated
  using (true)
  with check (true);
