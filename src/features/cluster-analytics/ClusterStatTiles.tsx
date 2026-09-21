import { formatCurrency, formatK, formatPercent } from '@/lib/format'
import type { ClusterStats } from './clusterStats'

interface ClusterStatTilesProps {
  stats: ClusterStats
  revenueThreshold: number
  /** 'report' drops the filtered "Listings" tile and reorders Above-threshold right after Total Listings. */
  variant?: 'full' | 'report'
}

/** The stat tiles shown for a cluster — shared by the in-app analytics panel and the printable report. */
export function ClusterStatTiles({ stats, revenueThreshold, variant = 'full' }: ClusterStatTilesProps) {
  const totalTile = (
    <div key="total" className="stat-tile" title="Every listing in this polygon, regardless of active filters or legend toggles">
      <span className="stat-tile__label">Total Listings</span>
      <span className="stat-tile__value">{stats.totalListings.toLocaleString()}</span>
    </div>
  )
  const listingsTile = (
    <div key="listings" className="stat-tile">
      <span className="stat-tile__label">Listings</span>
      <span className="stat-tile__value">
        {stats.shownListings.toLocaleString()}
        {stats.pctShown !== null && <span className="stat-tile__suffix"> ({formatPercent(stats.pctShown)})</span>}
      </span>
    </div>
  )
  const revenueTile = (
    <div key="revenue" className="stat-tile">
      <span className="stat-tile__label">Avg Revenue</span>
      <span className="stat-tile__value">{formatCurrency(stats.avgRevenue)}</span>
    </div>
  )
  const occupancyTile = (
    <div key="occupancy" className="stat-tile">
      <span className="stat-tile__label">Avg Occupancy</span>
      <span className="stat-tile__value">{formatPercent(stats.avgOccupancy)}</span>
    </div>
  )
  const aboveTile = (
    <div key="above" className="stat-tile" title="Of all listings in this polygon, regardless of active filters">
      <span className="stat-tile__label">Above {formatK(revenueThreshold)}</span>
      <span className="stat-tile__value">
        {stats.aboveThresholdCount.toLocaleString()}
        {stats.pctAboveThreshold !== null && (
          <span className="stat-tile__suffix"> ({formatPercent(stats.pctAboveThreshold)})</span>
        )}
      </span>
    </div>
  )

  const tiles =
    variant === 'report'
      ? [totalTile, aboveTile, revenueTile, occupancyTile]
      : [totalTile, listingsTile, revenueTile, occupancyTile, aboveTile]

  return <div className="analytics-panel__stats">{tiles}</div>
}
