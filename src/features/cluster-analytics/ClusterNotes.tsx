import { useAppStore } from '@/store/useAppStore'
import type { Cluster } from '@/types/cluster'

/** Free-text notes for a cluster, meant for whoever reads the printable report. Always visible — never worth hiding behind a collapsible toggle. */
export function ClusterNotes({ cluster }: { cluster: Cluster }) {
  const setClusterNotes = useAppStore((s) => s.setClusterNotes)

  return (
    <div className="sidebar__section">
      <h2>Notes</h2>
      <textarea
        className="cluster-notes__textarea"
        placeholder="Add notes for this cluster — included in the printable report."
        value={cluster.notes}
        onChange={(e) => setClusterNotes(cluster.id, e.target.value)}
      />
    </div>
  )
}
