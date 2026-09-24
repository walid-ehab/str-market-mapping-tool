import type { LngLatBounds } from '@/lib/geo'

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

/** Builds a Zillow "for sale" map-search URL scoped to a cluster's bounding box, with the team's usual search filters applied. */
export function buildZillowSearchUrl(bounds: LngLatBounds): string {
  const searchQueryState = {
    pagination: {},
    isMapVisible: true,
    mapBounds: {
      west: bounds.sw[0],
      east: bounds.ne[0],
      south: bounds.sw[1],
      north: bounds.ne[1],
    },
    filterState: ZILLOW_FILTER_STATE,
    isListVisible: true,
    mapZoom: 16,
    usersSearchTerm: '',
  }
  return `https://www.zillow.com/homes/for_sale/?searchQueryState=${encodeURIComponent(JSON.stringify(searchQueryState))}`
}
