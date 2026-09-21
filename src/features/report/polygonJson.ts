import type { Cluster } from '@/types/cluster'

/**
 * A cluster's polygon as GeoJSON, with the coordinate ring kept on one compact line rather than
 * JSON.stringify's default one-number-per-line expansion — still valid GeoJSON to paste into a
 * boundary-search tool (e.g. Zillow's drawn-boundary search).
 */
export function formatPolygonGeoJson(cluster: Cluster): string {
  const points = cluster.ring.map(([lng, lat]) => `[${lng.toFixed(6)}, ${lat.toFixed(6)}]`).join(', ')
  return `{\n  "type": "Polygon",\n  "coordinates": [[${points}]]\n}`
}
