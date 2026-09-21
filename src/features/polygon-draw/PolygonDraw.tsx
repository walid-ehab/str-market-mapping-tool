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

// Fallback for a polygon somehow rendered before its confidence property is set.
const DRAW_DEFAULT_COLOR = '#3bb2d0'

/**
 * Recolors Draw's polygon fill/outline by the cluster's confidence instead of Draw's single
 * default color — always, whether or not the polygon is currently selected/being edited, so
 * the map always shows the same shade as the confidence picker. Selection is indicated by
 * outline width instead of a color swap. Runs after every (re)attach of the control, since
 * setStyle() recreates these layers from scratch each time — see the style.load handler below.
 */
function applyConfidenceStyling(map: MapLibreMap) {
  const colorExpression: ExpressionSpecification = [
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
  const lineWidthExpression: ExpressionSpecification = ['case', ['==', ['get', 'active'], 'true'], 3, 2]

  for (const suffix of ['cold', 'hot']) {
    const fillLayer = `gl-draw-polygon-fill.${suffix}`
    const lineLayer = `gl-draw-lines.${suffix}`
    if (map.getLayer(fillLayer)) map.setPaintProperty(fillLayer, 'fill-color', colorExpression)
    if (map.getLayer(lineLayer)) {
      map.setPaintProperty(lineLayer, 'line-color', colorExpression)
      map.setPaintProperty(lineLayer, 'line-width', lineWidthExpression)
      // line-dasharray is left at Draw's default (dashed while active, solid otherwise) —
      // a second, color-independent cue for "this is the selected polygon".
    }
  }
}

/**
 * MapboxDraw.onAdd() creates its layers synchronously only if `map.loaded()` happens to be
 * true at that exact instant — otherwise it defers to the map's next 'load' plus a 16ms poll
 * internally. Calling applyConfidenceStyling() immediately after addControl() can therefore
 * silently no-op (the layers don't exist yet, so every `map.getLayer(...)` check is false) —
 * so we poll ourselves until they exist, mirroring Draw's own defensive approach.
 */
function applyConfidenceStylingWhenReady(map: MapLibreMap) {
  const MAX_ATTEMPTS = 120 // ~2s at 60fps — generous, but bounded in case the control never attaches (e.g. unmounted mid-flight)
  let attempts = 0
  const attempt = () => {
    attempts += 1
    try {
      if (map.getLayer('gl-draw-polygon-fill.cold')) {
        applyConfidenceStyling(map)
        return
      }
    } catch {
      return // map torn down mid-poll
    }
    if (attempts < MAX_ATTEMPTS) requestAnimationFrame(attempt)
  }
  attempt()
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
    applyConfidenceStylingWhenReady(map)

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
      // The confidence-sync effect below picks this up (addCluster changes `clusters`) and
      // gives the freshly-drawn feature its `confidence` property — see there for why that
      // has to go through draw.add() rather than draw.setFeatureProperty().
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
        applyConfidenceStylingWhenReady(map)
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
  // feature, so the polygon recolors immediately without waiting for a style switch. This
  // goes through draw.add() rather than the seemingly-more-direct draw.setFeatureProperty():
  // setFeatureProperty marks the feature dirty but never actually triggers a re-render (only
  // add()/set() call store.render() internally) — the property changes but nothing repaints.
  // add() on an existing id is safe here: it diffs properties/coordinates and updates in place.
  const clusters = useAppStore((s) => s.clusters)
  useEffect(() => {
    const draw = drawRef.current
    if (!draw) return
    for (const cluster of clusters) {
      if (draw.get(cluster.id)) draw.add(clusterToFeature(cluster))
    }
  }, [clusters])

  return null
}
