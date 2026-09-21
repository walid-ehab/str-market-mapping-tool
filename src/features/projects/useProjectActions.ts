import { v4 as uuidv4 } from 'uuid'
import { defaultColorModeId } from '@/features/color-modes/registry'
import { downloadTextFile } from '@/features/export/downloadFile'
import { defaultFilterValues } from '@/features/filters/registry'
import {
  deleteProject,
  getProject,
  listProjects,
  saveProject,
  setCurrentProjectId,
  type ProjectRecord,
} from '@/features/persistence/db'
import { DEFAULT_MAP_STYLE_ID, DEFAULT_REVENUE_THRESHOLD, useAppStore } from '@/store/useAppStore'

function slugify(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'project'
}

function currentProjectRecord(): ProjectRecord | null {
  const s = useAppStore.getState()
  if (!s.projectId) return null
  return {
    id: s.projectId,
    name: s.projectName,
    createdAt: s.projectCreatedAt,
    updatedAt: Date.now(),
    clusters: s.clusters,
    revenueThreshold: s.revenueThreshold,
    colorModeId: s.colorModeId,
    hiddenLegendEntries: s.hiddenLegendEntries,
    filterValues: s.filterValues,
    mapStyleId: s.mapStyleId,
    lastDatasetFileName: s.datasetFileName,
  }
}

/** Async orchestration for switching/creating/deleting/exporting projects — the store itself only holds sync state. */
export function useProjectActions() {
  const hydrateProject = useAppStore((s) => s.hydrateProject)
  const resetForNewProject = useAppStore((s) => s.resetForNewProject)
  const setProjects = useAppStore((s) => s.setProjects)

  const refreshProjects = async () => setProjects(await listProjects())

  const switchTo = async (id: string) => {
    const project = await getProject(id)
    if (!project) return
    hydrateProject(project)
    await setCurrentProjectId(id)
  }

  const createNew = async (name = 'New Project') => {
    // Save the current project first so it isn't lost if this fires before the debounced autosave does.
    const current = currentProjectRecord()
    if (current) await saveProject(current)

    const id = uuidv4()
    resetForNewProject(id, name)
    await setCurrentProjectId(id)
    // Persist immediately so the new project shows up in the switcher right away.
    await saveProject({
      id,
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      clusters: [],
      revenueThreshold: DEFAULT_REVENUE_THRESHOLD,
      colorModeId: defaultColorModeId,
      hiddenLegendEntries: {},
      filterValues: defaultFilterValues(),
      mapStyleId: DEFAULT_MAP_STYLE_ID,
      lastDatasetFileName: null,
    })
    await refreshProjects()
  }

  const remove = async (id: string) => {
    await deleteProject(id)
    const remaining = await listProjects()
    setProjects(remaining)
    if (useAppStore.getState().projectId === id) {
      if (remaining.length > 0) {
        await switchTo(remaining[0].id)
      } else {
        await createNew()
      }
    }
  }

  const exportCurrent = () => {
    const project = currentProjectRecord()
    if (!project) return
    downloadTextFile(`${slugify(project.name)}-project.json`, JSON.stringify(project, null, 2))
  }

  const importFromFile = async (file: File) => {
    const text = await file.text()
    const parsed = JSON.parse(text)
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.clusters)) {
      throw new Error('Not a valid project file')
    }

    const current = currentProjectRecord()
    if (current) await saveProject(current)

    const id = uuidv4()
    const project: ProjectRecord = {
      id,
      name: typeof parsed.name === 'string' && parsed.name.trim() ? `${parsed.name} (imported)` : 'Imported Project',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      clusters: parsed.clusters,
      revenueThreshold: typeof parsed.revenueThreshold === 'number' ? parsed.revenueThreshold : DEFAULT_REVENUE_THRESHOLD,
      colorModeId: typeof parsed.colorModeId === 'string' ? parsed.colorModeId : defaultColorModeId,
      hiddenLegendEntries: parsed.hiddenLegendEntries ?? {},
      filterValues: parsed.filterValues ?? defaultFilterValues(),
      mapStyleId: typeof parsed.mapStyleId === 'string' ? parsed.mapStyleId : DEFAULT_MAP_STYLE_ID,
      lastDatasetFileName: typeof parsed.lastDatasetFileName === 'string' ? parsed.lastDatasetFileName : null,
    }
    await saveProject(project)
    hydrateProject(project)
    await setCurrentProjectId(id)
    await refreshProjects()
  }

  return { switchTo, createNew, remove, exportCurrent, importFromFile }
}
