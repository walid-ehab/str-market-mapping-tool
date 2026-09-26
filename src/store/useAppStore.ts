import type { Position } from 'geojson'
import { create } from 'zustand'
import { defaultColorModeId } from '@/features/color-modes/registry'
import { defaultFilterValues } from '@/features/filters/registry'
import { CLUSTER_CONFIDENCE_COLORS, DEFAULT_CLUSTER_CONFIDENCE, type ClusterConfidence } from '@/lib/clusterConfidence'
import { DEFAULT_PROFESSIONAL_HOST_TYPES } from '@/lib/hostType'
import type { Cluster } from '@/types/cluster'
import type { Listing } from '@/types/listing'
import type { StateProjectRow } from '@/types/supabaseSchema'

export const DEFAULT_REVENUE_THRESHOLD = 90000
export const DEFAULT_MAP_STYLE_ID = 'carto-positron'

/** Backfills fields added after a cluster may have already been saved (confidence, notes) so old saves load without breaking. */
function normalizeClusters(clusters: Cluster[]): Cluster[] {
  return clusters.map((c) => ({
    ...c,
    ...(c.confidence ? null : { confidence: DEFAULT_CLUSTER_CONFIDENCE, color: CLUSTER_CONFIDENCE_COLORS[DEFAULT_CLUSTER_CONFIDENCE] }),
    notes: c.notes ?? '',
  }))
}

/** A state_projects row's clusters column is jsonb — comes back as a parsed value, not a string, but still worth a shape check before trusting it as Cluster[]. */
function parseClusters(value: unknown): Cluster[] {
  return Array.isArray(value) ? (value as Cluster[]) : []
}

interface AppState {
  // Which US state the user picked on the landing map — gates whether the landing view or
  // the main dashboard renders, and scopes both the listings fetch and the clusters/settings
  // below. Not persisted itself (a fresh load always starts back at the US map).
  selectedState: string | null

  // The current dataset — always re-fetched from Supabase for the selected state, never
  // persisted itself (see useStateListings).
  datasetFileName: string | null
  datasetUploadedAt: number | null
  listings: Listing[]
  isLoadingDataset: boolean
  datasetError: string | null

  // Whether the selected state's clusters/settings have finished loading from state_projects —
  // the autosave in useStateProjectPersistence must not fire before this, or it would
  // overwrite a real saved row with these fields' pre-load defaults.
  stateProjectHydrated: boolean
  /** Set when the debounced autosave to state_projects fails — surfaced in the UI since a silent failure here means a user's cluster edits are quietly not being saved. */
  stateProjectSaveError: string | null

  revenueThreshold: number
  colorModeId: string
  /** Legend entries hidden from the map, per color mode id, so switching modes doesn't lose the other mode's toggles. */
  hiddenLegendEntries: Record<string, string[]>
  filterValues: Record<string, unknown>
  mapStyleId: string
  /** PROPERTY_HOST_TYPE values counted as "professionally hosted" — user-configurable, defaults to 6-20/21+ Units. */
  professionalHostTypes: string[]
  /** Manually toggleable "I've looked at this state" flag — also auto-set true the moment a cluster is marked Good/Great (never by drawing/auto-detecting a Maybe). Powers the landing map's explored/unexplored color. */
  explored: boolean

  clusters: Cluster[]
  activeClusterId: string | null

  selectState: (stateName: string) => void
  clearSelectedState: () => void

  setLoadingDataset: (loading: boolean) => void
  setDatasetError: (error: string | null) => void
  setDataset: (fileName: string, listings: Listing[]) => void

  setRevenueThreshold: (threshold: number) => void
  setColorModeId: (id: string) => void
  toggleLegendEntry: (colorModeId: string, entryId: string) => void
  setFilterValue: (id: string, value: unknown) => void
  resetFilters: () => void
  setMapStyleId: (id: string) => void
  toggleProfessionalHostType: (hostType: string) => void
  setExplored: (explored: boolean) => void

  addCluster: (cluster: Cluster) => void
  /** Appends several clusters at once (e.g. from auto-detection) without re-picking activeClusterId per cluster. */
  addClusters: (clusters: Cluster[]) => void
  updateClusterRing: (id: string, ring: Position[]) => void
  renameCluster: (id: string, name: string) => void
  setClusterConfidence: (id: string, confidence: ClusterConfidence) => void
  setClusterNotes: (id: string, notes: string) => void
  removeCluster: (id: string) => void
  /** Removes several clusters at once (e.g. replacing a previous auto-detect batch) in a single update. */
  removeClusters: (ids: string[]) => void
  removeAllClusters: () => void
  setActiveClusterId: (id: string | null) => void

  /** Loads a state's saved clusters/settings row from state_projects. */
  hydrateStateProject: (row: StateProjectRow) => void
  /** No saved row exists yet for this state — resets clusters/settings to defaults. */
  resetStateProjectDefaults: () => void
  setStateProjectSaveError: (error: string | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  selectedState: null,

  datasetFileName: null,
  datasetUploadedAt: null,
  listings: [],
  isLoadingDataset: false,
  datasetError: null,

  stateProjectHydrated: false,
  stateProjectSaveError: null,

  revenueThreshold: DEFAULT_REVENUE_THRESHOLD,
  colorModeId: defaultColorModeId,
  hiddenLegendEntries: {},
  filterValues: defaultFilterValues(),
  mapStyleId: DEFAULT_MAP_STYLE_ID,
  professionalHostTypes: DEFAULT_PROFESSIONAL_HOST_TYPES,
  explored: false,

  clusters: [],
  activeClusterId: null,

  // Resets everything to defaults immediately on selection (not just once the real fetches
  // resolve) so a newly-picked state never briefly shows the previous state's data.
  selectState: (stateName) =>
    set({
      selectedState: stateName,
      datasetFileName: null,
      datasetUploadedAt: null,
      listings: [],
      isLoadingDataset: false,
      datasetError: null,
      stateProjectHydrated: false,
      stateProjectSaveError: null,
      clusters: [],
      activeClusterId: null,
      revenueThreshold: DEFAULT_REVENUE_THRESHOLD,
      colorModeId: defaultColorModeId,
      hiddenLegendEntries: {},
      filterValues: defaultFilterValues(),
      mapStyleId: DEFAULT_MAP_STYLE_ID,
      professionalHostTypes: DEFAULT_PROFESSIONAL_HOST_TYPES,
      explored: false,
    }),
  clearSelectedState: () => set({ selectedState: null }),

  setLoadingDataset: (loading) => set({ isLoadingDataset: loading }),
  setDatasetError: (error) => set({ datasetError: error }),
  // Uploading a CSV only ever replaces the listings — clusters belong to the project, not the
  // upload, so re-uploading (e.g. a refreshed export for the same state) keeps them intact.
  setDataset: (fileName, listings) =>
    set({
      datasetFileName: fileName,
      datasetUploadedAt: Date.now(),
      listings,
      isLoadingDataset: false,
      datasetError: null,
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
  toggleProfessionalHostType: (hostType) =>
    set((state) => ({
      professionalHostTypes: state.professionalHostTypes.includes(hostType)
        ? state.professionalHostTypes.filter((t) => t !== hostType)
        : [...state.professionalHostTypes, hostType],
    })),
  setExplored: (explored) => set({ explored }),

  addCluster: (cluster) => set((state) => ({ clusters: [...state.clusters, cluster], activeClusterId: cluster.id })),
  addClusters: (newClusters) => set((state) => ({ clusters: [...state.clusters, ...newClusters] })),
  updateClusterRing: (id, ring) =>
    set((state) => ({
      clusters: state.clusters.map((c) => (c.id === id ? { ...c, ring } : c)),
    })),
  renameCluster: (id, name) =>
    set((state) => ({
      clusters: state.clusters.map((c) => (c.id === id ? { ...c, name } : c)),
    })),
  // Marking a cluster Good/Great also flips explored true — but only that, never drawing or
  // auto-detecting a Maybe cluster (both always default to DEFAULT_CLUSTER_CONFIDENCE, 'maybe',
  // so this is the only path that can ever set a non-maybe confidence).
  setClusterConfidence: (id, confidence) =>
    set((state) => ({
      clusters: state.clusters.map((c) =>
        c.id === id ? { ...c, confidence, color: CLUSTER_CONFIDENCE_COLORS[confidence] } : c,
      ),
      explored: state.explored || confidence === 'good' || confidence === 'great',
    })),
  setClusterNotes: (id, notes) =>
    set((state) => ({
      clusters: state.clusters.map((c) => (c.id === id ? { ...c, notes } : c)),
    })),
  removeCluster: (id) =>
    set((state) => ({
      clusters: state.clusters.filter((c) => c.id !== id),
      activeClusterId: state.activeClusterId === id ? null : state.activeClusterId,
    })),
  removeClusters: (ids) =>
    set((state) => {
      const idSet = new Set(ids)
      return {
        clusters: state.clusters.filter((c) => !idSet.has(c.id)),
        activeClusterId: state.activeClusterId && idSet.has(state.activeClusterId) ? null : state.activeClusterId,
      }
    }),
  removeAllClusters: () => set({ clusters: [], activeClusterId: null }),
  setActiveClusterId: (id) => set({ activeClusterId: id }),

  hydrateStateProject: (row) =>
    set({
      clusters: normalizeClusters(parseClusters(row.clusters)),
      revenueThreshold: row.revenue_threshold,
      colorModeId: row.color_mode_id,
      hiddenLegendEntries: row.hidden_legend_entries ?? {},
      filterValues: row.filter_values ?? defaultFilterValues(),
      mapStyleId: row.map_style_id,
      professionalHostTypes: row.professional_host_types ?? DEFAULT_PROFESSIONAL_HOST_TYPES,
      explored: row.explored ?? false,
      activeClusterId: null,
      stateProjectHydrated: true,
    }),
  resetStateProjectDefaults: () =>
    set({
      clusters: [],
      revenueThreshold: DEFAULT_REVENUE_THRESHOLD,
      colorModeId: defaultColorModeId,
      hiddenLegendEntries: {},
      filterValues: defaultFilterValues(),
      mapStyleId: DEFAULT_MAP_STYLE_ID,
      professionalHostTypes: DEFAULT_PROFESSIONAL_HOST_TYPES,
      explored: false,
      activeClusterId: null,
      stateProjectHydrated: true,
    }),
  setStateProjectSaveError: (error) => set({ stateProjectSaveError: error }),
}))
