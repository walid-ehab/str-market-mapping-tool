import { useMemo } from 'react'
import { sortHostTypes } from '@/lib/hostType'
import { useAppStore } from '@/store/useAppStore'

/** Lets the user redefine which PROPERTY_HOST_TYPE values count as "professionally hosted", defaulting to 6-20/21+ Units. */
export function ProfessionalHostTypeSettings() {
  const listings = useAppStore((s) => s.listings)
  const professionalHostTypes = useAppStore((s) => s.professionalHostTypes)
  const toggleProfessionalHostType = useAppStore((s) => s.toggleProfessionalHostType)

  const hostTypes = useMemo(() => {
    const distinct = new Set(listings.map((l) => l.propertyHostType).filter((t) => t !== ''))
    return sortHostTypes([...distinct])
  }, [listings])

  if (hostTypes.length === 0) return null

  return (
    <div className="host-type-settings">
      <p className="host-type-settings__hint">Listings with these host types count as "professionally hosted".</p>
      {hostTypes.map((hostType) => (
        <label key={hostType} className="host-type-settings__option">
          <input
            type="checkbox"
            checked={professionalHostTypes.includes(hostType)}
            onChange={() => toggleProfessionalHostType(hostType)}
          />
          {hostType}
        </label>
      ))}
    </div>
  )
}
