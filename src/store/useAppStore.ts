import type { Position } from 'geojson'
import { create } from 'zustand'
import { defaultColorModeId } from '@/features/color-modes/registry'
import { defaultFilterValues } from '@/features/filters/registry'
import type { ProjectRecord, ProjectSummary } from '@/features/persistence/db'
import { CLUSTER_CONFIDENCE_COLORS, DEFAULT_CLUSTER_CONFIDENCE, type ClusterConfidence } from '@/lib/clusterConfidence'
import { DEFAULT_PROFESSIONAL_HOST_TYPES } from '@/lib/hostType'
import type { Cluster } from '@/types/cluster'
import type { Listing } from '@/types/listing'

export const DEFAULT_REVENUE_THRESHOLD = 90000
export const DEFAULT_MAP_STYLE_ID = 'carto-positron'

/** Backfills fields added after a cluster may have already been saved (confidence, notes) so old projects load without breaking. */
function normalizeClusters(clusters: Cluster[]): Cluster[] {
  return clusters.map((c) => ({
    ...c,
    ...(c.confidence ? null : { confidence: DEFAULT_CLUSTER_CONFIDENCE, color: CLUSTER_CONFIDENCE_COLORS[DEFAULT_CLUSTER_CONFIDENCE] }),
    notes: c.notes ?? '',
  }))
}

interface AppState {
  // Which US state the user picked on the landing map — gates whether the landing view or
  // the main dashboard renders. Not persisted (a fresh load always starts back at the US map);
  // per-state saved data is a separate, later concern from this view-level selection.
  selectedState: string | null

  // The current project — clusters and their settings. Persisted per project; switching
  // projects never touches another project's saved clusters.
  projectId: string | null
  projectName: string
  projectCreatedAt: number
  /** Every saved project's id/name/updatedAt, for the project switcher. Not itself persisted — reloaded/kept in sync by usePersistence. */
  projects: ProjectSummary[]

  // The current dataset — NOT persisted (a project only remembers clusters/settings, not
  // listings), so switching projects or reloading the page always starts with an empty map.
  datasetFileName: string | null
  datasetUploadedAt: number | null
  listings: Listing[]
  isLoadingDataset: boolean
  datasetError: string | null
  /** Filename of the CSV last uploaded into this project, before this session's dataset (if any) was cleared — a re-upload hint shown while datasetFileName is null. */
  projectLastDatasetFileName: string | null

  revenueThreshold: number
  colorModeId: string
  /** Legend entries hidden from the map, per color mode id, so switching modes doesn't lose the other mode's toggles. */
  hiddenLegendEntries: Record<string, string[]>
  filterValues: Record<string, unknown>
  mapStyleId: string
  /** PROPERTY_HOST_TYPE values counted as "professionally hosted" — user-configurable, defaults to 6-20/21+ Units. */
  professionalHostTypes: string[]

  clusters: Cluster[]
  activeClusterId: string | null

  hasHydrated: boolean

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

  setProjects: (projects: ProjectSummary[]) => void
  setProjectName: (name: string) => void
  /** Loads a saved project's clusters/settings. Always clears the current dataset — a project doesn't carry listings, so the map starts empty until a CSV is (re-)uploaded. */
  hydrateProject: (project: ProjectRecord) => void
  /** Resets everything (clusters, settings, dataset) to defaults under a fresh project id/name. */
  resetForNewProject: (id: string, name: string) => void
  markHydrated: () => void
}

export const useAppStore = create<AppState>((set) => ({
  selectedState: null,

  projectId: null,
  projectName: 'New Project',
  projectCreatedAt: Date.now(),
  projects: [],

  datasetFileName: null,
  datasetUploadedAt: null,
  listings: [],
  isLoadingDataset: false,
  datasetError: null,
  projectLastDatasetFileName: null,

  revenueThreshold: DEFAULT_REVENUE_THRESHOLD,
  colorModeId: defaultColorModeId,
  hiddenLegendEntries: {},
  filterValues: defaultFilterValues(),
  mapStyleId: DEFAULT_MAP_STYLE_ID,
  professionalHostTypes: DEFAULT_PROFESSIONAL_HOST_TYPES,

  clusters: [],
  activeClusterId: null,

  hasHydrated: false,

  selectState: (stateName) => set({ selectedState: stateName }),
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
  setClusterConfidence: (id, confidence) =>
    set((state) => ({
      clusters: state.clusters.map((c) =>
        c.id === id ? { ...c, confidence, color: CLUSTER_CONFIDENCE_COLORS[confidence] } : c,
      ),
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

  setProjects: (projects) => set({ projects }),
  setProjectName: (name) => set({ projectName: name }),
  hydrateProject: (project) =>
    set({
      projectId: project.id,
      projectName: project.name,
      projectCreatedAt: project.createdAt,
      clusters: normalizeClusters(project.clusters),
      revenueThreshold: project.revenueThreshold,
      colorModeId: project.colorModeId,
      hiddenLegendEntries: project.hiddenLegendEntries ?? {},
      filterValues: project.filterValues,
      mapStyleId: project.mapStyleId,
      professionalHostTypes: project.professionalHostTypes ?? DEFAULT_PROFESSIONAL_HOST_TYPES,
      activeClusterId: null,
      datasetFileName: null,
      datasetUploadedAt: null,
      listings: [],
      datasetError: null,
      projectLastDatasetFileName: project.lastDatasetFileName,
    }),
  resetForNewProject: (id, name) =>
    set({
      projectId: id,
      projectName: name,
      projectCreatedAt: Date.now(),
      clusters: [],
      revenueThreshold: DEFAULT_REVENUE_THRESHOLD,
      colorModeId: defaultColorModeId,
      hiddenLegendEntries: {},
      filterValues: defaultFilterValues(),
      mapStyleId: DEFAULT_MAP_STYLE_ID,
      professionalHostTypes: DEFAULT_PROFESSIONAL_HOST_TYPES,
      activeClusterId: null,
      datasetFileName: null,
      datasetUploadedAt: null,
      listings: [],
      datasetError: null,
      projectLastDatasetFileName: null,
    }),
  markHydrated: () => set({ hasHydrated: true }),
}))
