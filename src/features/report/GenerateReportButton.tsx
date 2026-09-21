import { useState } from 'react'
import { useMapInstance } from '@/features/map/MapContext'
import { useAppStore } from '@/store/useAppStore'
import { captureClusterSnapshots } from './captureSnapshots'
import { ReportView } from './ReportView'
import { useReportClusters } from './useReportClusters'

type Status = { kind: 'idle' } | { kind: 'capturing'; done: number; total: number } | { kind: 'ready' }

export function GenerateReportButton() {
  const map = useMapInstance()
  const reportClusters = useReportClusters()
  const datasetFileName = useAppStore((s) => s.datasetFileName)
  const revenueThreshold = useAppStore((s) => s.revenueThreshold)

  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [snapshots, setSnapshots] = useState<Record<string, string>>({})
  const [generatedAt, setGeneratedAt] = useState<number>(0)

  if (reportClusters.length === 0) return null

  const isCapturing = status.kind === 'capturing'

  const generate = async () => {
    if (!map || isCapturing) return
    setStatus({ kind: 'capturing', done: 0, total: reportClusters.length })
    const clusters = reportClusters.map((rc) => rc.cluster)
    const captured = await captureClusterSnapshots(map, clusters, (done, total) => setStatus({ kind: 'capturing', done, total }))
    setSnapshots(captured)
    setGeneratedAt(Date.now())
    setStatus({ kind: 'ready' })
  }

  return (
    <>
      <button type="button" className="generate-report-button" disabled={!map || isCapturing} onClick={generate}>
        {isCapturing ? `Generating… ${status.done}/${status.total}` : 'Generate Report'}
      </button>

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
    </>
  )
}
