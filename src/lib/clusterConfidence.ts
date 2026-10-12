/** How confident the user is that a drawn cluster is a good STR market candidate. */
export type ClusterConfidence = 'potential' | 'maybe' | 'restrictive' | 'low-inventory'

export const DEFAULT_CLUSTER_CONFIDENCE: ClusterConfidence = 'maybe'

export const CLUSTER_CONFIDENCE_ORDER: ClusterConfidence[] = ['potential', 'maybe', 'restrictive', 'low-inventory']

export const CLUSTER_CONFIDENCE_LABELS: Record<ClusterConfidence, string> = {
  potential: 'Potential',
  maybe: 'Maybe',
  restrictive: 'Restrictive',
  'low-inventory': 'Low Inventory',
}

export const CLUSTER_CONFIDENCE_COLORS: Record<ClusterConfidence, string> = {
  potential: '#16A34A',
  maybe: '#94A3B8',
  restrictive: '#DC2626',
  'low-inventory': '#9333EA',
}

/** Overrides a cluster's usual confidence color once it's marked explored — a separate,
 *  per-cluster "I've looked into this one" flag, distinct from confidence itself. */
export const CLUSTER_EXPLORED_COLOR = '#EAB308'

/** The color a cluster should actually render in — explored always wins over confidence. */
export function colorForCluster(confidence: ClusterConfidence, explored: boolean): string {
  return explored ? CLUSTER_EXPLORED_COLOR : CLUSTER_CONFIDENCE_COLORS[confidence]
}
