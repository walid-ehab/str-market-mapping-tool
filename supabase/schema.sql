-- STR Market Mapping Tool — Supabase schema
--
-- Run this once in the Supabase project's SQL Editor (Dashboard → SQL Editor → New query).
-- Re-running is safe: every statement is idempotent (create-if-not-exists / drop-then-create).
--
-- Two tables:
--   listings       Already exists in this project — a near-verbatim load of the Snowflake
--                  CSV export (876K+ rows, multiple states), column names lowercased.
--                  The block below documents its real shape and adds a lookup index; it does
--                  NOT alter or recreate the table (create table if not exists is a no-op
--                  here), so no constraint declared below is actually enforced unless it
--                  already was.
--   state_projects Does not exist yet. One row per US state: that state's saved clusters +
--                  map/report settings — the direct analog of today's per-project IndexedDB
--                  record, keyed by state instead of an arbitrary project id.

-- ---------------------------------------------------------------------------
-- listings (documentation only — table already exists with this shape)
-- ---------------------------------------------------------------------------

create table if not exists public.listings (
  static_combined_property_id text,
  title text,
  property_type text,
  real_estate_type text,
  listing_type text,
  property_host_type text,
  state_name text,
  city_name text,
  postal_code_name text,
  airdna_market text,
  airdna_submarket text,
  latitude double precision,
  longitude double precision,
  display_exact_location text,
  location_type text,
  -- Numeric-looking fields below are stored as TEXT in the live table (a straight lowercase
  -- of the CSV export) — the app's mapping layer parses them with Number(), same as csv.ts
  -- does for uploaded CSVs. Left as text here rather than silently redeclaring a type the
  -- live column doesn't actually have.
  bedrooms text,
  bathrooms text,
  accommodates integer,
  minimum_stay text,
  average_daily_rate_ltm numeric,
  cleaning_fee text,
  cleaning_fee_ltm numeric,
  revenue_ltm numeric,
  revenue_potential_ltm numeric,
  occupancy_rate_ltm numeric,
  active_listing_nights_ltm numeric,
  number_of_reservations_ltm numeric,
  reviews_count text,
  -- Also text ("True"/"False"), not boolean, in the live table.
  superhost text,
  vrbo_listing_url text,
  booking_listing_url text,
  rating_overall text,
  rating_communication text,
  rating_accuracy text,
  rating_cleanliness text,
  rating_checkin text,
  rating_location text,
  rating_value text,
  has_pool boolean,
  has_hottub boolean,
  has_aircon boolean,
  has_gym boolean,
  has_pets_allowed boolean,
  has_kitchen boolean,
  airbnb_listing_url text
);

-- The app's core query shape is "give me this state's listings" — this index makes that
-- fast across 876K+ rows. Safe to add regardless of whether the table pre-existed.
create index if not exists listings_state_name_idx on public.listings (state_name);

alter table public.listings enable row level security;

-- Open to anon for now (matches this project's current live policy) — the whole dataset is
-- readable by anyone holding the anon key, which ships in the public client bundle. Revisit
-- if/when this data needs to stop being publicly reachable.
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
  state_name text primary key,
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
