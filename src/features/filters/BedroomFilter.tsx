import { BEDROOM_BUCKET_LABELS, BEDROOM_BUCKET_ORDER, bedroomBucket, type BedroomBucketId } from '@/lib/bedrooms'
import type { FilterComponentProps, FilterDefinition } from './types'

/** Empty array means "no filter applied" (all buckets shown). */
export type BedroomFilterValue = BedroomBucketId[]

const DEFAULT_VALUE: BedroomFilterValue = []

function BedroomFilterControl({ value, onChange }: FilterComponentProps<BedroomFilterValue>) {
  const toggle = (bucket: BedroomBucketId) => {
    onChange(value.includes(bucket) ? value.filter((b) => b !== bucket) : [...value, bucket])
  }

  return (
    <div className="filter-control filter-control--chips">
      {BEDROOM_BUCKET_ORDER.map((bucket) => (
        <button
          key={bucket}
          type="button"
          className={`chip-toggle${value.includes(bucket) ? ' chip-toggle--active' : ''}`}
          onClick={() => toggle(bucket)}
        >
          {BEDROOM_BUCKET_LABELS[bucket]}
        </button>
      ))}
      {value.length > 0 && (
        <button type="button" className="filter-control__reset" onClick={() => onChange(DEFAULT_VALUE)}>
          Reset
        </button>
      )}
    </div>
  )
}

export const bedroomFilter: FilterDefinition<BedroomFilterValue> = {
  id: 'bedrooms',
  label: 'Bedrooms',
  defaultValue: DEFAULT_VALUE,
  predicate: (listing, value) => (value.length === 0 ? true : value.includes(bedroomBucket(listing.bedrooms))),
  Component: BedroomFilterControl,
}
