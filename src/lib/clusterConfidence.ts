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

/** Overrides a cluster's usual confidence color once it's marked explored — a separate,
 *  per-cluster "I've looked into this one" flag, distinct from confidence itself. */
export const CLUSTER_EXPLORED_COLOR = '#EAB308'

/** The color a cluster should actually render in — explored always wins over confidence. */
export function colorForCluster(confidence: ClusterConfidence, explored: boolean): string {
  return explored ? CLUSTER_EXPLORED_COLOR : CLUSTER_CONFIDENCE_COLORS[confidence]
}
