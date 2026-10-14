import type { Position } from 'geojson'
import type { ClusterConfidence } from '@/lib/clusterConfidence'
import type { ZillowSearchFilters } from '@/lib/zillowSearch'

/** A user-drawn polygon marking a cluster of listings. */
export interface Cluster {
  id: string
  name: string
  /** Derived from confidence and explored — see colorForCluster. */
  color: string
  confidence: ClusterConfidence
  /** Manually toggled "I've looked into this one" flag, independent of confidence — colors the cluster yellow when true (see colorForCluster). Optional, defaults to false for clusters saved before this field existed. */
  explored: boolean
  /** Closed linear ring, [lng, lat] pairs, first === last. */
  ring: Position[]
  createdAt: number
  /** Free-text comments for whoever reads the report — optional, defaults to '' for clusters saved before this field existed. */
  notes: string
  /** The cluster's own "Search on Zillow" price/bedroom filters — computed once from the cluster's
   *  listings and remembered from then on, so re-opening the cluster shows whatever was last set
   *  rather than recomputing. Undefined until the Zillow section first renders for this cluster. */
  zillowFilters?: ZillowSearchFilters
}
