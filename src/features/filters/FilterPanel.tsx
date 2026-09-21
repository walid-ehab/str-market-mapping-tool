import { filterDefinitions } from '@/features/filters/registry'
import { useEnrichedListings } from '@/store/selectors'
import { useAppStore } from '@/store/useAppStore'

export function FilterPanel() {
  const filterValues = useAppStore((s) => s.filterValues)
  const setFilterValue = useAppStore((s) => s.setFilterValue)
  // Each filter's own bounds/options come from the full dataset, not the already-filtered
  // result — otherwise a filter's UI would shrink its own range as it's applied.
  const listings = useEnrichedListings()

  return (
    <div className="filter-panel">
      {filterDefinitions.map((filter) => (
        <div key={filter.id} className="filter-panel__section">
          <div className="filter-panel__label">{filter.label}</div>
          <filter.Component
            value={filterValues[filter.id] ?? filter.defaultValue}
            onChange={(value) => setFilterValue(filter.id, value)}
            listings={listings}
          />
        </div>
      ))}
    </div>
  )
}
