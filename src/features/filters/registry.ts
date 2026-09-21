import { bedroomFilter } from './BedroomFilter'
import { revenueRangeFilter } from './RevenueRangeFilter'
import type { FilterDefinition } from './types'

/**
 * The full set of listing filters. Add/remove a filter by editing this array only.
 * `any` here is deliberate: each definition's TValue differs, and callers only ever
 * round-trip a filter's value through its own predicate/Component, never across filters.
 */
export const filterDefinitions: FilterDefinition<any>[] = [revenueRangeFilter, bedroomFilter]

export function defaultFilterValues(): Record<string, unknown> {
  return Object.fromEntries(filterDefinitions.map((f) => [f.id, f.defaultValue]))
}
