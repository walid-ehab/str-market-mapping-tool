import { formatCurrency } from '@/lib/format'
import { useAppStore } from '@/store/useAppStore'

export function ThresholdControl() {
  const revenueThreshold = useAppStore((s) => s.revenueThreshold)
  const setRevenueThreshold = useAppStore((s) => s.setRevenueThreshold)

  return (
    <div className="filter-panel__section">
      <div className="filter-panel__label">
        "Below Threshold" Tier Cutoff <span className="filter-control__value">{formatCurrency(revenueThreshold)}</span>
      </div>
      <input
        type="range"
        min={0}
        max={300000}
        step={5000}
        value={revenueThreshold}
        onChange={(e) => setRevenueThreshold(Number(e.target.value))}
      />
    </div>
  )
}
