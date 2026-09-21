import type { FeatureCollection, Point } from 'geojson'
import {
  type GeoJSONSource,
  type MapLayerMouseEvent,
  MapLibreMap,
  NavigationControl,
  Popup,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import './setupMapWorker'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { minMax } from '@/lib/math'
import { useActiveColorMode, useFilteredListings } from '@/store/selectors'
import { useAppStore } from '@/store/useAppStore'
import { MapProvider } from './MapContext'
import { getMapStyle } from './mapStyles'
import { buildPopupHtml } from './popupContent'
import { listingsToGeoJson, type ListingFeatureProperties } from './toGeoJson'

export const LISTINGS_SOURCE_ID = 'listings'
export const LISTINGS_LAYER_ID = 'listings-points'

const DEFAULT_CENTER: [number, number] = [-98.5795, 39.8283]
const DEFAULT_ZOOM = 4

const EMPTY_FC: FeatureCollection<Point, ListingFeatureProperties> = { type: 'FeatureCollection', features: [] }

function ensureListingsLayer(map: MapLibreMap, data: FeatureCollection<Point, ListingFeatureProperties>) {
  if (!map.getSource(LISTINGS_SOURCE_ID)) {
    map.addSource(LISTINGS_SOURCE_ID, { type: 'geojson', data })
  }
  if (!map.getLayer(LISTINGS_LAYER_ID)) {
    map.addLayer({
      id: LISTINGS_LAYER_ID,
      type: 'circle',
      source: LISTINGS_SOURCE_ID,
      paint: {
        'circle-color': ['get', 'color'],
        'circle-opacity': 0.85,
        'circle-stroke-width': 0.6,
        'circle-stroke-color': '#ffffff',
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['get', 'revenue'],
          0, 4,
          25000, 5,
          90000, 7,
          250000, 10,
          600000, 14,
        ],
      },
    })
  }
}

interface MapViewProps {
  children?: ReactNode
}

export function MapView({ children }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const popupRef = useRef<Popup | null>(null)
  const [mapInstance, setMapInstance] = useState<MapLibreMap | null>(null)

  const mapStyleId = useAppStore((s) => s.mapStyleId)
  const rawListings = useAppStore((s) => s.listings)
  const filteredListings = useFilteredListings()
  const colorMode = useActiveColorMode()

  // Always holds the latest computed GeoJSON so the style-switch handler (set up once, at
  // mount) can repopulate a freshly-recreated source without waiting for the effect below.
  const latestDataRef = useRef<FeatureCollection<Point, ListingFeatureProperties>>(EMPTY_FC)
  latestDataRef.current = listingsToGeoJson(filteredListings, colorMode)

  useEffect(() => {
    if (!containerRef.current) return

    const map = new MapLibreMap({
      container: containerRef.current,
      style: getMapStyle(mapStyleId).style,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    })
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right')

    map.on('load', () => {
      ensureListingsLayer(map, latestDataRef.current)
      setMapInstance(map)
    })

    // Click-to-pin instead of hover: a hover popup disappears the instant the cursor leaves
    // the (tiny) circle, which made the "View Listing" link inside it unreachable. Clicking
    // opens a popup that stays open — with its own close button, and closeOnClick so
    // clicking elsewhere on the map (or another listing) dismisses/replaces it — the
    // standard pattern for popups with interactive content.
    const popup = new Popup({ closeButton: true, closeOnClick: true, maxWidth: '280px' })
    popupRef.current = popup

    map.on('mouseenter', LISTINGS_LAYER_ID, () => {
      map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mouseleave', LISTINGS_LAYER_ID, () => {
      map.getCanvas().style.cursor = ''
    })
    map.on('click', LISTINGS_LAYER_ID, (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0]
      if (!feature) return
      const props = feature.properties as unknown as ListingFeatureProperties
      const coordinates = (feature.geometry as Point).coordinates.slice() as [number, number]
      popup.setLngLat(coordinates).setHTML(buildPopupHtml(props)).addTo(map)
    })

    mapRef.current = map

    return () => {
      popup.remove()
      map.remove()
      mapRef.current = null
      setMapInstance(null)
    }
    // Map is created once; style/data changes are handled by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-apply basemap style. setStyle tears down all custom sources/layers, so we re-add ours once the new style loads.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!map.isStyleLoaded()) return
    // Register the listener BEFORE calling setStyle. An inline style object (e.g. the
    // satellite style, which needs no network fetch) can finish applying synchronously —
    // registering `.once()` afterward can miss that emit entirely, leaving the source/layer
    // never re-added and the map silently pointless (this was the satellite-only bug: every
    // other style is a URL, which is always async, so the race never showed up there).
    map.once('style.load', () => ensureListingsLayer(map, latestDataRef.current))
    map.setStyle(getMapStyle(mapStyleId).style)
  }, [mapStyleId])

  // Keep the point layer's data in sync with the active filters + color mode.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapInstance) return
    const source = map.getSource(LISTINGS_SOURCE_ID) as GeoJSONSource | undefined
    if (!source) return
    source.setData(latestDataRef.current)
  }, [mapInstance, filteredListings, colorMode])

  // Fit to the dataset's bounds once, right after a new file is loaded.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapInstance || rawListings.length === 0) return
    const lngRange = minMax(rawListings.map((l) => l.longitude))
    const latRange = minMax(rawListings.map((l) => l.latitude))
    if (!lngRange || !latRange) return
    map.fitBounds(
      [
        [lngRange.min, latRange.min],
        [lngRange.max, latRange.max],
      ],
      { padding: 48, duration: 0, maxZoom: 12 },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapInstance, rawListings.length])

  return (
    <div className="map-view">
      <div ref={containerRef} className="map-view__canvas" />
      <MapProvider value={mapInstance}>{mapInstance && children}</MapProvider>
    </div>
  )
}
