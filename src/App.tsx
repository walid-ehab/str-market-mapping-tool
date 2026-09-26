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
import { MapView, US_BOUNDS } from '@/features/map/MapView'
import { StyleSwitcher } from '@/features/map/StyleSwitcher'
import { useStateProjectPersistence } from '@/features/persistence/useStateProjectPersistence'
import { PolygonDraw } from '@/features/polygon-draw/PolygonDraw'
import { GenerateReportButton } from '@/features/report/GenerateReportButton'
import { ThresholdControl } from '@/features/revenue-tiering/ThresholdControl'
import { useStateListings } from '@/features/state-listings/useStateListings'
import { useAppStore } from '@/store/useAppStore'

function App() {
  useStateProjectPersistence()
  useStateListings()
  const hasDataset = useAppStore((s) => s.listings.length > 0)
  const isLoadingDataset = useAppStore((s) => s.isLoadingDataset)
  const datasetError = useAppStore((s) => s.datasetError)
  const listingCount = useAppStore((s) => s.listings.length)
  const selectedState = useAppStore((s) => s.selectedState)
  const clearSelectedState = useAppStore((s) => s.clearSelectedState)
  const stateProjectSaveError = useAppStore((s) => s.stateProjectSaveError)
  const explored = useAppStore((s) => s.explored)
  const setExplored = useAppStore((s) => s.setExplored)
  const hasGoodOrGreatCluster = useAppStore((s) => s.clusters.some((c) => c.confidence === 'good' || c.confidence === 'great'))
  // Owned here (not inside MapView) so the cluster list in the sidebar — a sibling of
  // MapView, not one of its children — can also reach the map, e.g. to fly to a cluster.
  const [mapInstance, setMapInstance] = useState<MapLibreMap | null>(null)

  // The sidebar is always mounted now (see .sidebar in index.css — it fades via opacity rather
  // than unmounting, so hiding it never resizes the map). Its content still needs a state name
  // to render, though, so this holds the last real selection through the fade-out instead of
  // blanking to nothing the instant selectedState clears. Updated during render (not an effect)
  // since it's just adjusting state to a prop-like value, not synchronizing with anything external.
  const [displayState, setDisplayState] = useState(selectedState)
  if (selectedState && selectedState !== displayState) setDisplayState(selectedState)

  // Unlike the auto zoom-out-triggered return (which just holds the current camera — see
  // PolygonDraw), this is a deliberate "I'm done" click, so it gets its own animated flight back
  // out to the full US view rather than leaving the camera wherever the state's dashboard had it.
  const handleChangeState = () => {
    mapInstance?.fitBounds(US_BOUNDS, { padding: 40, duration: 900 })
    clearSelectedState()
  }

  return (
    <MapProvider value={mapInstance}>
      <div className="app-shell">
        <aside className={`sidebar${selectedState ? '' : ' sidebar--hidden'}`}>
          <div className="sidebar__header">
            <h1>STR Market Mapping</h1>
            <p>
              {displayState} · <button className="sidebar__link-button" onClick={handleChangeState}>Change state</button>
            </p>
            <label className="sidebar__explored-toggle">
              <input
                type="checkbox"
                checked={explored}
                disabled={hasGoodOrGreatCluster}
                onChange={(e) => setExplored(e.target.checked)}
              />
              Mark {displayState} as explored
            </label>
            {hasGoodOrGreatCluster && (
              <div className="sidebar__explored-hint">Remove all Good/Great clusters to turn this off</div>
            )}
          </div>

          <div className="sidebar__section">
            <h2>Listings</h2>
            <div className="listings-status">
              {isLoadingDataset && <div className="listings-status__meta">Loading {displayState} listings…</div>}
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
                {stateProjectSaveError && (
                  <div className="listings-status__error">Not saved: {stateProjectSaveError}</div>
                )}
                <ClusterList />
                <GenerateReportButton />
                <AnalyticsPanel />
              </div>
            </>
          )}
        </aside>

        <main className="map-pane">
          <MapView onMapReady={setMapInstance}>
            {selectedState && hasDataset && (
              <>
                <StyleSwitcher />
                <Legend />
                <PolygonDraw />
              </>
            )}
          </MapView>
          {selectedState && !hasDataset && (
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
