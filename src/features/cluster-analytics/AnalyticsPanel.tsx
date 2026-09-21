import { ClusterStatTiles } from '@/features/cluster-analytics/ClusterStatTiles'
import { ConfidencePicker } from '@/features/clusters/ConfidencePicker'
import { ClusterExportButtons } from '@/features/export/ExportButtons'
import { useActiveCluster, useClusterAllListings, useClusterListings } from '@/store/selectors'
import { useAppStore } from '@/store/useAppStore'
import { computeClusterStats } from './clusterStats'
import { chartDefinitions } from './registry'

export function AnalyticsPanel() {
  const cluster = useActiveCluster()
  const listings = useClusterListings(cluster)
  const allListings = useClusterAllListings(cluster)
  const revenueThreshold = useAppStore((s) => s.revenueThreshold)
  const setClusterConfidence = useAppStore((s) => s.setClusterConfidence)

  if (!cluster) {
    return <div className="analytics-panel analytics-panel--empty">Draw or select a cluster to see its breakdown.</div>
  }

  const stats = computeClusterStats(allListings, listings)

  return (
    <div className="analytics-panel">
      <div className="analytics-panel__header">
        <span className="analytics-panel__swatch" style={{ backgroundColor: cluster.color }} />
        <h3>{cluster.name}</h3>
      </div>

      <ConfidencePicker value={cluster.confidence} onChange={(confidence) => setClusterConfidence(cluster.id, confidence)} />

      <ClusterStatTiles stats={stats} revenueThreshold={revenueThreshold} />

      <ClusterExportButtons cluster={cluster} />

      {listings.length === 0 ? (
        <div className="analytics-panel__empty">No listings fall inside this polygon with the current filters.</div>
      ) : (
        chartDefinitions.map((chart) => <chart.Component key={chart.id} listings={listings} />)
      )}
    </div>
  )
}
