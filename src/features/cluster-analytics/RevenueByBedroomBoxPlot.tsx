import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BEDROOM_BUCKET_COLORS, BEDROOM_BUCKET_ORDER, BEDROOM_BUCKET_SHORT_LABELS, bedroomBucket } from '@/lib/bedrooms'
import { formatK } from '@/lib/format'
import { quantile } from '@/lib/math'
import type { EnrichedListing } from '@/types/listing'

interface BoxPlotDatum {
  label: string
  color: string
  count: number
  min: number
  q1: number
  median: number
  q3: number
  max: number
  /** The [min, max] pair Recharts' Bar reads to position/size the (invisible) underlying bar — the visible box/whiskers are drawn entirely by BoxWhiskerShape instead. */
  range: [number, number]
}

const BOX_WIDTH_RATIO = 0.6

/** Renders a box-and-whiskers glyph in place of Bar's default rectangle, using the [min,max]-scaled y/height it computed plus the datum's own quartiles to place each part. */
function BoxWhiskerShape(props: unknown) {
  const { x, y, width, height, payload } = props as { x: number; y: number; width: number; height: number; payload: BoxPlotDatum }
  const { min, q1, median, q3, max, color } = payload
  if (max === min) return null

  const pixelForValue = (value: number) => y + (height * (max - value)) / (max - min)
  const boxWidth = width * BOX_WIDTH_RATIO
  const boxX = x + (width - boxWidth) / 2
  const centerX = x + width / 2
  const yQ1 = pixelForValue(q1)
  const yQ3 = pixelForValue(q3)
  const yMedian = pixelForValue(median)

  return (
    <g>
      <line x1={centerX} x2={centerX} y1={y} y2={y + height} stroke={color} strokeWidth={1.5} />
      <line x1={boxX} x2={boxX + boxWidth} y1={y} y2={y} stroke={color} strokeWidth={1.5} />
      <line x1={boxX} x2={boxX + boxWidth} y1={y + height} y2={y + height} stroke={color} strokeWidth={1.5} />
      <rect x={boxX} y={yQ3} width={boxWidth} height={Math.max(yQ1 - yQ3, 1)} fill={color} fillOpacity={0.35} stroke={color} strokeWidth={1.5} />
      <line x1={boxX} x2={boxX + boxWidth} y1={yMedian} y2={yMedian} stroke={color} strokeWidth={2} />
    </g>
  )
}

function BoxPlotTooltip({ active, payload }: { active?: boolean; payload?: { payload: BoxPlotDatum }[] }) {
  if (!active || !payload || payload.length === 0) return null
  const d = payload[0].payload
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__title">{d.label}</div>
      <div>Max: {formatK(d.max)}</div>
      <div>Q3: {formatK(d.q3)}</div>
      <div>Median: {formatK(d.median)}</div>
      <div>Q1: {formatK(d.q1)}</div>
      <div>Min: {formatK(d.min)}</div>
      <div>{d.count} listing{d.count === 1 ? '' : 's'}</div>
    </div>
  )
}

export function RevenueByBedroomBoxPlot({ listings }: { listings: EnrichedListing[] }) {
  const valuesByBucket = new Map<string, number[]>()
  for (const listing of listings) {
    if (listing.revenuePotentialLtm === null) continue
    const bucket = bedroomBucket(listing.bedrooms)
    const values = valuesByBucket.get(bucket) ?? []
    values.push(listing.revenuePotentialLtm)
    valuesByBucket.set(bucket, values)
  }

  const data: BoxPlotDatum[] = BEDROOM_BUCKET_ORDER.filter((bucket) => (valuesByBucket.get(bucket)?.length ?? 0) > 0).map((bucket) => {
    const values = valuesByBucket.get(bucket)!.sort((a, b) => a - b)
    const min = values[0]
    const max = values[values.length - 1]
    return {
      label: BEDROOM_BUCKET_SHORT_LABELS[bucket],
      color: BEDROOM_BUCKET_COLORS[bucket],
      count: values.length,
      min,
      q1: quantile(values, 0.25),
      median: quantile(values, 0.5),
      q3: quantile(values, 0.75),
      max,
      range: [min, max],
    }
  })

  if (data.length === 0) return null

  return (
    <div className="chart-card">
      <h4>Revenue Potential by Bedrooms</h4>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={(v: number) => formatK(v)} tick={{ fontSize: 11 }} width={36} />
          <Tooltip content={<BoxPlotTooltip />} />
          <Bar dataKey="range" shape={BoxWhiskerShape} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
