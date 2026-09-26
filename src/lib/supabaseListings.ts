import { supabase } from './supabaseClient'
import type { ListingRow } from '@/types/supabaseSchema'
import type { Listing } from '@/types/listing'

// PostgREST caps rows per request (this project's is 1000, confirmed — a larger .range() just
// comes back truncated at 1000 with no error) regardless of an unbounded select. Some states
// (Texas: ~72K rows) need dozens of pages — fetched in parallel (see below), not sequentially,
// or a big state would take over a minute of serial round-trips to load.
const PAGE_SIZE = 1000

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

/** Fetches every listing for a state (by its full name, e.g. "Texas") from Supabase, paging past PostgREST's per-request row cap with parallel requests once the total count is known. */
export async function fetchListingsForState(stateName: string): Promise<Listing[]> {
  const { count, error: countError } = await supabase
    .from('listings')
    .select('static_combined_property_id', { count: 'exact', head: true })
    .eq('state_name', stateName)

  if (countError) throw new Error(countError.message)
  const total = count ?? 0
  if (total === 0) return []

  const pageCount = Math.ceil(total / PAGE_SIZE)
  const pages = await Promise.all(
    Array.from({ length: pageCount }, (_, i) => {
      const from = i * PAGE_SIZE
      return supabase
        .from('listings')
        .select(SELECT_COLUMNS)
        .eq('state_name', stateName)
        .range(from, from + PAGE_SIZE - 1)
    }),
  )

  const listings: Listing[] = []
  pages.forEach(({ data, error }, pageIndex) => {
    if (error) throw new Error(error.message)
    ;(data ?? []).forEach((row, i) => {
      const listing = rowToListing(row as ListingRow, pageIndex * PAGE_SIZE + i)
      if (listing) listings.push(listing)
    })
  })

  return listings
}
