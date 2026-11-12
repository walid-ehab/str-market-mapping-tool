import { buildRegulationsSearchUrl, dominantCityName } from '@/lib/regulationsSearch'
import { useAppStore } from '@/store/useAppStore'
import type { EnrichedListing } from '@/types/listing'

/** Opens a Google search, in a new tab, for the short-term rental regulations of whichever city most of this cluster's listings sit in. No API — just the plain public search URL, so there's nothing to persist. */
export function RegulationsCheckLink({ listings }: { listings: EnrichedListing[] }) {
  const stateName = useAppStore((s) => s.selectedState)
  const cityName = dominantCityName(listings)

  if (!cityName || !stateName) return null

  return (
    <a
      className="regulations-search__link"
      href={buildRegulationsSearchUrl(cityName, stateName)}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className="regulations-search__icon" aria-hidden="true">🔎</span>
      Check Regulations on Google
    </a>
  )
}
