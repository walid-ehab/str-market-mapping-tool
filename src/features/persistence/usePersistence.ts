import { useEffect, useRef } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { loadPersistedState, savePersistedState } from './db'

const SAVE_DEBOUNCE_MS = 500

/**
 * Hydrates the store from IndexedDB once on mount, then keeps IndexedDB in sync with the
 * store afterwards (debounced). The store itself has no idea persistence exists.
 */
export function usePersistence(): void {
  const hasHydrated = useAppStore((s) => s.hasHydrated)
  const hydrateFromPersisted = useAppStore((s) => s.hydrateFromPersisted)
  const markHydrated = useAppStore((s) => s.markHydrated)

  useEffect(() => {
    let cancelled = false
    loadPersistedState()
      .then((persisted) => {
        if (cancelled) return
        if (persisted) hydrateFromPersisted(persisted)
      })
      .catch(() => {
        // No persisted state, or IndexedDB unavailable — start fresh.
      })
      .finally(() => {
        if (!cancelled) markHydrated()
      })
    return () => {
      cancelled = true
    }
  }, [hydrateFromPersisted, markHydrated])

  const datasetFileName = useAppStore((s) => s.datasetFileName)
  const datasetUploadedAt = useAppStore((s) => s.datasetUploadedAt)
  const listings = useAppStore((s) => s.listings)
  const clusters = useAppStore((s) => s.clusters)
  const revenueThreshold = useAppStore((s) => s.revenueThreshold)
  const colorModeId = useAppStore((s) => s.colorModeId)
  const hiddenLegendEntries = useAppStore((s) => s.hiddenLegendEntries)
  const filterValues = useAppStore((s) => s.filterValues)
  const mapStyleId = useAppStore((s) => s.mapStyleId)

  const debounceRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!hasHydrated) return

    window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      void savePersistedState({
        dataset:
          listings.length > 0 && datasetFileName
            ? { fileName: datasetFileName, uploadedAt: datasetUploadedAt ?? Date.now(), listings }
            : null,
        clusters,
        revenueThreshold,
        colorModeId,
        hiddenLegendEntries,
        filterValues,
        mapStyleId,
      })
    }, SAVE_DEBOUNCE_MS)

    return () => window.clearTimeout(debounceRef.current)
  }, [
    hasHydrated,
    datasetFileName,
    datasetUploadedAt,
    listings,
    clusters,
    revenueThreshold,
    colorModeId,
    hiddenLegendEntries,
    filterValues,
    mapStyleId,
  ])
}
