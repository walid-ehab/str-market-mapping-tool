import { formatK } from '@/lib/format'
import { minMax } from '@/lib/math'
import type { Listing, RevenueTierId, RevenueTiering } from '@/types/listing'

export const REVENUE_TIER_ORDER: RevenueTierId[] = ['below', 'q1', 'q2', 'q3', 'q4']

export const REVENUE_TIER_COLORS: Record<RevenueTierId, string> = {
  below: '#B0B7C3',
  q1: '#FED976',
  q2: '#FD8D3C',
  q3: '#E31A1C',
  q4: '#800026',
}

/** Linear-interpolation quantile, matching numpy/pandas' default 'linear' method. */
function quantile(sortedValues: number[], q: number): number {
  if (sortedValues.length === 0) return 0
  const pos = (sortedValues.length - 1) * q
  const base = Math.floor(pos)
  const rest = pos - base
  const next = sortedValues[base + 1]
  return next === undefined ? sortedValues[base] : sortedValues[base] + rest * (next - sortedValues[base])
}

/**
 * Splits listings into a "below threshold" bin and four revenue quartiles above it —
 * mirroring the reference notebook's pd.qcut-based tiering.
 */
export function computeRevenueTiering(listings: Listing[], threshold: number): RevenueTiering {
  const tierByListingId = new Map<string, RevenueTierId>()
  const valuesByTier: Record<RevenueTierId, number[]> = { below: [], q1: [], q2: [], q3: [], q4: [] }

  const aboveValues = listings
    .map((l) => l.revenuePotentialLtm)
    .filter((v): v is number => v !== null && v > threshold)
    .sort((a, b) => a - b)

  const q1Edge = quantile(aboveValues, 0.25)
  const q2Edge = quantile(aboveValues, 0.5)
  const q3Edge = quantile(aboveValues, 0.75)

  const tierForAboveValue = (value: number): RevenueTierId => {
    if (value <= q1Edge) return 'q1'
    if (value <= q2Edge) return 'q2'
    if (value <= q3Edge) return 'q3'
    return 'q4'
  }

  for (const listing of listings) {
    const value = listing.revenuePotentialLtm
    if (value === null) continue
    const tier: RevenueTierId = value > threshold ? tierForAboveValue(value) : 'below'
    tierByListingId.set(listing.id, tier)
    valuesByTier[tier].push(value)
  }

  const labelByTier = {
    below: `Below ${formatK(threshold)}`,
    q1: rangeLabel('Q1', valuesByTier.q1),
    q2: rangeLabel('Q2', valuesByTier.q2),
    q3: rangeLabel('Q3', valuesByTier.q3),
    q4: rangeLabel('Q4', valuesByTier.q4),
  } satisfies Record<RevenueTierId, string>

  return { tierByListingId, labelByTier, threshold }
}

function rangeLabel(tierName: string, values: number[]): string {
  const range = minMax(values)
  if (!range) return tierName
  return `${tierName} (${formatK(range.min)}–${formatK(range.max)})`
}
