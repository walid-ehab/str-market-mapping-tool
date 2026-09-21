import { useMemo } from 'react'
import { getColorMode } from '@/features/color-modes/registry'
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

/** Enriched listings after every registered filter's predicate is applied. */
export function useFilteredListings(): EnrichedListing[] {
  const enriched = useEnrichedListings()
  const filterValues = useAppStore((s) => s.filterValues)

  return useMemo(
    () =>
      enriched.filter((listing) =>
        filterDefinitions.every((filter) => filter.predicate(listing, filterValues[filter.id] ?? filter.defaultValue)),
      ),
    [enriched, filterValues],
  )
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
