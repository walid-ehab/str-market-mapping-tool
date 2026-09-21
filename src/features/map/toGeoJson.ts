import type { Feature, FeatureCollection, Point } from 'geojson'
import type { ColorMode } from '@/features/color-modes/types'
import type { EnrichedListing } from '@/types/listing'

export interface ListingFeatureProperties {
  id: string
  title: string
  color: string
  revenue: number
  bedrooms: number
  bathrooms: number
  accommodates: number
  adr: number | null
  occupancy: number | null
  cityName: string
  stateName: string
  isProfessionallyHosted: boolean
  listingUrl: string | null
}

export function listingsToGeoJson(
  listings: EnrichedListing[],
  colorMode: ColorMode,
): FeatureCollection<Point, ListingFeatureProperties> {
  const features: Feature<Point, ListingFeatureProperties>[] = listings.map((listing) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [listing.longitude, listing.latitude] },
    properties: {
      id: listing.id,
      title: listing.title,
      color: colorMode.getColor(listing),
      revenue: listing.revenuePotentialLtm ?? 0,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      accommodates: listing.accommodates,
      adr: listing.averageDailyRateLtm,
      occupancy: listing.occupancyRateLtm,
      cityName: listing.cityName,
      stateName: listing.stateName,
      isProfessionallyHosted: listing.isProfessionallyHosted,
      listingUrl: listing.listingUrl,
    },
  }))
  return { type: 'FeatureCollection', features }
}
