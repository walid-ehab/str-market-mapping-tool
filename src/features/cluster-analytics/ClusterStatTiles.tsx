import { formatCurrency, formatK, formatPercent } from '@/lib/format'
import type { ClusterStats } from './clusterStats'

/** The 5 stat tiles shown for a cluster — shared by the in-app analytics panel and the printable report. */
export function ClusterStatTiles({ stats, revenueThreshold }: { stats: ClusterStats; revenueThreshold: number }) {
  return (
    <div className="analytics-panel__stats">
      <div className="stat-tile" title="Every listing in this polygon, regardless of active filters or legend toggles">
        <span className="stat-tile__label">Total Listings</span>
        <span className="stat-tile__value">{stats.totalListings.toLocaleString()}</span>
      </div>
      <div className="stat-tile">
        <span className="stat-tile__label">Listings</span>
        <span className="stat-tile__value">
          {stats.shownListings.toLocaleString()}
          {stats.pctShown !== null && <span className="stat-tile__suffix"> ({formatPercent(stats.pctShown)})</span>}
        </span>
      </div>
      <div className="stat-tile">
        <span className="stat-tile__label">Avg Revenue</span>
        <span className="stat-tile__value">{formatCurrency(stats.avgRevenue)}</span>
      </div>
      <div className="stat-tile">
        <span className="stat-tile__label">Avg Occupancy</span>
        <span className="stat-tile__value">{formatPercent(stats.avgOccupancy)}</span>
      </div>
      <div className="stat-tile" title="Of all listings in this polygon, regardless of active filters">
        <span className="stat-tile__label">Above {formatK(revenueThreshold)}</span>
        <span className="stat-tile__value">
          {stats.aboveThresholdCount.toLocaleString()}
          {stats.pctAboveThreshold !== null && (
            <span className="stat-tile__suffix"> ({formatPercent(stats.pctAboveThreshold)})</span>
          )}
        </span>
      </div>
    </div>
  )
}
