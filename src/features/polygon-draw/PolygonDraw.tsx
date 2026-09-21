import MapboxDraw from '@mapbox/mapbox-gl-draw'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import type { Feature, Polygon, Position } from 'geojson'
import type { ExpressionSpecification, Map as MapLibreMap } from 'maplibre-gl'
import { useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useMapInstance } from '@/features/map/MapContext'
import { CLUSTER_CONFIDENCE_COLORS, DEFAULT_CLUSTER_CONFIDENCE } from '@/lib/clusterConfidence'
import { useAppStore } from '@/store/useAppStore'
import type { Cluster } from '@/types/cluster'

// mapbox-gl-draw's own default theme colors, kept as the fallback/"being edited" highlight.
const DRAW_ACTIVE_COLOR = '#fbb03b'
const DRAW_DEFAULT_COLOR = '#3bb2d0'

/**
 * Recolors Draw's inactive polygon fill/outline by the cluster's confidence instead of
 * Draw's single default color. Runs after every (re)attach of the control, since setStyle()
 * recreates these layers from scratch each time — see the style.load handler below.
 */
function applyConfidenceStyling(map: MapLibreMap) {
  const confidenceMatch: ExpressionSpecification = [
    'match',
    ['get', 'user_confidence'],
    'great',
    CLUSTER_CONFIDENCE_COLORS.great,
    'good',
    CLUSTER_CONFIDENCE_COLORS.good,
    'maybe',
    CLUSTER_CONFIDENCE_COLORS.maybe,
    DRAW_DEFAULT_COLOR,
  ]
  const colorExpression: ExpressionSpecification = ['case', ['==', ['get', 'active'], 'true'], DRAW_ACTIVE_COLOR, confidenceMatch]

  for (const suffix of ['cold', 'hot']) {
    const fillLayer = `gl-draw-polygon-fill.${suffix}`
    const lineLayer = `gl-draw-lines.${suffix}`
    if (map.getLayer(fillLayer)) map.setPaintProperty(fillLayer, 'fill-color', colorExpression)
    if (map.getLayer(lineLayer)) map.setPaintProperty(lineLayer, 'line-color', colorExpression)
  }
}

/**
 * mapbox-gl-draw fires these as custom events on the map instance — MapLibre's typed
 * `on`/`off` only know about its own built-in event map, so we bind through this narrow
 * shape instead of casting to `any` at every call site.
 */
interface DrawEventMap {
  'draw.create': { features: Feature<Polygon>[] }
  'draw.update': { features: Feature<Polygon>[] }
  'draw.delete': { features: Feature[] }
  'draw.selectionchange': { features: Feature[] }
}

interface DrawEventTarget {
  on<K extends keyof DrawEventMap>(type: K, listener: (e: DrawEventMap[K]) => void): unknown
  off<K extends keyof DrawEventMap>(type: K, listener: (e: DrawEventMap[K]) => void): unknown
}

function clusterToFeature(cluster: Cluster): Feature<Polygon> {
  return {
    type: 'Feature',
    id: cluster.id,
    properties: { name: cluster.name, confidence: cluster.confidence },
    geometry: { type: 'Polygon', coordinates: [cluster.ring] },
  }
}

/** Draws/edits/deletes cluster polygons on the map and keeps them in sync with the store. */
export function PolygonDraw() {
  const map = useMapInstance()
  const activeClusterId = useAppStore((s) => s.activeClusterId)
  const drawRef = useRef<MapboxDraw | null>(null)

  useEffect(() => {
    if (!map) return

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: true, trash: true },
      userProperties: true,
    })
    map.addControl(draw, 'top-left')
    drawRef.current = draw
    applyConfidenceStyling(map)

    for (const cluster of useAppStore.getState().clusters) {
      draw.add(clusterToFeature(cluster))
    }

    const handleCreate = (e: { features: Feature<Polygon>[] }) => {
      const feature = e.features[0]
      if (!feature) return
      const ring = feature.geometry.coordinates[0] as Position[]
      const id = String(feature.id ?? uuidv4())
      const existingCount = useAppStore.getState().clusters.length
      const cluster: Cluster = {
        id,
        name: `Cluster ${existingCount + 1}`,
        confidence: DEFAULT_CLUSTER_CONFIDENCE,
        color: CLUSTER_CONFIDENCE_COLORS[DEFAULT_CLUSTER_CONFIDENCE],
        ring,
        createdAt: Date.now(),
      }
      useAppStore.getState().addCluster(cluster)
      // The feature mapbox-gl-draw just created has no `confidence` property yet (it was
      // drawn by hand, not built from a Cluster) — give it one so it picks up the default
      // color immediately instead of falling back to Draw's own default.
      draw.setFeatureProperty(id, 'confidence', DEFAULT_CLUSTER_CONFIDENCE)
    }

    const handleUpdate = (e: { features: Feature<Polygon>[] }) => {
      const feature = e.features[0]
      if (!feature) return
      useAppStore.getState().updateClusterRing(String(feature.id), feature.geometry.coordinates[0] as Position[])
    }

    const handleDelete = (e: { features: Feature[] }) => {
      for (const feature of e.features) {
        useAppStore.getState().removeCluster(String(feature.id))
      }
    }

    const handleSelectionChange = (e: { features: Feature[] }) => {
      const feature = e.features[0]
      useAppStore.getState().setActiveClusterId(feature ? String(feature.id) : null)
    }

    // setStyle() (basemap switching) tears down every custom layer, Draw's own included, so
    // we re-attach the same Draw instance to restore its render layers. That alone isn't
    // enough, though: MapboxDraw.onAdd() constructs a brand new internal feature Store every
    // time it's added — the polygons it was rendering are gone, not just hidden — so we also
    // re-populate it from our own store (the real source of truth for clusters) afterward.
    const handleStyleLoad = () => {
      try {
        map.removeControl(draw)
        map.addControl(draw, 'top-left')
        applyConfidenceStyling(map)
        for (const cluster of useAppStore.getState().clusters) {
          draw.add(clusterToFeature(cluster))
        }
      } catch {
        // Map may be mid-teardown.
      }
    }

    const drawEvents = map as unknown as DrawEventTarget
    drawEvents.on('draw.create', handleCreate)
    drawEvents.on('draw.update', handleUpdate)
    drawEvents.on('draw.delete', handleDelete)
    drawEvents.on('draw.selectionchange', handleSelectionChange)
    map.on('style.load', handleStyleLoad)

    return () => {
      drawEvents.off('draw.create', handleCreate)
      drawEvents.off('draw.update', handleUpdate)
      drawEvents.off('draw.delete', handleDelete)
      drawEvents.off('draw.selectionchange', handleSelectionChange)
      map.off('style.load', handleStyleLoad)
      try {
        map.removeControl(draw)
      } catch {
        // Map may already be torn down.
      }
      drawRef.current = null
    }
  }, [map])

  // Keep Draw's selection in sync when a cluster is selected from the list panel instead of the map.
  useEffect(() => {
    drawRef.current?.changeMode('simple_select', { featureIds: activeClusterId ? [activeClusterId] : [] })
  }, [activeClusterId])

  // Push confidence changes (e.g. from the analytics panel's picker) onto the already-drawn
  // feature, so the polygon recolors immediately without waiting for a style switch.
  const clusters = useAppStore((s) => s.clusters)
  useEffect(() => {
    const draw = drawRef.current
    if (!draw) return
    for (const cluster of clusters) {
      draw.setFeatureProperty(cluster.id, 'confidence', cluster.confidence)
    }
  }, [clusters])

  return null
}
