import { buffer } from '@turf/buffer'
import { clustersDbscan } from '@turf/clusters-dbscan'
import { concave } from '@turf/concave'
import { convex } from '@turf/convex'
import { featureCollection, point, polygon } from '@turf/helpers'
import { simplify } from '@turf/simplify'
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
  /** Pad (miles) around the hull so an edge listing doesn't sit exactly on the drawn boundary line. */
  bufferMiles: number
  /** How aggressively to cut vertices from the drawn boundary afterward, so it's easier to hand-edit — 0 disables it. */
  simplifyToleranceMiles: number
}

export const DEFAULT_AUTO_CLUSTER_OPTIONS: AutoClusterOptions = {
  maxDistanceMiles: 1,
  minListings: 8,
  bufferMiles: 0.15,
  simplifyToleranceMiles: 0.05,
}

// Above this edge length, concave() starts leaving big empty notches uncarved — past that it's
// no tighter than a convex hull, so just use the (cheaper, always-valid) convex hull instead.
const MAX_CONCAVE_EDGE_MILES = 2

/** Builds the raw hull ring for a point cloud — concave when it succeeds and stays a simple Polygon, convex otherwise — then pads it. */
function rawHullRing(coords: Position[], bufferMiles: number): Position[] | null {
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
  if (bufferMiles <= 0) return hull.geometry.coordinates[0]

  const buffered = buffer(hull, bufferMiles, { units: 'miles' })
  if (buffered && buffered.geometry.type === 'Polygon') return buffered.geometry.coordinates[0]
  return hull.geometry.coordinates[0]
}

// simplify()'s tolerance is in the geometry's own coordinate units (degrees of lat/lng), not a
// real-world distance — this is a rough conversion good enough for a UI slider about "how
// aggressively to cut vertices," not one that needs geodetic precision.
const MILES_PER_DEGREE = 69

/** Runs Douglas-Peucker simplification on a ring to cut vertices — a concave hull can otherwise carry a jag for every little notch in the point cloud, which is tedious to hand-edit afterward. */
function simplifyRing(ring: Position[], toleranceMiles: number): Position[] {
  if (toleranceMiles <= 0) return ring
  const simplified = simplify(polygon([ring]), { tolerance: toleranceMiles / MILES_PER_DEGREE, highQuality: true })
  const simplifiedRing = simplified.geometry.coordinates[0]
  // A linear ring needs at least 4 positions (3 distinct vertices + closing point) — over-aggressive
  // simplification of a small/thin hull can collapse it past that, so fall back to the unsimplified ring.
  return simplifiedRing.length >= 4 ? simplifiedRing : ring
}

/** Builds a single, hand-editable polygon ring hugging a set of points. */
function hullRing(coords: Position[], bufferMiles: number, simplifyToleranceMiles: number): Position[] | null {
  const ring = rawHullRing(coords, bufferMiles)
  return ring ? simplifyRing(ring, simplifyToleranceMiles) : null
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
    const ring = hullRing(coords, options.bufferMiles, options.simplifyToleranceMiles)
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
