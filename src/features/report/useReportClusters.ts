import { useMemo } from 'react'
import { computeClusterStats, type ClusterStats } from '@/features/cluster-analytics/clusterStats'
import { CLUSTER_CONFIDENCE_ORDER } from '@/lib/clusterConfidence'
import { listingsInCluster } from '@/lib/geo'
import { useEnrichedListings, useFilteredListings } from '@/store/selectors'
import { useAppStore } from '@/store/useAppStore'
import type { Cluster } from '@/types/cluster'

export interface ReportCluster {
  cluster: Cluster
  rank: number
  stats: ClusterStats
  /** Filtered (currently shown) listings inside this cluster — what the charts are built from. */
  listings: ReturnType<typeof useFilteredListings>
}

/**
 * Clusters ranked confidence tier first (Great, then Good, then Maybe), and within a tier by %
 * of listings above the revenue threshold, descending — the same ordering used for the
 * printable report. "Maybe" clusters are left out by default (the report's own default, per the
 * assumption that a Maybe isn't confident enough to include in what's handed to a reader) —
 * ranks are assigned after filtering, so they stay dense (no gaps) over whatever's left.
 */
export function useReportClusters(includeMaybe = false): ReportCluster[] {
  const clusters = useAppStore((s) => s.clusters)
  const enriched = useEnrichedListings()
  const filtered = useFilteredListings()

  return useMemo(() => {
    const withStats = clusters
      .filter((cluster) => includeMaybe || cluster.confidence !== 'maybe')
      .map((cluster) => {
        const allListings = listingsInCluster(enriched, cluster)
        const shownListings = listingsInCluster(filtered, cluster)
        return { cluster, stats: computeClusterStats(allListings, shownListings), listings: shownListings }
      })

    withStats.sort((a, b) => {
      const tierDiff = CLUSTER_CONFIDENCE_ORDER.indexOf(a.cluster.confidence) - CLUSTER_CONFIDENCE_ORDER.indexOf(b.cluster.confidence)
      if (tierDiff !== 0) return tierDiff
      return (b.stats.pctAboveThreshold ?? -1) - (a.stats.pctAboveThreshold ?? -1)
    })

    return withStats.map((entry, index) => ({ ...entry, rank: index + 1 }))
  }, [clusters, enriched, filtered, includeMaybe])
}
