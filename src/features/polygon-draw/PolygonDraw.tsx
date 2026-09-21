import MapboxDraw from '@mapbox/mapbox-gl-draw'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import type { Feature, Polygon, Position } from 'geojson'
import { useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useMapInstance } from '@/features/map/MapContext'
import { useAppStore } from '@/store/useAppStore'
import type { Cluster } from '@/types/cluster'

export const CLUSTER_COLORS = ['#2563EB', '#DC2626', '#059669', '#D97706', '#7C3AED', '#DB2777', '#0891B2', '#65A30D']

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
    properties: { name: cluster.name },
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
    })
    map.addControl(draw, 'top-left')
    drawRef.current = draw

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
        color: CLUSTER_COLORS[existingCount % CLUSTER_COLORS.length],
        ring,
        createdAt: Date.now(),
      }
      useAppStore.getState().addCluster(cluster)
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

    // setStyle() (basemap switching) tears down every custom layer, Draw's own included.
    // Re-attaching the same Draw instance restores its render layers without losing its features.
    const handleStyleLoad = () => {
      try {
        map.removeControl(draw)
        map.addControl(draw, 'top-left')
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

  return null
}
