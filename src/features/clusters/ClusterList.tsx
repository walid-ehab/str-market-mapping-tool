import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import type { Cluster } from '@/types/cluster'

function ClusterRow({ cluster }: { cluster: Cluster }) {
  const activeClusterId = useAppStore((s) => s.activeClusterId)
  const setActiveClusterId = useAppStore((s) => s.setActiveClusterId)
  const renameCluster = useAppStore((s) => s.renameCluster)
  const removeCluster = useAppStore((s) => s.removeCluster)
  const [isEditing, setIsEditing] = useState(false)
  const [draftName, setDraftName] = useState(cluster.name)

  const isActive = cluster.id === activeClusterId

  const commitRename = () => {
    const trimmed = draftName.trim()
    renameCluster(cluster.id, trimmed.length > 0 ? trimmed : cluster.name)
    setIsEditing(false)
  }

  return (
    <div className={`cluster-row${isActive ? ' cluster-row--active' : ''}`} onClick={() => setActiveClusterId(cluster.id)}>
      <span className="cluster-row__swatch" style={{ backgroundColor: cluster.color }} />
      {isEditing ? (
        <input
          autoFocus
          className="cluster-row__name-input"
          value={draftName}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setDraftName(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitRename()
            if (e.key === 'Escape') {
              setDraftName(cluster.name)
              setIsEditing(false)
            }
          }}
        />
      ) : (
        <span
          className="cluster-row__name"
          onDoubleClick={(e) => {
            e.stopPropagation()
            setIsEditing(true)
          }}
        >
          {cluster.name}
        </span>
      )}
      <button
        type="button"
        className="cluster-row__delete"
        title="Delete cluster"
        onClick={(e) => {
          e.stopPropagation()
          removeCluster(cluster.id)
        }}
      >
        ×
      </button>
    </div>
  )
}

export function ClusterList() {
  const clusters = useAppStore((s) => s.clusters)

  if (clusters.length === 0) {
    return <div className="cluster-list cluster-list--empty">Draw a polygon on the map to create a cluster.</div>
  }

  return (
    <div className="cluster-list">
      {clusters.map((cluster) => (
        <ClusterRow key={cluster.id} cluster={cluster} />
      ))}
    </div>
  )
}
