import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { EnrichedListing } from '@/types/listing'

const COLORS = { pro: '#2563EB', individual: '#CBD5E1' }

export function ProHostedChart({ listings }: { listings: EnrichedListing[] }) {
  const proCount = listings.filter((l) => l.isProfessionallyHosted).length
  const individualCount = listings.length - proCount
  const pct = listings.length > 0 ? (proCount / listings.length) * 100 : 0

  const data = [
    { name: 'Professionally Hosted', value: proCount, color: COLORS.pro },
    { name: 'Individual Host', value: individualCount, color: COLORS.individual },
  ]

  return (
    <div className="chart-card">
      <h4>Professionally Hosted</h4>
      <div className="chart-card__stat">{pct.toFixed(1)}%</div>
      <ResponsiveContainer width="100%" height={140}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={35} outerRadius={55} paddingAngle={2}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value, name) => [value, name]} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
