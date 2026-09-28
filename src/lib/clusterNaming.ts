import type { Listing } from '@/types/listing'

/** Cities represented among a cluster's listings, most-represented first. */
function cityNamesByFrequency(listings: Listing[]): string[] {
  const counts = new Map<string, number>()
  for (const listing of listings) {
    const city = listing.cityName.trim()
    if (!city) continue
    counts.set(city, (counts.get(city) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([city]) => city)
}

/** Appends " 2", " 3", … the first time a name collides with one already in use. */
function disambiguate(name: string, usedNames: Set<string>): string {
  if (!usedNames.has(name)) return name
  let suffix = 2
  while (usedNames.has(`${name} ${suffix}`)) suffix += 1
  return `${name} ${suffix}`
}

/**
 * Names a cluster after the city (or cities, "-"-joined, most-represented first) its listings
 * fall in — e.g. "Arch Cape - Cannon Beach" — picking a fresh name if that would collide with one
 * already in use, so a second cluster landing in the same city becomes "Cannon Beach 2". Falls
 * back to a numbered "Cluster N" when none of the listings carry a city name at all.
 */
export function nameClusterByCities(listings: Listing[], usedNames: Set<string>, fallbackNumber: number): string {
  const cities = cityNamesByFrequency(listings)
  const base = cities.length > 0 ? cities.join(' - ') : `Cluster ${fallbackNumber}`
  return disambiguate(base, usedNames)
}
