import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import { point, polygon } from '@turf/helpers'
import type { Position } from 'geojson'
import { minMax } from '@/lib/math'
import type { Cluster } from '@/types/cluster'
import type { Listing } from '@/types/listing'

export function listingsInsideRing<T extends Listing>(listings: T[], ring: Position[]): T[] {
  const poly = polygon([ring])
  return listings.filter((listing) => booleanPointInPolygon(point([listing.longitude, listing.latitude]), poly))
}

export function listingsInCluster<T extends Listing>(listings: T[], cluster: Cluster): T[] {
  return listingsInsideRing(listings, cluster.ring)
}

export interface LngLatBounds {
  sw: [number, number]
  ne: [number, number]
}

export function ringBounds(ring: Position[]): LngLatBounds | null {
  const lngRange = minMax(ring.map((p) => p[0]))
  const latRange = minMax(ring.map((p) => p[1]))
  if (!lngRange || !latRange) return null
  return { sw: [lngRange.min, latRange.min], ne: [lngRange.max, latRange.max] }
}

/** Bounds enclosing every listing's coordinates — the map's "home" view for a dataset. */
export function datasetBounds<T extends Listing>(listings: T[]): LngLatBounds | null {
  const lngRange = minMax(listings.map((l) => l.longitude))
  const latRange = minMax(listings.map((l) => l.latitude))
  if (!lngRange || !latRange) return null
  return { sw: [lngRange.min, latRange.min], ne: [lngRange.max, latRange.max] }
}
