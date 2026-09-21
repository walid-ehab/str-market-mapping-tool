/** A single short-term-rental listing, normalized from an uploaded CSV row. */
export interface Listing {
  id: string
  title: string
  propertyType: string
  propertyHostType: string
  isProfessionallyHosted: boolean
  cityName: string
  stateName: string
  neighborhoodName: string
  latitude: number
  longitude: number
  bedrooms: number
  bathrooms: number
  accommodates: number
  averageDailyRateLtm: number | null
  revenueLtm: number | null
  revenuePotentialLtm: number | null
  occupancyRateLtm: number | null
  listingUrl: string | null
  superhost: boolean
}

export type RevenueTierId = 'below' | 'q1' | 'q2' | 'q3' | 'q4'

export interface RevenueTiering {
  tierByListingId: Map<string, RevenueTierId>
  labelByTier: Record<RevenueTierId, string>
  threshold: number
}

/** A Listing enriched with the currently-active revenue tiering. Recomputed whenever the threshold changes. */
export interface EnrichedListing extends Listing {
  revenueTierId: RevenueTierId
  revenueTierLabel: string
}
