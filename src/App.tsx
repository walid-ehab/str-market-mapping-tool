import type { Map as MapLibreMap } from 'maplibre-gl'
import { useState } from 'react'
import { CollapsibleSection } from '@/components/CollapsibleSection'
import { UploadButton } from '@/features/csv-upload/UploadButton'
import { ClusterList } from '@/features/clusters/ClusterList'
import { DeleteAllClustersButton } from '@/features/clusters/DeleteAllClustersButton'
import { AnalyticsPanel } from '@/features/cluster-analytics/AnalyticsPanel'
import { AutoDetectClusters } from '@/features/auto-cluster/AutoDetectClusters'
import { ExportAllClustersButton } from '@/features/export/ExportButtons'
import { FilterPanel } from '@/features/filters/FilterPanel'
import { ProfessionalHostTypeSettings } from '@/features/host-type/ProfessionalHostTypeSettings'
import { Legend } from '@/features/map/Legend'
import { MapProvider } from '@/features/map/MapContext'
import { MapView } from '@/features/map/MapView'
import { StyleSwitcher } from '@/features/map/StyleSwitcher'
import { usePersistence } from '@/features/persistence/usePersistence'
import { PolygonDraw } from '@/features/polygon-draw/PolygonDraw'
import { ProjectSwitcher } from '@/features/projects/ProjectSwitcher'
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

          <CollapsibleSection title="Step 1 · Select or Create a Project">
            <ProjectSwitcher />
          </CollapsibleSection>

          <div className="sidebar__section">
            <h2>Step 2 · Upload a CSV</h2>
            <UploadButton />
          </div>

          {hasDataset && (
            <>
              <div className="sidebar__section">
                <h2>Revenue Tiering</h2>
                <ThresholdControl />
              </div>

              <CollapsibleSection title="Professionally Hosted Definition" defaultOpen={false}>
                <ProfessionalHostTypeSettings />
              </CollapsibleSection>

              <CollapsibleSection title="Filters">
                <FilterPanel />
              </CollapsibleSection>

              <CollapsibleSection title="Auto-Detect Clusters" defaultOpen={false}>
                <AutoDetectClusters />
              </CollapsibleSection>

              <div className="sidebar__section sidebar__section--grow">
                <div className="sidebar__section-header">
                  <h2>Clusters</h2>
                  <div className="sidebar__section-header-actions">
                    <ExportAllClustersButton />
                    <DeleteAllClustersButton />
                  </div>
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
