import { REVENUE_TIER_COLORS, REVENUE_TIER_ORDER } from '@/lib/tiering'
import type { ColorMode, LegendEntry } from './types'

export const revenueTierColorMode: ColorMode = {
  id: 'revenue-tier',
  label: 'Revenue Tier',
  getColor: (listing) => REVENUE_TIER_COLORS[listing.revenueTierId],
  getEntryId: (listing) => listing.revenueTierId,
  getLegend: (listings): LegendEntry[] => {
    const labelByTier = new Map<string, string>()
    for (const listing of listings) {
      labelByTier.set(listing.revenueTierId, listing.revenueTierLabel)
    }
    return REVENUE_TIER_ORDER.filter((tier) => labelByTier.has(tier)).map((tier) => ({
      id: tier,
      label: labelByTier.get(tier) ?? tier,
      color: REVENUE_TIER_COLORS[tier],
    }))
  },
}
