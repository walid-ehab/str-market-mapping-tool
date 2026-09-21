import type { Cluster } from '@/types/cluster'

/**
 * A cluster's polygon as GeoJSON, formatted with one [lng, lat] pair per line rather than
 * JSON.stringify's default one-number-per-line expansion — compact enough to read at a glance,
 * and still valid GeoJSON to paste into a boundary-search tool (e.g. Zillow's drawn-boundary search).
 */
export function formatPolygonGeoJson(cluster: Cluster): string {
  const points = cluster.ring.map(([lng, lat]) => `      [${lng.toFixed(6)}, ${lat.toFixed(6)}]`).join(',\n')
  return `{\n  "type": "Polygon",\n  "coordinates": [\n    [\n${points}\n    ]\n  ]\n}`
}
