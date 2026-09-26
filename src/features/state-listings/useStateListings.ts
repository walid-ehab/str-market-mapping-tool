import { useEffect } from 'react'
import { fetchListingsForState } from '@/lib/supabaseListings'
import { useAppStore } from '@/store/useAppStore'

/**
 * Loads a state's listings from Supabase as soon as it's selected on the landing map,
 * replacing the old manual CSV upload as the dataset's source. Keyed only on selectedState —
 * each distinct transition (including re-selecting a state after going back) re-fetches once.
 */
export function useStateListings(): void {
  const selectedState = useAppStore((s) => s.selectedState)
  const setLoadingDataset = useAppStore((s) => s.setLoadingDataset)
  const setDatasetError = useAppStore((s) => s.setDatasetError)
  const setDataset = useAppStore((s) => s.setDataset)

  useEffect(() => {
    if (!selectedState) return
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
