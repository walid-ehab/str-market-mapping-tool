import type { Feature, FeatureCollection, Polygon } from 'geojson'
import type { Cluster } from '@/types/cluster'

export interface LatLng {
  lat: number
  lng: number
}

export function clusterToGeoJsonFeature(cluster: Cluster): Feature<Polygon, { name: string }> {
  return {
    type: 'Feature',
    properties: { name: cluster.name },
    geometry: { type: 'Polygon', coordinates: [cluster.ring] },
  }
}

export function clustersToGeoJsonCollection(clusters: Cluster[]): FeatureCollection<Polygon, { name: string }> {
  return { type: 'FeatureCollection', features: clusters.map(clusterToGeoJsonFeature) }
}

export function clusterToLatLngList(cluster: Cluster): LatLng[] {
  return cluster.ring.map(([lng, lat]) => ({ lat, lng }))
}
