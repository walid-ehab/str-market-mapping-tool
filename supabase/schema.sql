-- STR Market Mapping Tool — Supabase schema
--
-- Run this once in the Supabase project's SQL Editor (Dashboard → SQL Editor → New query).
-- Re-running is safe: every statement is idempotent (create-if-not-exists / drop-then-create).
--
-- Two tables/views:
--   listings       Already exists in this project as a VIEW over a base table `public.temp`
--                  (confirmed via `select pg_get_viewdef('public.listings'::regclass, true)`),
--                  itself a near-verbatim load of the Snowflake CSV export (876K+ rows,
--                  multiple states), column names lowercased. The view also derives
--                  airbnb_listing_url from static_combined_property_id.
--                  Nothing below creates or alters `listings`/`temp` — this section is
--                  reference documentation only, plus one index on the real base table.
--   state_projects Does not exist yet. One row per US state: that state's saved clusters +
--                  map/report settings — the direct analog of today's per-project IndexedDB
--                  record, keyed by state instead of an arbitrary project id.

-- ---------------------------------------------------------------------------
-- listings (reference only — describes the existing view/base table, changes nothing)
-- ---------------------------------------------------------------------------

-- public.listings (view) columns, for reference:
--   static_combined_property_id, title, property_type, real_estate_type, listing_type,
--   property_host_type, state_name, city_name, postal_code_name, airdna_market,
--   airdna_submarket, latitude, longitude, display_exact_location, location_type,
--   bedrooms, bathrooms, accommodates, minimum_stay, average_daily_rate_ltm, cleaning_fee,
--   cleaning_fee_ltm, revenue_ltm, revenue_potential_ltm, occupancy_rate_ltm,
--   active_listing_nights_ltm, number_of_reservations_ltm, reviews_count, superhost,
--   vrbo_listing_url, booking_listing_url, rating_overall, rating_communication,
--   rating_accuracy, rating_cleanliness, rating_checkin, rating_location, rating_value,
--   has_pool, has_hottub, has_aircon, has_gym, has_pets_allowed, has_kitchen, has_parking,
--   airbnb_listing_url (computed: 'https://www.airbnb.com/rooms/' || id suffix, for ids
--   prefixed 'abnb_'; null otherwise)
--
-- Several fields that look numeric/boolean (bedrooms, bathrooms, reviews_count, ratings,
-- superhost, etc.) are stored as TEXT — the app's mapping layer parses them with Number()
-- the same way csv.ts already does for uploaded CSVs.

-- The app's core query shape is "give me this state's listings" — this index makes that
-- fast across 876K+ rows. Targets public.temp (the view's base table), since Postgres can't
-- index a view directly. Guarded in case `temp` isn't an ordinary table either, or isn't in
-- the public schema — if this notice fires, find the real base table and tell me its name.
do $$
begin
  if exists (
    select 1 from pg_class
    where relname = 'temp' and relnamespace = 'public'::regnamespace and relkind = 'r'
  ) then
    execute 'create index if not exists temp_state_name_idx on public.temp (state_name)';
  else
    raise notice 'Skipping index: public.temp is not an ordinary table — confirm the listings view''s real base table and its schema.';
  end if;
end $$;

-- Access control for `listings` is a standard view GRANT/REVOKE, not RLS — RLS applies to
-- tables, and a view queried by role X only respects row-level security on its base table
-- when the view is created with security_invoker (Postgres 15+); otherwise it runs with the
-- view owner's privileges regardless of who queries it. Whatever grants already exist on
-- this view/table are what's currently allowing anon to read it — nothing here changes that.
-- Revisit deliberately (via REVOKE on the view, or security_invoker + RLS on temp) once the
-- access-model decision (open vs. authenticated-only) is made.

-- ---------------------------------------------------------------------------
-- state_projects
-- ---------------------------------------------------------------------------

create table if not exists public.state_projects (
  state_name text primary key,
  clusters jsonb not null default '[]'::jsonb,
  revenue_threshold numeric not null default 0,
  color_mode_id text not null default 'default',
  hidden_legend_entries jsonb not null default '{}'::jsonb,
  filter_values jsonb not null default '{}'::jsonb,
  map_style_id text not null default 'default',
  professional_host_types jsonb,
  -- Manually toggleable "I've looked at this state" flag, also set true automatically the
  -- moment a cluster is marked Good/Great (never by drawing or auto-detecting a Maybe cluster —
  -- see setClusterConfidence in useAppStore.ts). Powers the landing map's unexplored/explored
  -- color distinction for states with no Good/Great clusters yet.
  explored boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Added after the table already existed in some projects — safe no-op if the column is
-- already there (e.g. on a project created from this file after this line was added).
alter table public.state_projects add column if not exists explored boolean not null default false;

alter table public.state_projects enable row level security;

-- Same open-for-now posture as listings: anyone with the anon key can read and write a
-- state's clusters/settings.
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
