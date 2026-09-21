import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import { point, polygon } from '@turf/helpers'
import type { Position } from 'geojson'
import type { Cluster } from '@/types/cluster'
import type { Listing } from '@/types/listing'

export function listingsInsideRing<T extends Listing>(listings: T[], ring: Position[]): T[] {
  const poly = polygon([ring])
  return listings.filter((listing) => booleanPointInPolygon(point([listing.longitude, listing.latitude]), poly))
}

export function listingsInCluster<T extends Listing>(listings: T[], cluster: Cluster): T[] {
  return listingsInsideRing(listings, cluster.ring)
}
