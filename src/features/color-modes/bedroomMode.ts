import { BEDROOM_BUCKET_COLORS, BEDROOM_BUCKET_LABELS, BEDROOM_BUCKET_ORDER, bedroomBucket } from '@/lib/bedrooms'
import type { ColorMode, LegendEntry } from './types'

export const bedroomColorMode: ColorMode = {
  id: 'bedrooms',
  label: 'Bedrooms',
  getColor: (listing) => BEDROOM_BUCKET_COLORS[bedroomBucket(listing.bedrooms)],
  getLegend: (listings): LegendEntry[] => {
    const present = new Set(listings.map((l) => bedroomBucket(l.bedrooms)))
    return BEDROOM_BUCKET_ORDER.filter((bucket) => present.has(bucket)).map((bucket) => ({
      id: bucket,
      label: BEDROOM_BUCKET_LABELS[bucket],
      color: BEDROOM_BUCKET_COLORS[bucket],
    }))
  },
}
