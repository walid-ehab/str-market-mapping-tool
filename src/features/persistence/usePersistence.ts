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
    let cancelled = false
    ;(async () => {
      try {
        const currentId = await getCurrentProjectId()
        const current = currentId ? await getProject(currentId) : null
        if (cancelled) return

        if (current) {
          hydrateProject(current)
        } else {
          const id = uuidv4()
          resetForNewProject(id, 'New Project')
          await setCurrentProjectId(id)
        }

        const projects = await listProjects()
        if (!cancelled) setProjects(projects)
      } catch {
        // IndexedDB unavailable — proceed with an in-memory-only project.
      } finally {
        if (!cancelled) markHydrated()
      }
    })()
    return () => {
      cancelled = true
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
