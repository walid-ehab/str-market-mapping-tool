import { useMemo } from 'react'
import { colorModes, getColorMode } from '@/features/color-modes/registry'
import type { ColorMode } from '@/features/color-modes/types'
import { filterDefinitions } from '@/features/filters/registry'
import { listingsInCluster } from '@/lib/geo'
import { computeRevenueTiering } from '@/lib/tiering'
import type { Cluster } from '@/types/cluster'
import type { EnrichedListing } from '@/types/listing'
import { useAppStore } from './useAppStore'

/** Listings annotated with the currently-active revenue tiering. Recomputes only when inputs change. */
export function useEnrichedListings(): EnrichedListing[] {
  const listings = useAppStore((s) => s.listings)
  const threshold = useAppStore((s) => s.revenueThreshold)

  return useMemo(() => {
    const tiering = computeRevenueTiering(listings, threshold)
    return listings.map((listing) => {
      const tierId = tiering.tierByListingId.get(listing.id) ?? 'below'
      return { ...listing, revenueTierId: tierId, revenueTierLabel: tiering.labelByTier[tierId] }
    })
  }, [listings, threshold])
}

/**
 * Enriched listings after every registered filter's predicate is applied, plus any legend
 * entries toggled off — in ANY color mode, not just whichever one is currently displayed.
 * Toggling "Below 90K" off in Revenue Tier mode keeps those listings hidden even after
 * switching to Bedrooms mode; each mode's own toggles compound rather than resetting.
 */
export function useFilteredListings(): EnrichedListing[] {
  const enriched = useEnrichedListings()
  const filterValues = useAppStore((s) => s.filterValues)
  const hiddenLegendEntries = useAppStore((s) => s.hiddenLegendEntries)

  return useMemo(() => {
    const hiddenByMode = colorModes
      .map((mode) => ({ mode, hidden: hiddenLegendEntries[mode.id] }))
      .filter((entry): entry is { mode: ColorMode; hidden: string[] } => !!entry.hidden && entry.hidden.length > 0)

    return enriched.filter((listing) => {
      for (const { mode, hidden } of hiddenByMode) {
        if (hidden.includes(mode.getEntryId(listing))) return false
      }
      return filterDefinitions.every((filter) => filter.predicate(listing, filterValues[filter.id] ?? filter.defaultValue))
    })
  }, [enriched, filterValues, hiddenLegendEntries])
}

export function useActiveColorMode(): ColorMode {
  const colorModeId = useAppStore((s) => s.colorModeId)
  return useMemo(() => getColorMode(colorModeId), [colorModeId])
}

export function useActiveCluster(): Cluster | null {
  const clusters = useAppStore((s) => s.clusters)
  const activeClusterId = useAppStore((s) => s.activeClusterId)
  return useMemo(() => clusters.find((c) => c.id === activeClusterId) ?? null, [clusters, activeClusterId])
}

/** Filtered listings that fall inside a given cluster's polygon. */
export function useClusterListings(cluster: Cluster | null): EnrichedListing[] {
  const filtered = useFilteredListings()
  return useMemo(() => (cluster ? listingsInCluster(filtered, cluster) : []), [filtered, cluster])
}

/**
 * Every listing inside a cluster's polygon, ignoring active filters and hidden legend
 * entries — only the revenue threshold (baked into tiering) and the polygon itself matter.
 * For "what % of everything here is actually above threshold", independent of whatever the
 * user happens to be filtering the map by right now.
 */
export function useClusterAllListings(cluster: Cluster | null): EnrichedListing[] {
  const enriched = useEnrichedListings()
  return useMemo(() => (cluster ? listingsInCluster(enriched, cluster) : []), [enriched, cluster])
}
