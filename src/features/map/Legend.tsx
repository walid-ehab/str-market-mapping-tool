import { colorModes } from '@/features/color-modes/registry'
import { useActiveColorMode, useEnrichedListings } from '@/store/selectors'
import { useAppStore } from '@/store/useAppStore'

export function Legend() {
  const colorModeId = useAppStore((s) => s.colorModeId)
  const setColorModeId = useAppStore((s) => s.setColorModeId)
  const hiddenEntries = useAppStore((s) => s.hiddenLegendEntries[colorModeId]) ?? []
  const toggleLegendEntry = useAppStore((s) => s.toggleLegendEntry)
  const activeColorMode = useActiveColorMode()
  // The legend itself should list every entry present in the unfiltered dataset — otherwise
  // hiding the last visible entry of a tier would make that tier disappear from the legend,
  // and there'd be no way to click it back on.
  const listings = useEnrichedListings()
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
        {legend.map((entry) => {
          const isHidden = hiddenEntries.includes(entry.id)
          return (
            <button
              key={entry.id}
              type="button"
              className={`legend__entry${isHidden ? ' legend__entry--hidden' : ''}`}
              title={isHidden ? `Show ${entry.label}` : `Hide ${entry.label}`}
              onClick={() => toggleLegendEntry(colorModeId, entry.id)}
            >
              <span className="legend__swatch" style={{ backgroundColor: entry.color }} />
              <span>{entry.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
