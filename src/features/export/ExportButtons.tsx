import { clusterToLatLngList, clustersToGeoJsonCollection } from '@/lib/exportPolygon'
import { useAppStore } from '@/store/useAppStore'
import type { Cluster } from '@/types/cluster'
import { downloadTextFile } from './downloadFile'

function slugify(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'cluster'
}

export function ClusterExportButtons({ cluster }: { cluster: Cluster }) {
  return (
    <div className="export-buttons">
      <button
        type="button"
        onClick={() =>
          downloadTextFile(
            `${slugify(cluster.name)}.geojson`,
            JSON.stringify(clustersToGeoJsonCollection([cluster]), null, 2),
          )
        }
      >
        Export GeoJSON
      </button>
      <button
        type="button"
        onClick={() =>
          downloadTextFile(`${slugify(cluster.name)}-latlng.json`, JSON.stringify(clusterToLatLngList(cluster), null, 2))
        }
      >
        Export Lat/Lng
      </button>
    </div>
  )
}

export function ExportAllClustersButton() {
  const clusters = useAppStore((s) => s.clusters)
  if (clusters.length === 0) return null

  return (
    <button
      type="button"
      className="export-buttons__all"
      onClick={() => downloadTextFile('clusters.geojson', JSON.stringify(clustersToGeoJsonCollection(clusters), null, 2))}
    >
      Export All ({clusters.length})
    </button>
  )
}
