import type { LngLatBounds } from '@/lib/geo'

export type ZillowBedroomMode = 'exact' | 'at-least'

export interface ZillowSearchFilters {
  bedroomMode: ZillowBedroomMode
  /** 0-5, where 5 means the "5+" bucket — Zillow has no "exactly 5+", so bedroomMode is forced to 'at-least' whenever this is 5. */
  bedroomValue: number
  /** 0 means "no minimum". */
  minPrice: number
  /** 0 means "no maximum". */
  maxPrice: number
}

/**
 * The filterState from a real Zillow "for sale" map search URL (for-sale only; excludes
 * co-ops/foreclosures/multi-family/land/manufactured homes/co-op apartments, no HOA fee, 55+
 * communities excluded), reused as-is for every cluster search — only mapBounds changes per
 * cluster.
 */
const ZILLOW_FILTER_STATE = {
  sort: { value: 'globalrelevanceex' },
  nc: { value: false },
  lscmsn: { value: false },
  lszp: { value: false },
  auc: { value: false },
  fore: { value: false },
  mf: { value: false },
  con: { value: false },
  land: { value: false },
  apa: { value: false },
  manu: { value: false },
  apco: { value: false },
  hoa: { min: null, max: 0 },
  '55plus': { value: 'e' },
  tow: { value: false },
}

/** Builds a Zillow "for sale" map-search URL scoped to a cluster's bounding box, with the team's usual search filters applied, plus an optional price/bedroom filter on top. */
export function buildZillowSearchUrl(bounds: LngLatBounds, filters?: ZillowSearchFilters): string {
  const filterState: Record<string, unknown> = { ...ZILLOW_FILTER_STATE }
  if (filters) {
    // "5+" has no exact equivalent on Zillow, so it's always encoded as "at least" (max omitted).
    filterState.beds =
      filters.bedroomMode === 'at-least' || filters.bedroomValue >= 5
        ? { min: filters.bedroomValue }
        : { min: filters.bedroomValue, max: filters.bedroomValue }
    filterState.price = { min: filters.minPrice || null, max: filters.maxPrice || null }
  }

  const searchQueryState = {
    pagination: {},
    isMapVisible: true,
    mapBounds: {
      west: bounds.sw[0],
      east: bounds.ne[0],
      south: bounds.sw[1],
      north: bounds.ne[1],
    },
    filterState,
    isListVisible: true,
    mapZoom: 16,
    usersSearchTerm: '',
  }
  return `https://www.zillow.com/homes/for_sale/?searchQueryState=${encodeURIComponent(JSON.stringify(searchQueryState))}`
}
