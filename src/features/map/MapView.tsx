import bbox from '@turf/bbox'
import type { Feature, FeatureCollection, MultiPolygon, Point, Polygon } from 'geojson'
import {
  type GeoJSONSource,
  type MapLayerMouseEvent,
  MapLibreMap,
  NavigationControl,
  Popup,
  ScaleControl,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import './setupMapWorker'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { listStateProjectSummaries, type StateProjectSummary } from '@/features/persistence/supabaseStateProjects'
import { datasetBounds } from '@/lib/geo'
import {
  colorForStateSummary,
  EXPLORED_COLOR,
  GOOD_GREAT_BUCKETS,
  statusLabelForStateSummary,
  UNEXPLORED_COLOR,
} from '@/lib/stateExploreColors'
import { useActiveColorMode, useFilteredListings } from '@/store/selectors'
import { useAppStore } from '@/store/useAppStore'
import { getMapStyle } from './mapStyles'
import { buildPopupHtml } from './popupContent'
import { listingsToGeoJson, type ListingFeatureProperties } from './toGeoJson'

export const LISTINGS_SOURCE_ID = 'listings'
export const LISTINGS_LAYER_ID = 'listings-points'
const STATES_SOURCE_ID = 'us-states'
const STATES_FILL_LAYER_ID = 'us-states-fill'
const STATES_LINE_LAYER_ID = 'us-states-line'

// Where the map starts — the landing (state-choosing) view, since a fresh load always begins
// there. Selecting a state or returning to it later re-fits the camera on its own; this is only
// the very first paint's position.
const DEFAULT_CENTER: [number, number] = [-98.5795, 39.8283]
const DEFAULT_ZOOM = 3.4

const EMPTY_LISTINGS_FC: FeatureCollection<Point, ListingFeatureProperties> = { type: 'FeatureCollection', features: [] }

type StateProperties = { name: string; fillColor: string }
type StateFeature = Feature<Polygon | MultiPolygon, StateProperties>
type StatesFeatureCollection = FeatureCollection<Polygon | MultiPolygon, StateProperties>

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

/** Merges each feature's saved-progress summary in as a plain property, so fill-color can just read it back — no MapLibre expression needs to know about explored/counts. */
function withFillColors(
  data: FeatureCollection<Polygon | MultiPolygon, { name: string }>,
  summaries: Map<string, StateProjectSummary>,
): StatesFeatureCollection {
  return {
    ...data,
    features: data.features.map((f) => ({
      ...f,
      properties: { ...f.properties, fillColor: colorForStateSummary(summaries.get(f.properties.name)) },
    })),
  }
}

function ensureStatesLayer(map: MapLibreMap, data: StatesFeatureCollection, visible: boolean) {
  if (!map.getSource(STATES_SOURCE_ID)) {
    map.addSource(STATES_SOURCE_ID, { type: 'geojson', data, promoteId: 'name' })
  }
  const visibility = visible ? 'visible' : 'none'
  if (!map.getLayer(STATES_FILL_LAYER_ID)) {
    map.addLayer({
      id: STATES_FILL_LAYER_ID,
      type: 'fill',
      source: STATES_SOURCE_ID,
      layout: { visibility },
      paint: {
        'fill-color': ['get', 'fillColor'],
        'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.95, 0.75],
      },
    })
  }
  if (!map.getLayer(STATES_LINE_LAYER_ID)) {
    map.addLayer({
      id: STATES_LINE_LAYER_ID,
      type: 'line',
      source: STATES_SOURCE_ID,
      layout: { visibility },
      paint: {
        'line-color': '#124c3c',
        'line-width': 1,
      },
    })
  }
}

interface MapViewProps {
  children?: ReactNode
  /** Reports the live map instance upward so components outside this subtree (e.g. the sidebar's cluster list) can use it too — see MapContext. */
  onMapReady?: (map: MapLibreMap | null) => void
}

/**
 * The single, persistent map instance for the whole app — created once and never torn down.
 * It shows one of two layer sets depending on whether a state is selected: the US choropleth
 * (click a state to zoom in and select it) or that state's listings (plus any cluster drawing,
 * via `children`). Switching between them only toggles layer visibility and, for the choropleth,
 * refreshes its colors — the camera is never reset, so entering/leaving a state and zooming
 * back out plays as one continuous motion instead of a snap between two separate maps.
 */
export function MapView({ children, onMapReady }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const popupRef = useRef<Popup | null>(null)
  const [mapInstance, setMapInstance] = useState<MapLibreMap | null>(null)

  const selectedState = useAppStore((s) => s.selectedState)
  // Read inside map event handlers registered once at mount — a ref avoids re-binding them on
  // every selection change.
  const selectedStateRef = useRef(selectedState)
  selectedStateRef.current = selectedState
  const selectState = useAppStore((s) => s.selectState)

  const mapStyleId = useAppStore((s) => s.mapStyleId)
  const rawListings = useAppStore((s) => s.listings)
  const filteredListings = useFilteredListings()
  const colorMode = useActiveColorMode()
  // The landing choropleth always uses the same clean basemap regardless of what style the
  // user picked for a state's dashboard — that preference only applies once a state is selected.
  const effectiveStyleId = selectedState ? mapStyleId : 'carto-positron'

  const [hoveredState, setHoveredState] = useState<{ name: string; statusLabel: string } | null>(null)
  const hoveredIdRef = useRef<string | null>(null)
  const statesDataRef = useRef<StatesFeatureCollection | null>(null)
  const summariesRef = useRef<Map<string, StateProjectSummary>>(new Map())

  // Always holds the latest computed GeoJSON so the style-switch handler (set up once, at
  // mount) can repopulate a freshly-recreated source without waiting for the effect below.
  const latestListingsDataRef = useRef<FeatureCollection<Point, ListingFeatureProperties>>(EMPTY_LISTINGS_FC)
  latestListingsDataRef.current = listingsToGeoJson(filteredListings, colorMode)

  useEffect(() => {
    if (!containerRef.current) return

    const map = new MapLibreMap({
      container: containerRef.current,
      style: getMapStyle('carto-positron').style,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      // Needed for the report feature's canvas.toDataURL() snapshots — without it the WebGL
      // drawing buffer can be cleared by the time a snapshot is requested outside the render call.
      canvasContextAttributes: { preserveDrawingBuffer: true },
    })
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right')
    map.addControl(new ScaleControl({ maxWidth: 120, unit: 'imperial' }), 'bottom-left')

    let cancelled = false

    const loadStatesData = () => {
      Promise.all([
        fetch(`${import.meta.env.BASE_URL}data/us-states.geo.json`).then(
          (res) => res.json() as Promise<FeatureCollection<Polygon | MultiPolygon, { name: string }>>,
        ),
        // Missing progress data shouldn't block the choropleth from rendering at all — every
        // state just falls back to unexplored, same as a state that's genuinely never been touched.
        listStateProjectSummaries().catch(() => new Map<string, StateProjectSummary>()),
      ])
        .then(([data, summaries]) => {
          if (cancelled) return
          summariesRef.current = summaries
          const withColors = withFillColors(data, summaries)
          statesDataRef.current = withColors
          ensureStatesLayer(map, withColors, !selectedStateRef.current)
        })
        .catch(() => {
          // Static asset failed to load — the choropleth just stays blank; nothing else depends
          // on it, and the error would already be visible in the network tab.
        })
    }

    map.on('load', () => {
      ensureListingsLayer(map, latestListingsDataRef.current)
      loadStatesData()
      setMapInstance(map)
    })

    // Hover shows a live preview that follows the cursor, same as before. But a hover popup
    // alone disappears the instant the cursor leaves the (tiny) circle — on the way toward
    // the popup itself — making the "View Listing" link inside it unreachable. So a click
    // "pins" it: it stops following the mouse and survives mouseleave, long enough to reach
    // the link. Its own closeButton, or clicking anywhere else, closes it and unpins.
    //
    // closeOnClick is deliberately off: MapLibre's built-in version closes on ANY map click,
    // including the very click on the listing that's supposed to pin it — that listener stays
    // registered from the hover that first opened the popup, and fires right after our layer
    // click handler below, undoing the pin within the same click. We instead close manually,
    // only when the click misses the listings layer entirely (see the plain map click handler).
    const popup = new Popup({ closeButton: true, closeOnClick: false, maxWidth: '280px' })
    popupRef.current = popup

    let isPinned = false
    popup.on('close', () => {
      isPinned = false
    })

    const showPopup = (feature: NonNullable<MapLayerMouseEvent['features']>[number]) => {
      const props = feature.properties as unknown as ListingFeatureProperties
      const coordinates = (feature.geometry as Point).coordinates.slice() as [number, number]
      popup.setLngLat(coordinates).setHTML(buildPopupHtml(props))
      if (!popup.isOpen()) popup.addTo(map)
    }

    map.on('mouseenter', LISTINGS_LAYER_ID, () => {
      map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mousemove', LISTINGS_LAYER_ID, (e: MapLayerMouseEvent) => {
      if (isPinned) return
      const feature = e.features?.[0]
      if (feature) showPopup(feature)
    })
    map.on('mouseleave', LISTINGS_LAYER_ID, () => {
      map.getCanvas().style.cursor = ''
      if (!isPinned) popup.remove()
    })
    map.on('click', LISTINGS_LAYER_ID, (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0]
      if (!feature) return
      showPopup(feature)
      isPinned = true
    })
    // Manual stand-in for closeOnClick: only close when the click didn't land on a listing
    // (a click that did was already handled above, and must not also close the popup it just pinned).
    map.on('click', (e: MapLayerMouseEvent) => {
      const hitListing = map.queryRenderedFeatures(e.point, { layers: [LISTINGS_LAYER_ID] }).length > 0
      if (!hitListing) popup.remove()
    })

    // Choropleth hover/click — no-ops once a state is selected (the layer is hidden then too,
    // but MapLibre still dispatches layer events against hidden features while queried).
    map.on('mousemove', STATES_FILL_LAYER_ID, (e: MapLayerMouseEvent) => {
      if (selectedStateRef.current) return
      const feature = e.features?.[0] as StateFeature | undefined
      if (!feature) return

      map.getCanvas().style.cursor = 'pointer'
      const nextId = feature.id as string
      if (hoveredIdRef.current === nextId) return

      if (hoveredIdRef.current !== null) {
        map.setFeatureState({ source: STATES_SOURCE_ID, id: hoveredIdRef.current }, { hover: false })
      }
      map.setFeatureState({ source: STATES_SOURCE_ID, id: nextId }, { hover: true })
      hoveredIdRef.current = nextId
      setHoveredState({
        name: feature.properties.name,
        statusLabel: statusLabelForStateSummary(summariesRef.current.get(feature.properties.name)),
      })
    })

    map.on('mouseleave', STATES_FILL_LAYER_ID, () => {
      if (selectedStateRef.current) return
      map.getCanvas().style.cursor = ''
      if (hoveredIdRef.current !== null) {
        map.setFeatureState({ source: STATES_SOURCE_ID, id: hoveredIdRef.current }, { hover: false })
        hoveredIdRef.current = null
      }
      setHoveredState(null)
    })

    map.on('click', STATES_FILL_LAYER_ID, (e: MapLayerMouseEvent) => {
      if (selectedStateRef.current) return
      const feature = e.features?.[0] as StateFeature | undefined
      if (!feature) return

      const [minX, minY, maxX, maxY] = bbox(feature)
      map.once('moveend', () => {
        if (!cancelled) selectState(feature.properties.name)
      })
      map.fitBounds(
        [
          [minX, minY],
          [maxX, maxY],
        ],
        { padding: 48, duration: 900 },
      )
    })

    // setStyle() (basemap switching, or leaving/entering a state) tears down every custom
    // source/layer — re-add both layer sets from whatever data we already have.
    map.on('style.load', () => {
      ensureListingsLayer(map, latestListingsDataRef.current)
      if (statesDataRef.current) ensureStatesLayer(map, statesDataRef.current, !selectedStateRef.current)
    })

    mapRef.current = map

    return () => {
      cancelled = true
      popup.remove()
      map.remove()
      mapRef.current = null
      setMapInstance(null)
    }
    // Map is created once; style/data changes are handled by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-apply the basemap style whenever the effective one changes (a state's own style pick,
  // or forced back to the plain landing basemap on return).
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!map.isStyleLoaded()) return
    // Register the listener BEFORE calling setStyle. An inline style object (e.g. the
    // satellite style, which needs no network fetch) can finish applying synchronously —
    // registering `.once()` afterward can miss that emit entirely, leaving the source/layer
    // never re-added and the map silently pointless (this was the satellite-only bug: every
    // other style is a URL, which is always async, so the race never showed up there).
    map.once('style.load', () => {
      ensureListingsLayer(map, latestListingsDataRef.current)
      if (statesDataRef.current) ensureStatesLayer(map, statesDataRef.current, !selectedStateRef.current)
    })
    map.setStyle(getMapStyle(effectiveStyleId).style)
  }, [effectiveStyleId])

  // Keep the point layer's data in sync with the active filters + color mode.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapInstance) return
    const source = map.getSource(LISTINGS_SOURCE_ID) as GeoJSONSource | undefined
    if (!source) return
    source.setData(latestListingsDataRef.current)
  }, [mapInstance, filteredListings, colorMode])

  useEffect(() => {
    onMapReady?.(mapInstance)
  }, [mapInstance, onMapReady])

  // Fit to the dataset's bounds once, right after a new state's listings are loaded.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapInstance || rawListings.length === 0) return
    const bounds = datasetBounds(rawListings)
    if (!bounds) return
    map.fitBounds([bounds.sw, bounds.ne], { padding: 48, duration: 0, maxZoom: 12 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapInstance, rawListings.length])

  // Toggle the choropleth's visibility as the selected state changes, and — on returning to
  // the landing view — refresh its colors so any clusters just marked show up immediately.
  const prevSelectedStateRef = useRef(selectedState)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapInstance) return
    const isLanding = !selectedState
    if (map.getLayer(STATES_FILL_LAYER_ID)) {
      map.setLayoutProperty(STATES_FILL_LAYER_ID, 'visibility', isLanding ? 'visible' : 'none')
      map.setLayoutProperty(STATES_LINE_LAYER_ID, 'visibility', isLanding ? 'visible' : 'none')
    }
    const justReturned = isLanding && prevSelectedStateRef.current
    prevSelectedStateRef.current = selectedState
    if (!justReturned) return

    listStateProjectSummaries()
      .then((summaries) => {
        summariesRef.current = summaries
        const map2 = mapRef.current
        if (!map2 || !statesDataRef.current) return
        const updated = withFillColors(statesDataRef.current, summaries)
        statesDataRef.current = updated
        const source = map2.getSource(STATES_SOURCE_ID) as GeoJSONSource | undefined
        source?.setData(updated)
      })
      .catch(() => {
        // Keep showing the last-known colors rather than surfacing this — the choropleth is
        // read-only feedback, not something the user needs to be alerted about failing to refresh.
      })
  }, [selectedState, mapInstance])

  return (
    <div className="map-view">
      <div ref={containerRef} className="map-view__canvas" />
      {mapInstance && children}
      {!selectedState && (
        <div className="us-states-landing-overlay">
          <div className="us-states-landing__header">
            <h1>STR Market Mapping</h1>
            <p>{hoveredState ? `${hoveredState.name} — ${hoveredState.statusLabel} — click to view` : 'Click a state to begin'}</p>
          </div>
          <div className="us-states-landing__legend">
            <div className="us-states-landing__legend-title">Good/Great clusters</div>
            <div className="us-states-landing__legend-row">
              {GOOD_GREAT_BUCKETS.map((bucket) => (
                <div key={bucket.label} className="us-states-landing__legend-item">
                  <span className="us-states-landing__legend-swatch" style={{ background: bucket.color }} />
                  {bucket.label}
                </div>
              ))}
            </div>
            <div className="us-states-landing__legend-row">
              <div className="us-states-landing__legend-item">
                <span className="us-states-landing__legend-swatch" style={{ background: EXPLORED_COLOR }} />
                Explored
              </div>
              <div className="us-states-landing__legend-item">
                <span className="us-states-landing__legend-swatch" style={{ background: UNEXPLORED_COLOR }} />
                Unexplored
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
