import type { Listing } from '@/types/listing'

/**
 * In-memory, this-tab-only cache of a state's listings, keyed by state name. Deliberately not
 * sessionStorage/IndexedDB — a big state's listings can run several MB, and a plain module
 * variable is the simplest thing that satisfies "don't reload from the database every time I
 * revisit a state this session." Resets on refresh or tab close, same as everything else that
 * isn't explicitly saved to Supabase.
 */
const cache = new Map<string, Listing[]>()

export function getCachedListings(stateName: string): Listing[] | undefined {
  return cache.get(stateName)
}

export function setCachedListings(stateName: string, listings: Listing[]): void {
  cache.set(stateName, listings)
}
