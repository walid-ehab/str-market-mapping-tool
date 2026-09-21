import { useMemo } from 'react'
import { minMax } from '@/lib/math'
import type { FilterComponentProps, FilterDefinition } from './types'

export interface RevenueRangeValue {
  min: number | null
  max: number | null
}

const DEFAULT_VALUE: RevenueRangeValue = { min: null, max: null }

function RevenueRangeControl({ value, onChange, listings }: FilterComponentProps<RevenueRangeValue>) {
  const bounds = useMemo(() => {
    const values = listings.map((l) => l.revenuePotentialLtm).filter((v): v is number => v !== null)
    return minMax(values) ?? { min: 0, max: 0 }
  }, [listings])

  const min = value.min ?? bounds.min
  const max = value.max ?? bounds.max

  return (
    <div className="filter-control">
      <div className="filter-control__row">
        <label>
          Min
          <input
            type="range"
            min={bounds.min}
            max={bounds.max}
            step={1000}
            value={min}
            onChange={(e) => onChange({ ...value, min: Number(e.target.value) })}
          />
        </label>
        <input
          type="number"
          className="filter-control__number"
          value={min}
          onChange={(e) => onChange({ ...value, min: Number(e.target.value) || 0 })}
        />
      </div>
      <div className="filter-control__row">
        <label>
          Max
          <input
            type="range"
            min={bounds.min}
            max={bounds.max}
            step={1000}
            value={max}
            onChange={(e) => onChange({ ...value, max: Number(e.target.value) })}
          />
        </label>
        <input
          type="number"
          className="filter-control__number"
          value={max}
          onChange={(e) => onChange({ ...value, max: Number(e.target.value) || 0 })}
        />
      </div>
      {(value.min !== null || value.max !== null) && (
        <button type="button" className="filter-control__reset" onClick={() => onChange(DEFAULT_VALUE)}>
          Reset
        </button>
      )}
    </div>
  )
}

export const revenueRangeFilter: FilterDefinition<RevenueRangeValue> = {
  id: 'revenue-range',
  label: 'Revenue (LTM Potential)',
  defaultValue: DEFAULT_VALUE,
  predicate: (listing, value) => {
    if (listing.revenuePotentialLtm === null) return false
    if (value.min !== null && listing.revenuePotentialLtm < value.min) return false
    if (value.max !== null && listing.revenuePotentialLtm > value.max) return false
    return true
  },
  Component: RevenueRangeControl,
}
