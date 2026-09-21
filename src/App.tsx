import type { Map as MapLibreMap } from 'maplibre-gl'
import { useState } from 'react'
import { UploadButton } from '@/features/csv-upload/UploadButton'
import { ClusterList } from '@/features/clusters/ClusterList'
import { AnalyticsPanel } from '@/features/cluster-analytics/AnalyticsPanel'
import { ExportAllClustersButton } from '@/features/export/ExportButtons'
import { FilterPanel } from '@/features/filters/FilterPanel'
import { Legend } from '@/features/map/Legend'
import { MapProvider } from '@/features/map/MapContext'
import { MapView } from '@/features/map/MapView'
import { StyleSwitcher } from '@/features/map/StyleSwitcher'
import { usePersistence } from '@/features/persistence/usePersistence'
import { PolygonDraw } from '@/features/polygon-draw/PolygonDraw'
import { GenerateReportButton } from '@/features/report/GenerateReportButton'
import { ThresholdControl } from '@/features/revenue-tiering/ThresholdControl'
import { useAppStore } from '@/store/useAppStore'

function App() {
  usePersistence()
  const hasHydrated = useAppStore((s) => s.hasHydrated)
  const hasDataset = useAppStore((s) => s.listings.length > 0)
  // Owned here (not inside MapView) so the cluster list in the sidebar — a sibling of
  // MapView, not one of its children — can also reach the map, e.g. to fly to a cluster.
  const [mapInstance, setMapInstance] = useState<MapLibreMap | null>(null)

  return (
    <MapProvider value={mapInstance}>
      <div className="app-shell">
        <aside className="sidebar">
          <div className="sidebar__header">
            <h1>STR Market Mapping</h1>
            <p>Upload a listings CSV to plot it on the map.</p>
          </div>

          <UploadButton />

          {hasDataset && (
            <>
              <div className="sidebar__section">
                <h2>Revenue Tiering</h2>
                <ThresholdControl />
              </div>

              <div className="sidebar__section">
                <h2>Filters</h2>
                <FilterPanel />
              </div>

              <div className="sidebar__section sidebar__section--grow">
                <div className="sidebar__section-header">
                  <h2>Clusters</h2>
                  <ExportAllClustersButton />
                </div>
                <ClusterList />
                <GenerateReportButton />
                <AnalyticsPanel />
              </div>
            </>
          )}
        </aside>

        <main className="map-pane">
          {!hasHydrated ? (
            <div className="map-pane__placeholder">Loading…</div>
          ) : hasDataset ? (
            <MapView onMapReady={setMapInstance}>
              <StyleSwitcher />
              <Legend />
              <PolygonDraw />
            </MapView>
          ) : (
            <div className="map-pane__placeholder">Upload a CSV to get started.</div>
          )}
        </main>
      </div>
    </MapProvider>
  )
}

export default App
