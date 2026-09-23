import { useAppStore } from '@/store/useAppStore'

export function DeleteAllClustersButton() {
  const clusterCount = useAppStore((s) => s.clusters.length)
  const removeAllClusters = useAppStore((s) => s.removeAllClusters)

  if (clusterCount === 0) return null

  return (
    <button
      type="button"
      className="delete-all-clusters"
      onClick={() => {
        if (window.confirm(`Delete all ${clusterCount} cluster${clusterCount === 1 ? '' : 's'}? This can't be undone.`)) {
          removeAllClusters()
        }
      }}
    >
      Delete All
    </button>
  )
}
