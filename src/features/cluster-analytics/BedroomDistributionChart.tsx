import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BEDROOM_BUCKET_COLORS, BEDROOM_BUCKET_LABELS, BEDROOM_BUCKET_ORDER, bedroomBucket } from '@/lib/bedrooms'
import type { EnrichedListing } from '@/types/listing'

export function BedroomDistributionChart({ listings }: { listings: EnrichedListing[] }) {
  const counts = new Map<string, number>()
  for (const listing of listings) {
    const bucket = bedroomBucket(listing.bedrooms)
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1)
  }
  const data = BEDROOM_BUCKET_ORDER.map((bucket) => ({
    bucket,
    label: BEDROOM_BUCKET_LABELS[bucket],
    count: counts.get(bucket) ?? 0,
    color: BEDROOM_BUCKET_COLORS[bucket],
  }))

  return (
    <div className="chart-card">
      <h4>Bedroom Distribution</h4>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
          <Tooltip formatter={(value) => [value, 'Listings']} />
          <Bar dataKey="count">
            {data.map((entry) => (
              <Cell key={entry.bucket} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
