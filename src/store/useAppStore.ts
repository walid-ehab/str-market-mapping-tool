import type { Position } from 'geojson'
import { create } from 'zustand'
import { defaultColorModeId } from '@/features/color-modes/registry'
import { defaultFilterValues } from '@/features/filters/registry'
import type { PersistedState } from '@/features/persistence/db'
import { CLUSTER_CONFIDENCE_COLORS, DEFAULT_CLUSTER_CONFIDENCE, type ClusterConfidence } from '@/lib/clusterConfidence'
import type { Cluster } from '@/types/cluster'
import type { Listing } from '@/types/listing'

export const DEFAULT_REVENUE_THRESHOLD = 90000
export const DEFAULT_MAP_STYLE_ID = 'carto-positron'

interface AppState {
  datasetFileName: string | null
  datasetUploadedAt: number | null
  listings: Listing[]
  isLoadingDataset: boolean
  datasetError: string | null

  revenueThreshold: number
  colorModeId: string
  /** Legend entries hidden from the map, per color mode id, so switching modes doesn't lose the other mode's toggles. */
  hiddenLegendEntries: Record<string, string[]>
  filterValues: Record<string, unknown>
  mapStyleId: string

  clusters: Cluster[]
  activeClusterId: string | null

  hasHydrated: boolean

  setLoadingDataset: (loading: boolean) => void
  setDatasetError: (error: string | null) => void
  setDataset: (fileName: string, listings: Listing[]) => void
  clearDataset: () => void

  setRevenueThreshold: (threshold: number) => void
  setColorModeId: (id: string) => void
  toggleLegendEntry: (colorModeId: string, entryId: string) => void
  setFilterValue: (id: string, value: unknown) => void
  resetFilters: () => void
  setMapStyleId: (id: string) => void

  addCluster: (cluster: Cluster) => void
  updateClusterRing: (id: string, ring: Position[]) => void
  renameCluster: (id: string, name: string) => void
  setClusterConfidence: (id: string, confidence: ClusterConfidence) => void
  removeCluster: (id: string) => void
  setActiveClusterId: (id: string | null) => void

  hydrateFromPersisted: (state: PersistedState) => void
  markHydrated: () => void
}

export const useAppStore = create<AppState>((set) => ({
  datasetFileName: null,
  datasetUploadedAt: null,
  listings: [],
  isLoadingDataset: false,
  datasetError: null,

  revenueThreshold: DEFAULT_REVENUE_THRESHOLD,
  colorModeId: defaultColorModeId,
  hiddenLegendEntries: {},
  filterValues: defaultFilterValues(),
  mapStyleId: DEFAULT_MAP_STYLE_ID,

  clusters: [],
  activeClusterId: null,

  hasHydrated: false,

  setLoadingDataset: (loading) => set({ isLoadingDataset: loading }),
  setDatasetError: (error) => set({ datasetError: error }),
  setDataset: (fileName, listings) =>
    set({
      datasetFileName: fileName,
      datasetUploadedAt: Date.now(),
      listings,
      isLoadingDataset: false,
      datasetError: null,
      clusters: [],
      activeClusterId: null,
      filterValues: defaultFilterValues(),
    }),
  clearDataset: () =>
    set({
      datasetFileName: null,
      datasetUploadedAt: null,
      listings: [],
      datasetError: null,
      clusters: [],
      activeClusterId: null,
      filterValues: defaultFilterValues(),
    }),

  setRevenueThreshold: (threshold) => set({ revenueThreshold: threshold }),
  setColorModeId: (id) => set({ colorModeId: id }),
  toggleLegendEntry: (colorModeId, entryId) =>
    set((state) => {
      const current = state.hiddenLegendEntries[colorModeId] ?? []
      const next = current.includes(entryId) ? current.filter((id) => id !== entryId) : [...current, entryId]
      return { hiddenLegendEntries: { ...state.hiddenLegendEntries, [colorModeId]: next } }
    }),
  setFilterValue: (id, value) => set((state) => ({ filterValues: { ...state.filterValues, [id]: value } })),
  resetFilters: () => set({ filterValues: defaultFilterValues() }),
  setMapStyleId: (id) => set({ mapStyleId: id }),

  addCluster: (cluster) => set((state) => ({ clusters: [...state.clusters, cluster], activeClusterId: cluster.id })),
  updateClusterRing: (id, ring) =>
    set((state) => ({
      clusters: state.clusters.map((c) => (c.id === id ? { ...c, ring } : c)),
    })),
  renameCluster: (id, name) =>
    set((state) => ({
      clusters: state.clusters.map((c) => (c.id === id ? { ...c, name } : c)),
    })),
  setClusterConfidence: (id, confidence) =>
    set((state) => ({
      clusters: state.clusters.map((c) =>
        c.id === id ? { ...c, confidence, color: CLUSTER_CONFIDENCE_COLORS[confidence] } : c,
      ),
    })),
  removeCluster: (id) =>
    set((state) => ({
      clusters: state.clusters.filter((c) => c.id !== id),
      activeClusterId: state.activeClusterId === id ? null : state.activeClusterId,
    })),
  setActiveClusterId: (id) => set({ activeClusterId: id }),

  hydrateFromPersisted: (persisted) =>
    set({
      datasetFileName: persisted.dataset?.fileName ?? null,
      datasetUploadedAt: persisted.dataset?.uploadedAt ?? null,
      listings: persisted.dataset?.listings ?? [],
      // Backfill confidence for clusters persisted before this field existed.
      clusters: persisted.clusters.map((c) =>
        c.confidence ? c : { ...c, confidence: DEFAULT_CLUSTER_CONFIDENCE, color: CLUSTER_CONFIDENCE_COLORS[DEFAULT_CLUSTER_CONFIDENCE] },
      ),
      revenueThreshold: persisted.revenueThreshold,
      colorModeId: persisted.colorModeId,
      hiddenLegendEntries: persisted.hiddenLegendEntries ?? {},
      filterValues: persisted.filterValues,
      mapStyleId: persisted.mapStyleId,
    }),
  markHydrated: () => set({ hasHydrated: true }),
}))
