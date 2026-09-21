import { useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useAppStore } from '@/store/useAppStore'
import {
  getCurrentProjectId,
  getProject,
  listProjects,
  saveProject,
  setCurrentProjectId,
  type ProjectRecord,
} from './db'

const SAVE_DEBOUNCE_MS = 500
// If IndexedDB never resolves — e.g. an old browser tab left open from before a schema change
// is still holding a lock on the database — hydration must still finish so the app doesn't get
// stuck on "Loading…" forever. Falls back to a fresh in-memory project; persistence resumes
// once whatever was blocking it clears (whether that's this session's own db.ts blocking()
// handler elsewhere, or the user closing the other tab).
const HYDRATE_TIMEOUT_MS = 4000

/**
 * Hydrates the current project from IndexedDB once on mount (creating a first project if none
 * exists yet), loads the full project list for the switcher, then keeps IndexedDB in sync with
 * the active project's clusters/settings afterwards (debounced). The store itself has no idea
 * persistence exists. Listings are never persisted — see ProjectRecord's docstring.
 */
export function usePersistence(): void {
  const hasHydrated = useAppStore((s) => s.hasHydrated)
  const hydrateProject = useAppStore((s) => s.hydrateProject)
  const resetForNewProject = useAppStore((s) => s.resetForNewProject)
  const setProjects = useAppStore((s) => s.setProjects)
  const markHydrated = useAppStore((s) => s.markHydrated)

  useEffect(() => {
    let settled = false

    const timeoutId = window.setTimeout(() => {
      if (settled) return
      settled = true
      resetForNewProject(uuidv4(), 'New Project')
      markHydrated()
    }, HYDRATE_TIMEOUT_MS)

    ;(async () => {
      try {
        const currentId = await getCurrentProjectId()
        const current = currentId ? await getProject(currentId) : null
        if (settled) return

        if (current) {
          hydrateProject(current)
        } else {
          const id = uuidv4()
          resetForNewProject(id, 'New Project')
          await setCurrentProjectId(id)
        }
        if (settled) return

        const projects = await listProjects()
        if (!settled) setProjects(projects)
      } catch {
        // IndexedDB unavailable — proceed with an in-memory-only project.
      } finally {
        if (!settled) {
          settled = true
          markHydrated()
        }
        window.clearTimeout(timeoutId)
      }
    })()
    return () => {
      settled = true
      window.clearTimeout(timeoutId)
    }
  }, [hydrateProject, resetForNewProject, setProjects, markHydrated])

  const projectId = useAppStore((s) => s.projectId)
  const projectName = useAppStore((s) => s.projectName)
  const projectCreatedAt = useAppStore((s) => s.projectCreatedAt)
  const datasetFileName = useAppStore((s) => s.datasetFileName)
  const clusters = useAppStore((s) => s.clusters)
  const revenueThreshold = useAppStore((s) => s.revenueThreshold)
  const colorModeId = useAppStore((s) => s.colorModeId)
  const hiddenLegendEntries = useAppStore((s) => s.hiddenLegendEntries)
  const filterValues = useAppStore((s) => s.filterValues)
  const mapStyleId = useAppStore((s) => s.mapStyleId)

  const debounceRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!hasHydrated || !projectId) return

    window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      const project: ProjectRecord = {
        id: projectId,
        name: projectName,
        createdAt: projectCreatedAt,
        updatedAt: Date.now(),
        clusters,
        revenueThreshold,
        colorModeId,
        hiddenLegendEntries,
        filterValues,
        mapStyleId,
        lastDatasetFileName: datasetFileName,
      }
      void saveProject(project).then(() => {
        const others = useAppStore.getState().projects.filter((p) => p.id !== projectId)
        useAppStore
          .getState()
          .setProjects([{ id: project.id, name: project.name, updatedAt: project.updatedAt }, ...others].sort((a, b) => b.updatedAt - a.updatedAt))
      })
    }, SAVE_DEBOUNCE_MS)

    return () => window.clearTimeout(debounceRef.current)
  }, [
    hasHydrated,
    projectId,
    projectName,
    projectCreatedAt,
    datasetFileName,
    clusters,
    revenueThreshold,
    colorModeId,
    hiddenLegendEntries,
    filterValues,
    mapStyleId,
  ])
}
