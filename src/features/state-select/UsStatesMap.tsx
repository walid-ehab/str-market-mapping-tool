import bbox from '@turf/bbox'
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import { type MapLayerMouseEvent, Map as MapLibreMap } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import '@/features/map/setupMapWorker'
import { useEffect, useRef, useState } from 'react'
import { getMapStyle } from '@/features/map/mapStyles'
import { useAppStore } from '@/store/useAppStore'

const STATES_SOURCE_ID = 'us-states'
const STATES_FILL_LAYER_ID = 'us-states-fill'
const STATES_LINE_LAYER_ID = 'us-states-line'

const DEFAULT_CENTER: [number, number] = [-98.5795, 39.8283]
const DEFAULT_ZOOM = 3.4

type StateFeature = Feature<Polygon | MultiPolygon, { name: string }>

function addStatesLayers(map: MapLibreMap, data: FeatureCollection<Polygon | MultiPolygon, { name: string }>) {
  if (!map.getSource(STATES_SOURCE_ID)) {
    map.addSource(STATES_SOURCE_ID, { type: 'geojson', data, promoteId: 'name' })
  }
  if (!map.getLayer(STATES_FILL_LAYER_ID)) {
    map.addLayer({
      id: STATES_FILL_LAYER_ID,
      type: 'fill',
      source: STATES_SOURCE_ID,
      paint: {
        'fill-color': '#124c3c',
        'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.55, 0.25],
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
  const [hoveredStateName, setHoveredStateName] = useState<string | null>(null)
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
      fetch(`${import.meta.env.BASE_URL}data/us-states.geo.json`)
        .then((res) => res.json())
        .then((data: FeatureCollection<Polygon | MultiPolygon, { name: string }>) => {
          if (cancelled) return
          addStatesLayers(map, data)
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
      setHoveredStateName(feature.properties.name)
    })

    map.on('mouseleave', STATES_FILL_LAYER_ID, () => {
      map.getCanvas().style.cursor = ''
      if (hoveredIdRef.current !== null) {
        map.setFeatureState({ source: STATES_SOURCE_ID, id: hoveredIdRef.current }, { hover: false })
        hoveredIdRef.current = null
      }
      setHoveredStateName(null)
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
        <p>{hoveredStateName ? `${hoveredStateName} — click to view` : 'Click a state to begin'}</p>
      </div>
      <div ref={containerRef} className="us-states-landing__canvas" />
    </div>
  )
}
