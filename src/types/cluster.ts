import type { Position } from 'geojson'
import type { ClusterConfidence } from '@/lib/clusterConfidence'

/** A user-drawn polygon marking a cluster of listings. */
export interface Cluster {
  id: string
  name: string
  /** Derived from confidence — see CLUSTER_CONFIDENCE_COLORS. */
  color: string
  confidence: ClusterConfidence
  /** Closed linear ring, [lng, lat] pairs, first === last. */
  ring: Position[]
  createdAt: number
  /** Free-text comments for whoever reads the report — optional, defaults to '' for clusters saved before this field existed. */
  notes: string
}
