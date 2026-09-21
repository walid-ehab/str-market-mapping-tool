import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { REVENUE_TIER_COLORS, REVENUE_TIER_ORDER } from '@/lib/tiering'
import type { EnrichedListing, RevenueTierId } from '@/types/listing'

export function RevenueTierChart({ listings }: { listings: EnrichedListing[] }) {
  const counts = new Map<RevenueTierId, number>()
  const labelByTier = new Map<RevenueTierId, string>()
  for (const listing of listings) {
    counts.set(listing.revenueTierId, (counts.get(listing.revenueTierId) ?? 0) + 1)
    labelByTier.set(listing.revenueTierId, listing.revenueTierLabel)
  }
  const data = REVENUE_TIER_ORDER.filter((tier) => counts.has(tier)).map((tier) => ({
    tier,
    label: labelByTier.get(tier) ?? tier,
    count: counts.get(tier) ?? 0,
    color: REVENUE_TIER_COLORS[tier],
  }))

  return (
    <div className="chart-card">
      <h4>Revenue Tier Breakdown</h4>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} layout="vertical" margin={{ left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="label" tick={{ fontSize: 10 }} width={90} />
          <Tooltip formatter={(value) => [value, 'Listings']} />
          <Bar dataKey="count">
            {data.map((entry) => (
              <Cell key={entry.tier} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
