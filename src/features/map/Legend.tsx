import { colorModes } from '@/features/color-modes/registry'
import { useActiveColorMode, useFilteredListings } from '@/store/selectors'
import { useAppStore } from '@/store/useAppStore'

export function Legend() {
  const colorModeId = useAppStore((s) => s.colorModeId)
  const setColorModeId = useAppStore((s) => s.setColorModeId)
  const activeColorMode = useActiveColorMode()
  const listings = useFilteredListings()
  const legend = activeColorMode.getLegend(listings)

  return (
    <div className="map-overlay map-overlay--top-right legend">
      <div className="legend__modes">
        {colorModes.map((mode) => (
          <button
            key={mode.id}
            type="button"
            className={`legend__mode-toggle${mode.id === colorModeId ? ' legend__mode-toggle--active' : ''}`}
            onClick={() => setColorModeId(mode.id)}
          >
            {mode.label}
          </button>
        ))}
      </div>
      <div className="legend__entries">
        {legend.map((entry) => (
          <div key={entry.id} className="legend__entry">
            <span className="legend__swatch" style={{ backgroundColor: entry.color }} />
            <span>{entry.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
