import { average, shareOf } from '@/lib/stats'
import type { EnrichedListing } from '@/types/listing'

export interface ClusterStats {
  /** Every listing inside the polygon, ignoring active filters and hidden legend entries. */
  totalListings: number
  /** Listings inside the polygon after the currently active filters/legend toggles. */
  shownListings: number
  pctShown: number | null
  avgRevenue: number | null
  avgOccupancy: number | null
  aboveThresholdCount: number
  pctAboveThreshold: number | null
}

/** Shared by the in-app analytics panel and the printable report so both show identical numbers. */
export function computeClusterStats(allListings: EnrichedListing[], shownListings: EnrichedListing[]): ClusterStats {
  const avgRevenue = average(shownListings.map((l) => l.revenuePotentialLtm).filter((v): v is number => v !== null))
  const avgOccupancy = average(shownListings.map((l) => l.occupancyRateLtm).filter((v): v is number => v !== null))
  const aboveThresholdCount = allListings.filter((l) => l.revenueTierId !== 'below').length

  return {
    totalListings: allListings.length,
    shownListings: shownListings.length,
    pctShown: shareOf(shownListings.length, allListings.length),
    avgRevenue,
    avgOccupancy,
    aboveThresholdCount,
    pctAboveThreshold: shareOf(aboveThresholdCount, allListings.length),
  }
}
