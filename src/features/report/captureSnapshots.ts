import type { Map as MapLibreMap } from 'maplibre-gl'
import { ringBounds } from '@/lib/geo'
import { useAppStore } from '@/store/useAppStore'
import type { Cluster } from '@/types/cluster'

const IDLE_TIMEOUT_MS = 4000

/** Resolves on the map's next 'idle' event, or after a timeout — a stuck listener should never hang report generation. */
function waitForIdle(map: MapLibreMap): Promise<void> {
  return new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      map.off('idle', finish)
      resolve()
    }
    map.once('idle', finish)
    setTimeout(finish, IDLE_TIMEOUT_MS)
  })
}

interface Camera {
  center: [number, number]
  zoom: number
  bearing: number
  pitch: number
}

/**
 * Flies the live map to each cluster's polygon in turn and captures a PNG snapshot of the
 * canvas, restoring the original camera and selection afterward. Requires `preserveDrawingBuffer`
 * on the map (set in MapView) — otherwise the WebGL drawing buffer can already be cleared by the
 * time toDataURL() runs outside the render call.
 */
export async function captureClusterSnapshots(
  map: MapLibreMap,
  clusters: Cluster[],
  onProgress?: (done: number, total: number) => void,
): Promise<Record<string, string>> {
  const snapshots: Record<string, string> = {}
  const originalCamera: Camera = {
    center: map.getCenter().toArray() as [number, number],
    zoom: map.getZoom(),
    bearing: map.getBearing(),
    pitch: map.getPitch(),
  }
  const originalActiveClusterId = useAppStore.getState().activeClusterId

  for (const cluster of clusters) {
    const bounds = ringBounds(cluster.ring)
    useAppStore.getState().setActiveClusterId(cluster.id)
    if (bounds) {
      map.fitBounds([bounds.sw, bounds.ne], { padding: 60, maxZoom: 16, duration: 0 })
    }
    await waitForIdle(map)
    // One more frame so the freshly-selected polygon's thicker outline (driven by a React
    // effect reacting to activeClusterId) has actually painted before the snapshot is taken.
    await new Promise((resolve) => requestAnimationFrame(resolve))
    snapshots[cluster.id] = map.getCanvas().toDataURL('image/png')
    onProgress?.(Object.keys(snapshots).length, clusters.length)
  }

  useAppStore.getState().setActiveClusterId(originalActiveClusterId)
  map.jumpTo(originalCamera)

  return snapshots
}
