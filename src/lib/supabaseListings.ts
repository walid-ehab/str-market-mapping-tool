import { supabase } from './supabaseClient'
import type { ListingRow } from '@/types/supabaseSchema'
import type { Listing } from '@/types/listing'

// PostgREST caps rows per request (this project's is 1000, confirmed — a larger .range() just
// comes back truncated at 1000 with no error) regardless of an unbounded select. Some states
// (Texas: ~72K rows, Florida: 160K+) need dozens to over a hundred pages — fetched in parallel
// batches (see below), not sequentially, or a big state would take over a minute of serial
// round-trips to load.
const PAGE_SIZE = 1000

// How many pages to fire in parallel per round. Starts small and doubles each round (capped)
// until a round comes back with a short/empty page, confirming the true end — deliberately NOT
// based on an upfront exact row count: `count: 'exact'` over this view reliably hits Postgres's
// statement timeout for the largest states (confirmed against the live project — Florida's
// exact count fails with error 57014 every time, while the same query with no count succeeds in
// well under a second), which was silently turning "click Florida" into "no listings, an error".
const INITIAL_BATCH_SIZE = 20
const MAX_BATCH_SIZE = 100

// Only the columns rowToListing actually reads — the live table has 40+ (ratings, amenities,
// etc. the app doesn't use), and skipping them roughly halves the payload for large states.
const SELECT_COLUMNS = [
  'static_combined_property_id',
  'title',
  'property_type',
  'property_host_type',
  'city_name',
  'state_name',
  'latitude',
  'longitude',
  'bedrooms',
  'bathrooms',
  'accommodates',
  'average_daily_rate_ltm',
  'revenue_ltm',
  'revenue_potential_ltm',
  'occupancy_rate_ltm',
  'superhost',
  'airbnb_listing_url',
  'vrbo_listing_url',
  'booking_listing_url',
].join(',')

function toNumberOrNull(raw: string | number | null): number | null {
  if (raw === null || raw === '') return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

function mergeListingUrl(row: ListingRow): string | null {
  return row.airbnb_listing_url || row.vrbo_listing_url || row.booking_listing_url || null
}

/** Mirrors rowToListing in csv.ts — same shape, sourced from Supabase's snake_case/text-typed columns instead of an uploaded CSV's headers. */
function rowToListing(row: ListingRow, index: number): Listing | null {
  if (row.latitude === null || row.longitude === null) return null

  return {
    id: row.static_combined_property_id || `row-${index}`,
    title: row.title || 'Untitled listing',
    propertyType: row.property_type || '',
    propertyHostType: row.property_host_type ?? '',
    cityName: row.city_name || '',
    stateName: row.state_name || '',
    neighborhoodName: '', // Not present in the live table.
    latitude: row.latitude,
    longitude: row.longitude,
    bedrooms: toNumberOrNull(row.bedrooms) ?? 0,
    bathrooms: toNumberOrNull(row.bathrooms) ?? 0,
    accommodates: row.accommodates ?? 0,
    averageDailyRateLtm: row.average_daily_rate_ltm,
    revenueLtm: row.revenue_ltm,
    revenuePotentialLtm: row.revenue_potential_ltm,
    occupancyRateLtm: row.occupancy_rate_ltm,
    listingUrl: mergeListingUrl(row),
    superhost: (row.superhost || '').toUpperCase() === 'TRUE',
  }
}

const PAGE_RETRIES = 3

async function fetchPageOnce(stateName: string, from: number): Promise<ListingRow[]> {
  const { data, error } = await supabase
    .from('listings')
    .select(SELECT_COLUMNS)
    .eq('state_name', stateName)
    .range(from, from + PAGE_SIZE - 1)
  if (error) throw new Error(error.message)
  // SELECT_COLUMNS is built at runtime (a plain string, not a literal), so supabase-js's
  // select-query-parser can't narrow the returned row's type from it — cast through unknown
  // rather than force a direct (and, for the same reason, invalid) assertion.
  return (data ?? []) as unknown as ListingRow[]
}

// A single page failing (a dropped connection, a transient timeout) shouldn't sink the whole
// state's load — retried a few times with a short backoff before giving up for real.
async function fetchPage(stateName: string, from: number): Promise<ListingRow[]> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fetchPageOnce(stateName, from)
    } catch (err) {
      if (attempt >= PAGE_RETRIES) throw err
      await new Promise((resolve) => setTimeout(resolve, 300 * attempt))
    }
  }
}

/** Fetches every listing for a state (by its full name, e.g. "Texas") from Supabase, paging past PostgREST's per-request row cap with parallel batches — see INITIAL_BATCH_SIZE for why this never asks for an exact row count first. */
export async function fetchListingsForState(stateName: string): Promise<Listing[]> {
  const listings: Listing[] = []
  let from = 0
  let batchSize = INITIAL_BATCH_SIZE
  let reachedEnd = false

  while (!reachedEnd) {
    const pageStarts = Array.from({ length: batchSize }, (_, i) => from + i * PAGE_SIZE)
    const pages = await Promise.all(pageStarts.map((start) => fetchPage(stateName, start)))

    pages.forEach((rows, i) => {
      rows.forEach((row, j) => {
        const listing = rowToListing(row, pageStarts[i] + j)
        if (listing) listings.push(listing)
      })
      // Range-based pagination is monotonic — a page short of PAGE_SIZE (including empty) means
      // every page after it is empty too, so this is a reliable end-of-data signal regardless
      // of where in the batch it shows up.
      if (rows.length < PAGE_SIZE) reachedEnd = true
    })

    from += batchSize * PAGE_SIZE
    batchSize = Math.min(batchSize * 2, MAX_BATCH_SIZE)
  }

  return listings
}
