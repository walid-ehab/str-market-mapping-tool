import { useState } from 'react'
import { formatCurrency, formatPercent } from '@/lib/format'
import type { EnrichedListing } from '@/types/listing'

/** Collapsible table of every listing currently shown for the active cluster, sorted by revenue potential (highest first). Hidden by default — toggled via "Show Listings". */
export function ClusterListingsTable({ listings }: { listings: EnrichedListing[] }) {
  const [isOpen, setIsOpen] = useState(false)

  if (listings.length === 0) return null

  const sorted = [...listings].sort(
    (a, b) => (b.revenuePotentialLtm ?? -Infinity) - (a.revenuePotentialLtm ?? -Infinity),
  )

  return (
    <div className="cluster-listings">
      <button type="button" className="cluster-listings__toggle" onClick={() => setIsOpen((open) => !open)}>
        {isOpen ? 'Hide' : 'Show'} Listings ({listings.length})
      </button>

      {isOpen && (
        <div className="cluster-listings__scroll">
          <table className="cluster-listings__table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Beds</th>
                <th>Baths</th>
                <th>Revenue Potential</th>
                <th>Avg Daily Rate</th>
                <th>Occupancy</th>
                <th>Property Type</th>
                <th>City</th>
                <th>Superhost</th>
                <th>Pool</th>
                <th>Link</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((listing) => (
                <tr key={listing.id}>
                  <td>{listing.title}</td>
                  <td>{listing.bedrooms}</td>
                  <td>{listing.bathrooms}</td>
                  <td>{formatCurrency(listing.revenuePotentialLtm)}</td>
                  <td>{formatCurrency(listing.averageDailyRateLtm)}</td>
                  <td>{formatPercent(listing.occupancyRateLtm)}</td>
                  <td>{listing.propertyType}</td>
                  <td>{listing.cityName}</td>
                  <td>{listing.superhost ? 'Yes' : '—'}</td>
                  <td>{listing.hasPool ? 'Yes' : '—'}</td>
                  <td>
                    {listing.listingUrl && (
                      <a href={listing.listingUrl} target="_blank" rel="noopener noreferrer">
                        Open ↗
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
