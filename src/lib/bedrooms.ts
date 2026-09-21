/** Shared bedroom bucketing so the color mode, filter, and cluster chart all agree on the same bins. */
export type BedroomBucketId = '0' | '1' | '2' | '3' | '4' | '5+'

export const BEDROOM_BUCKET_ORDER: BedroomBucketId[] = ['0', '1', '2', '3', '4', '5+']

export const BEDROOM_BUCKET_LABELS: Record<BedroomBucketId, string> = {
  '0': 'Studio',
  '1': '1 Bed',
  '2': '2 Beds',
  '3': '3 Beds',
  '4': '4 Beds',
  '5+': '5+ Beds',
}

export const BEDROOM_BUCKET_COLORS: Record<BedroomBucketId, string> = {
  '0': '#B3CDE3',
  '1': '#8C96C6',
  '2': '#8856A7',
  '3': '#810F7C',
  '4': '#4D004B',
  '5+': '#1B0033',
}

export function bedroomBucket(bedrooms: number): BedroomBucketId {
  if (bedrooms <= 0) return '0'
  if (bedrooms >= 5) return '5+'
  return String(bedrooms) as BedroomBucketId
}
