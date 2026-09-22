/** A single short-term-rental listing, normalized from an uploaded CSV row. */
export interface Listing {
  id: string
  title: string
  propertyType: string
  propertyHostType: string
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

/** A Listing enriched with derived, setting-dependent fields. Recomputed whenever those settings change. */
export interface EnrichedListing extends Listing {
  revenueTierId: RevenueTierId
  revenueTierLabel: string
  /** Whether propertyHostType is one of the user's configured "professional" host types. */
  isProfessionallyHosted: boolean
}
