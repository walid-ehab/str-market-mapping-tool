import { ClusterExportButtons } from '@/features/export/ExportButtons'
import { formatCurrency, formatPercent } from '@/lib/format'
import { useActiveCluster, useClusterListings } from '@/store/selectors'
import { chartDefinitions } from './registry'

function average(values: number[]): number | null {
  if (values.length === 0) return null
  let sum = 0
  for (const v of values) sum += v
  return sum / values.length
}

export function AnalyticsPanel() {
  const cluster = useActiveCluster()
  const listings = useClusterListings(cluster)

  if (!cluster) {
    return <div className="analytics-panel analytics-panel--empty">Draw or select a cluster to see its breakdown.</div>
  }

  const avgRevenue = average(listings.map((l) => l.revenuePotentialLtm).filter((v): v is number => v !== null))
  const avgOccupancy = average(listings.map((l) => l.occupancyRateLtm).filter((v): v is number => v !== null))

  return (
    <div className="analytics-panel">
      <div className="analytics-panel__header">
        <span className="analytics-panel__swatch" style={{ backgroundColor: cluster.color }} />
        <h3>{cluster.name}</h3>
      </div>

      <div className="analytics-panel__stats">
        <div className="stat-tile">
          <span className="stat-tile__label">Listings</span>
          <span className="stat-tile__value">{listings.length.toLocaleString()}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-tile__label">Avg Revenue</span>
          <span className="stat-tile__value">{formatCurrency(avgRevenue)}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-tile__label">Avg Occupancy</span>
          <span className="stat-tile__value">{formatPercent(avgOccupancy)}</span>
        </div>
      </div>

      <ClusterExportButtons cluster={cluster} />

      {listings.length === 0 ? (
        <div className="analytics-panel__empty">No listings fall inside this polygon with the current filters.</div>
      ) : (
        chartDefinitions.map((chart) => <chart.Component key={chart.id} listings={listings} />)
      )}
    </div>
  )
}
