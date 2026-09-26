import { useEffect, useRef } from 'react'
import { getStateProject, saveStateProject } from './supabaseStateProjects'
import { useAppStore } from '@/store/useAppStore'
import type { StateProjectRow } from '@/types/supabaseSchema'

const SAVE_DEBOUNCE_MS = 500

/**
 * Loads a state's saved clusters/settings from Supabase as soon as it's selected, then keeps
 * state_projects in sync with the active state's clusters/settings afterwards (debounced).
 * The store itself has no idea persistence exists. Mirrors the old project-based
 * usePersistence, just keyed by state instead of an arbitrary project id.
 */
export function useStateProjectPersistence(): void {
  const selectedState = useAppStore((s) => s.selectedState)
  const hydrateStateProject = useAppStore((s) => s.hydrateStateProject)
  const resetStateProjectDefaults = useAppStore((s) => s.resetStateProjectDefaults)
  const setStateProjectSaveError = useAppStore((s) => s.setStateProjectSaveError)

  // Hydrating flips stateProjectHydrated false→true, which the autosave effect below is keyed
  // on — without this guard, that transition alone (not any actual edit) would trigger a save,
  // writing a fresh row for every state merely viewed, never touched.
  const skipNextSaveRef = useRef(false)

  useEffect(() => {
    if (!selectedState) return
    let cancelled = false

    getStateProject(selectedState)
      .then((row) => {
        if (cancelled) return
        skipNextSaveRef.current = true
        if (row) hydrateStateProject(row)
        else resetStateProjectDefaults()
      })
      .catch(() => {
        // Failed to reach state_projects — proceed with in-memory-only defaults rather than
        // block the dashboard forever. Whatever the user does this session just won't persist.
        if (cancelled) return
        skipNextSaveRef.current = true
        resetStateProjectDefaults()
      })

    return () => {
      cancelled = true
    }
  }, [selectedState, hydrateStateProject, resetStateProjectDefaults])

  const stateProjectHydrated = useAppStore((s) => s.stateProjectHydrated)
  const clusters = useAppStore((s) => s.clusters)
  const revenueThreshold = useAppStore((s) => s.revenueThreshold)
  const colorModeId = useAppStore((s) => s.colorModeId)
  const hiddenLegendEntries = useAppStore((s) => s.hiddenLegendEntries)
  const filterValues = useAppStore((s) => s.filterValues)
  const mapStyleId = useAppStore((s) => s.mapStyleId)
  const professionalHostTypes = useAppStore((s) => s.professionalHostTypes)
  const explored = useAppStore((s) => s.explored)

  const debounceRef = useRef<number | undefined>(undefined)
  // Tracks explored across renders so the toggle's own transition can still save even when it
  // flips OFF (see the gate below, which would otherwise block that exact save).
  const wasExploredRef = useRef(explored)

  useEffect(() => {
    // stateProjectHydrated gates this: without it, the initial load's own defaults (set
    // synchronously by selectState, before getStateProject above resolves) would autosave and
    // overwrite a real saved row with empty clusters.
    if (!selectedState || !stateProjectHydrated) return
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false
      wasExploredRef.current = explored
      return
    }

    // Drawing/auto-detecting Maybe clusters, or tweaking settings, on a state that isn't (and
    // wasn't, as of the previous render) explored is treated as scratch work and never reaches
    // the database — only marking a cluster Good/Great (which itself sets explored true, see
    // setClusterConfidence) or toggling Explored earns a save. Once a state is explored,
    // everything about it autosaves normally, including the moment it's un-toggled — checking
    // the previous value here, not just the current one, is what lets that specific transition
    // still save instead of silently leaving a stale explored:true row behind.
    const wasExplored = wasExploredRef.current
    wasExploredRef.current = explored
    if (!explored && !wasExplored) return

    window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      const row: StateProjectRow = {
        state_name: selectedState,
        clusters,
        revenue_threshold: revenueThreshold,
        color_mode_id: colorModeId,
        hidden_legend_entries: hiddenLegendEntries,
        filter_values: filterValues,
        map_style_id: mapStyleId,
        professional_host_types: professionalHostTypes,
        explored,
        updated_at: new Date().toISOString(),
      }
      saveStateProject(row)
        .then(() => setStateProjectSaveError(null))
        .catch((error: unknown) => {
          // Fire-and-forget would otherwise mean a failed save is invisible — the user keeps
          // editing clusters that quietly aren't being persisted, and only finds out on reload.
          setStateProjectSaveError(error instanceof Error ? error.message : 'Failed to save changes.')
        })
    }, SAVE_DEBOUNCE_MS)

    return () => window.clearTimeout(debounceRef.current)
  }, [
    selectedState,
    stateProjectHydrated,
    clusters,
    revenueThreshold,
    colorModeId,
    hiddenLegendEntries,
    filterValues,
    mapStyleId,
    professionalHostTypes,
    explored,
    setStateProjectSaveError,
  ])
}
