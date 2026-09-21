/** How confident the user is that a drawn cluster is a good STR market candidate. */
export type ClusterConfidence = 'great' | 'good' | 'maybe'

export const DEFAULT_CLUSTER_CONFIDENCE: ClusterConfidence = 'maybe'

export const CLUSTER_CONFIDENCE_ORDER: ClusterConfidence[] = ['great', 'good', 'maybe']

export const CLUSTER_CONFIDENCE_LABELS: Record<ClusterConfidence, string> = {
  great: 'Great',
  good: 'Good',
  maybe: 'Maybe',
}

export const CLUSTER_CONFIDENCE_COLORS: Record<ClusterConfidence, string> = {
  great: '#16A34A',
  good: '#2563EB',
  maybe: '#94A3B8',
}
