import { useState } from 'react'
import { useMapInstance } from '@/features/map/MapContext'
import { useAppStore } from '@/store/useAppStore'
import { captureClusterSnapshots } from './captureSnapshots'
import { ReportView } from './ReportView'
import { useReportClusters } from './useReportClusters'

type Status = { kind: 'idle' } | { kind: 'capturing'; done: number; total: number } | { kind: 'ready' }

export function GenerateReportButton() {
  const map = useMapInstance()
  const hasAnyClusters = useAppStore((s) => s.clusters.length > 0)
  const datasetFileName = useAppStore((s) => s.datasetFileName)
  const revenueThreshold = useAppStore((s) => s.revenueThreshold)

  // Off by default — a "Maybe" cluster isn't confident enough to hand to a report's reader.
  const [includeMaybe, setIncludeMaybe] = useState(false)
  const reportClusters = useReportClusters(includeMaybe)

  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [snapshots, setSnapshots] = useState<Record<string, string>>({})
  const [generatedAt, setGeneratedAt] = useState<number>(0)

  if (!hasAnyClusters) return null

  const isCapturing = status.kind === 'capturing'
  const canGenerate = !!map && !isCapturing && reportClusters.length > 0

  const generate = async () => {
    if (!canGenerate || !map) return
    setStatus({ kind: 'capturing', done: 0, total: reportClusters.length })
    const clusters = reportClusters.map((rc) => rc.cluster)
    const captured = await captureClusterSnapshots(map, clusters, (done, total) => setStatus({ kind: 'capturing', done, total }))
    setSnapshots(captured)
    setGeneratedAt(Date.now())
    setStatus({ kind: 'ready' })
  }

  return (
    <div className="generate-report">
      <label className="generate-report__toggle">
        <input type="checkbox" checked={includeMaybe} onChange={(e) => setIncludeMaybe(e.target.checked)} />
        Include "Maybe" clusters
      </label>

      <button type="button" className="generate-report-button" disabled={!canGenerate} onClick={() => void generate()}>
        {isCapturing ? `Generating… ${status.done}/${status.total}` : 'Generate Report'}
      </button>

      {!isCapturing && reportClusters.length === 0 && (
        <div className="generate-report__hint">
          No "Great" or "Good" clusters yet — check "Include Maybe clusters" above, or set a cluster's confidence.
        </div>
      )}

      {status.kind === 'ready' && (
        <ReportView
          reportClusters={reportClusters}
          snapshots={snapshots}
          revenueThreshold={revenueThreshold}
          datasetFileName={datasetFileName}
          generatedAt={generatedAt}
          onClose={() => setStatus({ kind: 'idle' })}
        />
      )}
    </div>
  )
}
