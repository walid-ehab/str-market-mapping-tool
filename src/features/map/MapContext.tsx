import type { Map as MapLibreMap } from 'maplibre-gl'
import { createContext, useContext } from 'react'

/**
 * Shares the live MapLibre instance with sibling overlay components (draw controls, legend,
 * style switcher) so they don't need to be children of MapView or reach into its internals.
 */
const MapContext = createContext<MapLibreMap | null>(null)

export const MapProvider = MapContext.Provider

export function useMapInstance(): MapLibreMap | null {
  return useContext(MapContext)
}
