import type { ComponentType } from 'react'
import type { EnrichedListing } from '@/types/listing'

export interface FilterComponentProps<TValue> {
  value: TValue
  onChange: (value: TValue) => void
  listings: EnrichedListing[]
}

/**
 * A pluggable filter. To add a new one: create a file exporting a FilterDefinition and add
 * it to the registry array in registry.ts — the filter panel and the filtering logic both
 * pick it up automatically.
 */
export interface FilterDefinition<TValue = unknown> {
  id: string
  label: string
  defaultValue: TValue
  predicate: (listing: EnrichedListing, value: TValue) => boolean
  Component: ComponentType<FilterComponentProps<TValue>>
}
