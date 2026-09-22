import { CollapsibleSection } from '@/components/CollapsibleSection'
import { useAppStore } from '@/store/useAppStore'
import type { Cluster } from '@/types/cluster'

/** Free-text notes for a cluster, meant for whoever reads the printable report. */
export function ClusterNotes({ cluster }: { cluster: Cluster }) {
  const setClusterNotes = useAppStore((s) => s.setClusterNotes)

  return (
    // Keyed by cluster id so each cluster gets its own fresh open/closed default when selected,
    // instead of one shared collapsed state following you from cluster to cluster.
    <CollapsibleSection key={cluster.id} title="Notes" defaultOpen={cluster.notes.trim().length > 0}>
      <textarea
        className="cluster-notes__textarea"
        placeholder="Add notes for this cluster — included in the printable report."
        value={cluster.notes}
        onChange={(e) => setClusterNotes(cluster.id, e.target.value)}
      />
    </CollapsibleSection>
  )
}
