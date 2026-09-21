import type { ComponentType } from 'react'
import type { EnrichedListing } from '@/types/listing'

/**
 * A pluggable cluster chart. To add a new one: create a file exporting a ChartDefinition
 * and add it to the registry array in registry.ts — the analytics panel picks it up
 * automatically for whichever cluster is selected.
 */
export interface ChartDefinition {
  id: string
  label: string
  Component: ComponentType<{ listings: EnrichedListing[] }>
}
