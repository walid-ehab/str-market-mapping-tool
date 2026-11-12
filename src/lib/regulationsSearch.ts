import type { EnrichedListing } from '@/types/listing'

/** Most common city among a cluster's listings — a cluster can span more than one city, so this picks whichever one most of its listings actually sit in, since that's the one whose regulations matter most. */
export function dominantCityName(listings: EnrichedListing[]): string | null {
  if (listings.length === 0) return null

  const counts = new Map<string, number>()
  for (const listing of listings) {
    counts.set(listing.cityName, (counts.get(listing.cityName) ?? 0) + 1)
  }

  let best: string | null = null
  let bestCount = 0
  for (const [city, count] of counts) {
    if (count > bestCount) {
      best = city
      bestCount = count
    }
  }
  return best
}

/** A plain Google search for a city/state's short-term rental regulations — no API, just the public search URL. */
export function buildRegulationsSearchUrl(cityName: string, stateName: string): string {
  const query = `${cityName} ${stateName} short-term rental regulations ordinance`
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`
}
