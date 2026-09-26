import type { Map as MapLibreMap } from 'maplibre-gl'
import { useState } from 'react'
import { CollapsibleSection } from '@/components/CollapsibleSection'
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
import { useStateListings } from '@/features/state-listings/useStateListings'
import { UsStatesMap } from '@/features/state-select/UsStatesMap'
import { useAppStore } from '@/store/useAppStore'

function App() {
  usePersistence()
  useStateListings()
  const hasHydrated = useAppStore((s) => s.hasHydrated)
  const hasDataset = useAppStore((s) => s.listings.length > 0)
  const isLoadingDataset = useAppStore((s) => s.isLoadingDataset)
  const datasetError = useAppStore((s) => s.datasetError)
  const listingCount = useAppStore((s) => s.listings.length)
  const selectedState = useAppStore((s) => s.selectedState)
  const clearSelectedState = useAppStore((s) => s.clearSelectedState)
  // Owned here (not inside MapView) so the cluster list in the sidebar — a sibling of
  // MapView, not one of its children — can also reach the map, e.g. to fly to a cluster.
  const [mapInstance, setMapInstance] = useState<MapLibreMap | null>(null)

  if (!selectedState) {
    return <UsStatesMap />
  }

  return (
    <MapProvider value={mapInstance}>
      <div className="app-shell">
        <aside className="sidebar">
          <div className="sidebar__header">
            <h1>STR Market Mapping</h1>
            <p>
              {selectedState} · <button className="sidebar__link-button" onClick={clearSelectedState}>Change state</button>
            </p>
          </div>

          <CollapsibleSection title="Step 1 · Select or Create a Project">
            <ProjectSwitcher />
          </CollapsibleSection>

          <div className="sidebar__section">
            <h2>Listings</h2>
            <div className="listings-status">
              {isLoadingDataset && <div className="listings-status__meta">Loading {selectedState} listings…</div>}
              {datasetError && <div className="listings-status__error">{datasetError}</div>}
              {!isLoadingDataset && !datasetError && hasDataset && (
                <div className="listings-status__meta">{listingCount.toLocaleString()} listings loaded</div>
              )}
            </div>
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
            <div className="map-pane__placeholder">
              {isLoadingDataset ? `Loading ${selectedState} listings…` : datasetError || 'No listings loaded.'}
            </div>
          )}
        </main>
      </div>
    </MapProvider>
  )
}

export default App
