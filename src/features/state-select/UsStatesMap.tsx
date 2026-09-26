import bbox from '@turf/bbox'
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import { type MapLayerMouseEvent, Map as MapLibreMap } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import '@/features/map/setupMapWorker'
import { useEffect, useRef, useState } from 'react'
import { getMapStyle } from '@/features/map/mapStyles'
import { listStateProjectSummaries, type StateProjectSummary } from '@/features/persistence/supabaseStateProjects'
import { colorForStateSummary, GOOD_GREAT_BUCKETS, EXPLORED_COLOR, UNEXPLORED_COLOR, statusLabelForStateSummary } from '@/lib/stateExploreColors'
import { useAppStore } from '@/store/useAppStore'

const STATES_SOURCE_ID = 'us-states'
const STATES_FILL_LAYER_ID = 'us-states-fill'
const STATES_LINE_LAYER_ID = 'us-states-line'

const DEFAULT_CENTER: [number, number] = [-98.5795, 39.8283]
const DEFAULT_ZOOM = 3.4

type StateProperties = { name: string; fillColor: string }
type StateFeature = Feature<Polygon | MultiPolygon, StateProperties>

/** Merges each feature's saved-progress summary in as a plain property, so fill-color can just read it back — no MapLibre expression needs to know about explored/counts. */
function withFillColors(
  data: FeatureCollection<Polygon | MultiPolygon, { name: string }>,
  summaries: Map<string, StateProjectSummary>,
): FeatureCollection<Polygon | MultiPolygon, StateProperties> {
  return {
    ...data,
    features: data.features.map((f) => ({
      ...f,
      properties: { ...f.properties, fillColor: colorForStateSummary(summaries.get(f.properties.name)) },
    })),
  }
}

function addStatesLayers(map: MapLibreMap, data: FeatureCollection<Polygon | MultiPolygon, StateProperties>) {
  if (!map.getSource(STATES_SOURCE_ID)) {
    map.addSource(STATES_SOURCE_ID, { type: 'geojson', data, promoteId: 'name' })
  }
  if (!map.getLayer(STATES_FILL_LAYER_ID)) {
    map.addLayer({
      id: STATES_FILL_LAYER_ID,
      type: 'fill',
      source: STATES_SOURCE_ID,
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
      paint: {
        'line-color': '#124c3c',
        'line-width': 1,
      },
    })
  }
}

/**
 * The landing screen: a US choropleth. Clicking a state zooms into it (animated, on this same
 * map) and only then hands off to the main dashboard — see App.tsx, which swaps to the
 * dashboard once selectedState is set. Loading listings for that state is a separate, later
 * concern; this component only handles picking one.
 */
export function UsStatesMap() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const hoveredIdRef = useRef<string | null>(null)
  const isTransitioningRef = useRef(false)
  // Populated once the summaries fetch resolves — read by the hover handler below, which is
  // registered before that happens, so a ref (not state) avoids re-subscribing map listeners.
  const summariesRef = useRef<Map<string, StateProjectSummary>>(new Map())
  const [hoveredState, setHoveredState] = useState<{ name: string; statusLabel: string } | null>(null)
  const selectState = useAppStore((s) => s.selectState)

  useEffect(() => {
    if (!containerRef.current) return

    const map = new MapLibreMap({
      container: containerRef.current,
      style: getMapStyle('carto-positron').style,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    })
    mapRef.current = map

    let cancelled = false

    map.on('load', () => {
      Promise.all([
        fetch(`${import.meta.env.BASE_URL}data/us-states.geo.json`).then(
          (res) => res.json() as Promise<FeatureCollection<Polygon | MultiPolygon, { name: string }>>,
        ),
        // Missing progress data shouldn't block the map from rendering at all — every state
        // just falls back to unexplored, same as a state that's genuinely never been touched.
        listStateProjectSummaries().catch(() => new Map<string, StateProjectSummary>()),
      ])
        .then(([data, summaries]) => {
          if (cancelled) return
          summariesRef.current = summaries
          addStatesLayers(map, withFillColors(data, summaries))
        })
        .catch(() => {
          // Static asset failed to load — the landing map just stays blank; nothing else
          // depends on it, and the error would already be visible in the network tab.
        })
    })

    map.on('mousemove', STATES_FILL_LAYER_ID, (e: MapLayerMouseEvent) => {
      if (isTransitioningRef.current) return
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
      map.getCanvas().style.cursor = ''
      if (hoveredIdRef.current !== null) {
        map.setFeatureState({ source: STATES_SOURCE_ID, id: hoveredIdRef.current }, { hover: false })
        hoveredIdRef.current = null
      }
      setHoveredState(null)
    })

    map.on('click', STATES_FILL_LAYER_ID, (e: MapLayerMouseEvent) => {
      if (isTransitioningRef.current) return
      const feature = e.features?.[0] as StateFeature | undefined
      if (!feature) return

      isTransitioningRef.current = true
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

    return () => {
      cancelled = true
      map.remove()
      mapRef.current = null
    }
  }, [selectState])

  return (
    <div className="us-states-landing">
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
      <div ref={containerRef} className="us-states-landing__canvas" />
    </div>
  )
}
