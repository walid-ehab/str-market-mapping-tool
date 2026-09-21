import { useAppStore } from '@/store/useAppStore'

const SLIDER_MAX = 300000

export function ThresholdControl() {
  const revenueThreshold = useAppStore((s) => s.revenueThreshold)
  const setRevenueThreshold = useAppStore((s) => s.setRevenueThreshold)

  return (
    <div className="filter-panel__section">
      <div className="filter-panel__label">"Below Threshold" Tier Cutoff</div>
      <div className="filter-control__row">
        <input
          type="range"
          min={0}
          max={SLIDER_MAX}
          step={5000}
          value={Math.min(revenueThreshold, SLIDER_MAX)}
          onChange={(e) => setRevenueThreshold(Number(e.target.value))}
        />
        <input
          type="number"
          className="filter-control__number"
          min={0}
          step={1000}
          value={revenueThreshold}
          onChange={(e) => setRevenueThreshold(Math.max(0, Number(e.target.value) || 0))}
        />
      </div>
    </div>
  )
}
