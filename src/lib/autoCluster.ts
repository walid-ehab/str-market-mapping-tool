import { buffer } from '@turf/buffer'
import { clustersDbscan } from '@turf/clusters-dbscan'
import { concave } from '@turf/concave'
import { convex } from '@turf/convex'
import { featureCollection, point } from '@turf/helpers'
import type { Feature, Polygon, Position } from 'geojson'
import { v4 as uuidv4 } from 'uuid'
import { CLUSTER_CONFIDENCE_COLORS, DEFAULT_CLUSTER_CONFIDENCE } from '@/lib/clusterConfidence'
import type { Cluster } from '@/types/cluster'
import type { Listing } from '@/types/listing'

export interface AutoClusterOptions {
  /** Max distance (miles) between listings for DBSCAN to consider them part of the same group. */
  maxDistanceMiles: number
  /** Minimum listings required for a group to become a cluster; smaller/sparser groups are dropped as noise. */
  minListings: number
}

export const DEFAULT_AUTO_CLUSTER_OPTIONS: AutoClusterOptions = {
  maxDistanceMiles: 1,
  minListings: 8,
}

// A small pad around the hull so listings don't sit exactly on the drawn boundary line.
const HULL_BUFFER_MILES = 0.15
// Above this edge length, concave() starts leaving big empty notches uncarved — past that it's
// no tighter than a convex hull, so just use the (cheaper, always-valid) convex hull instead.
const MAX_CONCAVE_EDGE_MILES = 2

/** Builds a single polygon ring hugging a set of points — concave hull when it succeeds and stays a simple Polygon, convex hull otherwise. */
function hullRing(coords: Position[]): Position[] | null {
  const points = featureCollection(coords.map((c) => point(c)))

  let hull: Feature<Polygon> | null = null
  try {
    const concaveHull = concave(points, { maxEdge: MAX_CONCAVE_EDGE_MILES, units: 'miles' })
    if (concaveHull && concaveHull.geometry.type === 'Polygon') hull = concaveHull as Feature<Polygon>
  } catch {
    // concave() can throw on degenerate/collinear input — fall through to convex.
  }
  if (!hull) hull = convex(points)
  if (!hull) return null

  const buffered = buffer(hull, HULL_BUFFER_MILES, { units: 'miles' })
  if (buffered && buffered.geometry.type === 'Polygon') return buffered.geometry.coordinates[0]
  return hull.geometry.coordinates[0]
}

/**
 * Groups listings into clusters by geographic density (DBSCAN) and wraps each group in a
 * polygon ring, ready to drop straight into the app store alongside manually-drawn clusters —
 * same shape, same default ("Maybe") confidence, fully editable afterward.
 */
export function detectClusters(listings: Listing[], options: AutoClusterOptions, existingClusterCount: number): Cluster[] {
  const withCoords = listings.filter((l) => Number.isFinite(l.latitude) && Number.isFinite(l.longitude))
  if (withCoords.length === 0) return []

  const points = featureCollection(withCoords.map((l) => point([l.longitude, l.latitude])))
  const clustered = clustersDbscan(points, options.maxDistanceMiles, {
    units: 'miles',
    minPoints: options.minListings,
  })

  const coordsByCluster = new Map<number, Position[]>()
  for (const feature of clustered.features) {
    const clusterId = feature.properties?.cluster
    if (clusterId === undefined || feature.properties?.dbscan === 'noise') continue
    const coords = coordsByCluster.get(clusterId) ?? []
    coords.push(feature.geometry.coordinates)
    coordsByCluster.set(clusterId, coords)
  }

  const clusters: Cluster[] = []
  let nextNumber = existingClusterCount
  for (const coords of coordsByCluster.values()) {
    const ring = hullRing(coords)
    if (!ring) continue
    nextNumber += 1
    clusters.push({
      id: uuidv4(),
      name: `Cluster ${nextNumber}`,
      confidence: DEFAULT_CLUSTER_CONFIDENCE,
      color: CLUSTER_CONFIDENCE_COLORS[DEFAULT_CLUSTER_CONFIDENCE],
      ring,
      createdAt: Date.now(),
      notes: '',
    })
  }
  return clusters
}
