import { useState } from 'react'
import { formatCurrency, formatPercent } from '@/lib/format'
import { useActiveCluster, useClusterListings } from '@/store/selectors'
import { useAppStore } from '@/store/useAppStore'

/** Collapsible table of every listing currently shown for the active cluster, sorted by revenue potential (highest first). Hidden by default — toggled via "Show Listings". Rendered as a map-pane overlay (see App.tsx), so it pulls its own cluster/listings rather than taking them as props. Hovering a row highlights that listing's marker on the map (see MapView's hoveredListingId handling). */
export function ClusterListingsTable() {
  const [isOpen, setIsOpen] = useState(false)
  const cluster = useActiveCluster()
  const listings = useClusterListings(cluster)
  const setHoveredListingId = useAppStore((s) => s.setHoveredListingId)

  if (!cluster || listings.length === 0) return null

  const sorted = [...listings].sort(
    (a, b) => (b.revenuePotentialLtm ?? -Infinity) - (a.revenuePotentialLtm ?? -Infinity),
  )

  return (
    <div className="map-overlay map-overlay--bottom cluster-listings">
      <button type="button" className="cluster-listings__toggle" onClick={() => setIsOpen((open) => !open)}>
        {isOpen ? 'Hide' : 'Show'} Listings ({listings.length})
      </button>

      {isOpen && (
        <div className="cluster-listings__scroll" onMouseLeave={() => setHoveredListingId(null)}>
          <table className="cluster-listings__table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Link</th>
                <th>Beds</th>
                <th>Sleeps</th>
                <th>Baths</th>
                <th>Revenue Potential</th>
                <th>Avg Daily Rate</th>
                <th>Occupancy</th>
                <th>Property Type</th>
                <th>City</th>
                <th>Superhost</th>
                <th>Pool</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((listing) => (
                <tr key={listing.id} onMouseEnter={() => setHoveredListingId(listing.id)}>
                  <td>{listing.title}</td>
                  <td>
                    {listing.listingUrl && (
                      <a href={listing.listingUrl} target="_blank" rel="noopener noreferrer">
                        Open ↗
                      </a>
                    )}
                  </td>
                  <td>{listing.bedrooms}</td>
                  <td>{listing.accommodates}</td>
                  <td>{listing.bathrooms}</td>
                  <td>{formatCurrency(listing.revenuePotentialLtm)}</td>
                  <td>{formatCurrency(listing.averageDailyRateLtm)}</td>
                  <td>{formatPercent(listing.occupancyRateLtm)}</td>
                  <td>{listing.propertyType}</td>
                  <td>{listing.cityName}</td>
                  <td>{listing.superhost ? 'Yes' : '—'}</td>
                  <td>{listing.hasPool ? 'Yes' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
