/**
 * Minimal ambient typing for @mapbox/mapbox-gl-draw, which ships no first-party types and
 * whose DefinitelyTyped types pull in the mapbox-gl package we deliberately don't install
 * (we render with MapLibre — Draw only needs the map's IControl-style addControl API, which
 * MapLibre implements too).
 */
declare module '@mapbox/mapbox-gl-draw' {
  import type { Feature } from 'geojson'

  export interface MapboxDrawOptions {
    displayControlsDefault?: boolean
    controls?: Partial<
      Record<'point' | 'line_string' | 'polygon' | 'trash' | 'combine_features' | 'uncombine_features', boolean>
    >
    defaultMode?: string
    /** Exposes custom feature properties to paint expressions as `user_<name>` — off by default. */
    userProperties?: boolean
  }

  export interface DrawFeatureCollection {
    type: 'FeatureCollection'
    features: Feature[]
  }

  export default class MapboxDraw {
    constructor(options?: MapboxDrawOptions)
    onAdd(map: unknown): HTMLElement
    onRemove(map: unknown): void
    add(feature: Feature): string[]
    get(id: string): Feature | undefined
    getAll(): DrawFeatureCollection
    delete(ids: string | string[]): this
    deleteAll(): this
    changeMode(mode: string, options?: { featureIds?: string[] }): this
    setFeatureProperty(featureId: string, property: string, value: unknown): this
  }
}
