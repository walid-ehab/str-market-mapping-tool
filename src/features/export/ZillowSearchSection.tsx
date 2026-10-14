import { useEffect } from 'react'
import { CollapsibleSection } from '@/components/CollapsibleSection'
import { BEDROOM_BUCKET_LABELS, BEDROOM_BUCKET_ORDER } from '@/lib/bedrooms'
import { ringBounds } from '@/lib/geo'
import { quantile } from '@/lib/math'
import { buildZillowSearchUrl, type ZillowBedroomMode, type ZillowSearchFilters } from '@/lib/zillowSearch'
import { useAppStore } from '@/store/useAppStore'
import type { Cluster } from '@/types/cluster'
import type { EnrichedListing } from '@/types/listing'

/** Zillow's own bed-filter pills — Studio counts as 0. '5+' has no numeric upper bound, so it's represented as 5 and always means "at least". */
const BEDROOM_OPTIONS = BEDROOM_BUCKET_ORDER.map((bucket) => ({
  value: bucket === '5+' ? 5 : Number(bucket),
  label: BEDROOM_BUCKET_LABELS[bucket],
}))

function matchesBedroom(listing: EnrichedListing, mode: ZillowBedroomMode, value: number): boolean {
  if (value >= 5) return listing.bedrooms >= 5
  return mode === 'exact' ? listing.bedrooms === value : listing.bedrooms >= value
}

/**
 * At-least-the-median bedroom count among the cluster's above-threshold listings, and a max
 * price derived from a rough revenue-multiple rule of thumb: a property priced at a 15% gross
 * yield on its Q75 revenue potential, i.e. price = revenue / 0.15 = revenue * (100/15).
 */
function computeDefaultFilters(aboveThreshold: EnrichedListing[]): ZillowSearchFilters {
  const bedroomMode: ZillowBedroomMode = 'at-least'
  const bedroomsSorted = aboveThreshold.map((l) => l.bedrooms).sort((a, b) => a - b)
  const medianBedrooms = bedroomsSorted.length > 0 ? quantile(bedroomsSorted, 0.5) : 0
  const bedroomValue = Math.min(5, Math.max(0, Math.round(medianBedrooms)))

  const matching = aboveThreshold.filter((l) => matchesBedroom(l, bedroomMode, bedroomValue))
  const revenues = matching
    .map((l) => l.revenuePotentialLtm)
    .filter((v): v is number => v !== null)
    .sort((a, b) => a - b)
  const q75 = revenues.length > 0 ? quantile(revenues, 0.75) : 0
  const maxPrice = Math.round(((100 / 15) * q75) / 1000) * 1000

  return { bedroomMode, bedroomValue, minPrice: 0, maxPrice }
}

export function ZillowSearchSection({ cluster, allListings }: { cluster: Cluster; allListings: EnrichedListing[] }) {
  const setClusterZillowFilters = useAppStore((s) => s.setClusterZillowFilters)
  const bounds = ringBounds(cluster.ring)
  const aboveThreshold = allListings.filter((l) => l.revenueTierId !== 'below')

  // Seeds the cluster's filters once, the first time this section ever renders for it — after
  // that, whatever's stored is the source of truth and is never silently recomputed.
  useEffect(() => {
    if (!cluster.zillowFilters) {
      setClusterZillowFilters(cluster.id, computeDefaultFilters(aboveThreshold))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cluster.id, cluster.zillowFilters])

  if (!bounds) return null

  const filters = cluster.zillowFilters ?? computeDefaultFilters(aboveThreshold)
  const update = (patch: Partial<ZillowSearchFilters>) => setClusterZillowFilters(cluster.id, { ...filters, ...patch })
  const sliderMax = Math.max(2_000_000, filters.maxPrice * 1.5, filters.minPrice * 1.5)

  return (
    <CollapsibleSection title="Search on Zillow">
      <button
        type="button"
        className="filter-control__reset"
        onClick={() => setClusterZillowFilters(cluster.id, computeDefaultFilters(aboveThreshold))}
      >
        Reset to defaults
      </button>

      <div className="filter-control filter-control--chips">
        {BEDROOM_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className={`chip-toggle${filters.bedroomValue === value ? ' chip-toggle--active' : ''}`}
            onClick={() => update({ bedroomValue: value, bedroomMode: value >= 5 ? 'at-least' : filters.bedroomMode })}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="filter-control filter-control--chips">
        <button
          type="button"
          className={`chip-toggle${filters.bedroomMode === 'at-least' ? ' chip-toggle--active' : ''}`}
          onClick={() => update({ bedroomMode: 'at-least' })}
        >
          At least
        </button>
        <button
          type="button"
          disabled={filters.bedroomValue >= 5}
          title={filters.bedroomValue >= 5 ? '"5+" has no exact equivalent on Zillow' : undefined}
          className={`chip-toggle${filters.bedroomMode === 'exact' ? ' chip-toggle--active' : ''}`}
          onClick={() => update({ bedroomMode: 'exact' })}
        >
          Exact
        </button>
      </div>

      <div className="filter-control">
        <div className="filter-control__row">
          <label>
            Min price
            <input
              type="range"
              min={0}
              max={sliderMax}
              step={5000}
              value={filters.minPrice}
              onChange={(e) => update({ minPrice: Number(e.target.value) })}
            />
          </label>
          <input
            type="number"
            className="filter-control__number"
            value={filters.minPrice}
            onChange={(e) => update({ minPrice: Number(e.target.value) || 0 })}
          />
        </div>
        <div className="filter-control__row">
          <label>
            Max price
            <input
              type="range"
              min={0}
              max={sliderMax}
              step={5000}
              value={filters.maxPrice}
              onChange={(e) => update({ maxPrice: Number(e.target.value) })}
            />
          </label>
          <input
            type="number"
            className="filter-control__number"
            value={filters.maxPrice}
            onChange={(e) => update({ maxPrice: Number(e.target.value) || 0 })}
          />
        </div>
      </div>

      <a className="zillow-search__link" href={buildZillowSearchUrl(bounds, filters)} target="_blank" rel="noopener noreferrer">
        Search on Zillow →
      </a>
    </CollapsibleSection>
  )
}
