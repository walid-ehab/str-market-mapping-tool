import { useEffect } from 'react'
import { getCachedListings, setCachedListings } from '@/lib/listingsCache'
import { fetchListingsForState } from '@/lib/supabaseListings'
import { useAppStore } from '@/store/useAppStore'

/**
 * Loads a state's listings as soon as it's selected on the landing map, replacing the old
 * manual CSV upload as the dataset's source. Keyed only on selectedState — each distinct
 * transition (including re-selecting a state after going back) checks the in-memory cache
 * first and only hits Supabase on a miss, so revisiting a state within the same tab is instant.
 */
export function useStateListings(): void {
  const selectedState = useAppStore((s) => s.selectedState)
  const setLoadingDataset = useAppStore((s) => s.setLoadingDataset)
  const setDatasetError = useAppStore((s) => s.setDatasetError)
  const setDataset = useAppStore((s) => s.setDataset)

  useEffect(() => {
    if (!selectedState) return

    const cached = getCachedListings(selectedState)
    if (cached) {
      setDataset(selectedState, cached)
      return
    }

    let cancelled = false

    setLoadingDataset(true)
    setDatasetError(null)
    fetchListingsForState(selectedState)
      .then((listings) => {
        if (cancelled) return
        if (listings.length === 0) {
          setDatasetError(`No listings found for ${selectedState}.`)
          setLoadingDataset(false)
          return
        }
        setCachedListings(selectedState, listings)
        setDataset(selectedState, listings)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setDatasetError(error instanceof Error ? error.message : 'Failed to load listings.')
        setLoadingDataset(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedState, setLoadingDataset, setDatasetError, setDataset])
}
