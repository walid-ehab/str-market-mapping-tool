import type { StyleSpecification } from 'maplibre-gl'

export interface MapStyleOption {
  id: string
  label: string
  style: string | StyleSpecification
}

/** Esri World Imagery, served as free raster XYZ tiles with no API key required. */
const satelliteStyle: StyleSpecification = {
  version: 8,
  sources: {
    'esri-world-imagery': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: 'Esri, Maxar, Earthstar Geographics',
    },
  },
  layers: [{ id: 'esri-world-imagery', type: 'raster', source: 'esri-world-imagery' }],
}

// Stadia's styles need an API key for production (non-localhost) use — unlike the rest of this
// file, this one isn't free of setup. Only offered at all once VITE_STADIA_API_KEY is set (see
// .env.example), so the switcher doesn't show a button that just fails to load tiles.
const stadiaApiKey = import.meta.env.VITE_STADIA_API_KEY as string | undefined
const osmBrightStyle: MapStyleOption | null = stadiaApiKey
  ? { id: 'osm-bright', label: 'OpenStreetMap', style: `https://tiles.stadiamaps.com/styles/osm_bright.json?api_key=${stadiaApiKey}` }
  : null

/** Free (no API key) MapLibre-compatible basemap styles — mirrors the reference notebook's style buttons. */
export const mapStyles: MapStyleOption[] = [
  { id: 'carto-positron', label: 'Positron', style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json' },
  { id: 'carto-voyager', label: 'Voyager', style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json' },
  { id: 'carto-dark-matter', label: 'Dark Matter', style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json' },
  ...(osmBrightStyle ? [osmBrightStyle] : []),
  { id: 'satellite', label: 'Satellite', style: satelliteStyle },
]

export function getMapStyle(id: string): MapStyleOption {
  return mapStyles.find((s) => s.id === id) ?? mapStyles[0]
}
