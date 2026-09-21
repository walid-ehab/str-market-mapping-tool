import type { EnrichedListing } from '@/types/listing'

export interface LegendEntry {
  id: string
  label: string
  color: string
}

/**
 * A pluggable "color the map by X" mode. To add a new one: create a file exporting a
 * ColorMode and add it to the registry array in registry.ts — nothing else needs to change.
 */
export interface ColorMode {
  id: string
  label: string
  getColor: (listing: EnrichedListing) => string
  getLegend: (listings: EnrichedListing[]) => LegendEntry[]
  /** Which legend entry a listing belongs to — lets a hidden legend entry filter the map. */
  getEntryId: (listing: EnrichedListing) => string
}
