import { useRef, useState } from 'react'
import { DEFAULT_AUTO_CLUSTER_OPTIONS, detectClusters } from '@/lib/autoCluster'
import { useAppStore } from '@/store/useAppStore'

/**
 * Runs DBSCAN over listings above the revenue threshold to propose clusters, which land in the
 * normal cluster list — reviewable and editable exactly like a hand-drawn polygon. Clicking the
 * button again replaces the previous auto-detected batch (tracked only for this component's
 * lifetime) instead of piling duplicates on top of it; manually-drawn clusters are never touched.
 */
export function AutoDetectClusters() {
  const listings = useAppStore((s) => s.listings)
  const revenueThreshold = useAppStore((s) => s.revenueThreshold)
  const clusterCount = useAppStore((s) => s.clusters.length)
  const addClusters = useAppStore((s) => s.addClusters)
  const removeClusters = useAppStore((s) => s.removeClusters)

  const [maxDistanceMiles, setMaxDistanceMiles] = useState(DEFAULT_AUTO_CLUSTER_OPTIONS.maxDistanceMiles)
  const [minListings, setMinListings] = useState(DEFAULT_AUTO_CLUSTER_OPTIONS.minListings)
  const [isRunning, setIsRunning] = useState(false)
  const [lastResultCount, setLastResultCount] = useState<number | null>(null)
  const lastBatchIds = useRef<string[]>([])

  if (listings.length === 0) return null

  const aboveThreshold = listings.filter((l) => l.revenuePotentialLtm !== null && l.revenuePotentialLtm > revenueThreshold)

  const run = () => {
    setIsRunning(true)
    setLastResultCount(null)
    // Let the "Detecting…" state paint before the (synchronous) clustering pass blocks the main thread.
    requestAnimationFrame(() => {
      removeClusters(lastBatchIds.current)
      const baseCount = clusterCount - lastBatchIds.current.length
      const detected = detectClusters(aboveThreshold, { maxDistanceMiles, minListings }, baseCount)
      addClusters(detected)
      lastBatchIds.current = detected.map((c) => c.id)
      setLastResultCount(detected.length)
      setIsRunning(false)
    })
  }

  return (
    <div className="auto-cluster">
      <p className="auto-cluster__hint">
        Groups the {aboveThreshold.length.toLocaleString()} listing{aboveThreshold.length === 1 ? '' : 's'} above the
        revenue threshold (${revenueThreshold.toLocaleString()}) by geographic density.
      </p>

      <div className="filter-panel__section">
        <div className="filter-panel__label">Sensitivity ({maxDistanceMiles.toFixed(1)} mi)</div>
        <div className="filter-control__row">
          <input
            type="range"
            min={0.1}
            max={3}
            step={0.1}
            value={maxDistanceMiles}
            onChange={(e) => setMaxDistanceMiles(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="filter-panel__section">
        <div className="filter-panel__label">Min listings per cluster</div>
        <div className="filter-control__row">
          <input
            type="number"
            className="filter-control__number"
            min={2}
            step={1}
            value={minListings}
            onChange={(e) => setMinListings(Math.max(2, Number(e.target.value) || 2))}
          />
        </div>
      </div>

      <button type="button" className="auto-cluster__button" disabled={isRunning || aboveThreshold.length === 0} onClick={run}>
        {isRunning ? 'Detecting…' : 'Auto-Detect Clusters'}
      </button>

      {aboveThreshold.length === 0 && (
        <p className="auto-cluster__hint">No listings are above the current revenue threshold — lower it to enable detection.</p>
      )}

      {lastResultCount !== null && (
        <p className="auto-cluster__hint">
          {lastResultCount === 0
            ? 'No dense groups found — try loosening sensitivity or lowering min listings.'
            : `Added ${lastResultCount} cluster${lastResultCount === 1 ? '' : 's'}, set to "Maybe" — review and edit below. Running again replaces this batch.`}
        </p>
      )}
    </div>
  )
}
