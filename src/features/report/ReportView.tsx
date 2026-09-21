import { ClusterStatTiles } from '@/features/cluster-analytics/ClusterStatTiles'
import { chartDefinitions } from '@/features/cluster-analytics/registry'
import { CLUSTER_CONFIDENCE_COLORS, CLUSTER_CONFIDENCE_LABELS } from '@/lib/clusterConfidence'
import { clusterToLatLngList } from '@/lib/exportPolygon'
import type { ReportCluster } from './useReportClusters'

interface ReportViewProps {
  reportClusters: ReportCluster[]
  snapshots: Record<string, string>
  revenueThreshold: number
  datasetFileName: string | null
  generatedAt: number
  onClose: () => void
}

export function ReportView({ reportClusters, snapshots, revenueThreshold, datasetFileName, generatedAt, onClose }: ReportViewProps) {
  return (
    <div className="report-view">
      <div className="report-view__toolbar">
        <span>{reportClusters.length} cluster{reportClusters.length === 1 ? '' : 's'} — ranked by confidence, then % above threshold</span>
        <div className="report-view__toolbar-actions">
          <button type="button" onClick={() => window.print()}>
            Print / Save as PDF
          </button>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      <div className="report-view__paper">
        <header className="report-view__header">
          <h1>STR Market Mapping Report</h1>
          {datasetFileName && <p>{datasetFileName}</p>}
          <p className="report-view__meta">
            Generated {new Date(generatedAt).toLocaleString()} · Revenue threshold ${revenueThreshold.toLocaleString()}
          </p>
        </header>

        {reportClusters.map(({ cluster, rank, stats, listings }) => (
          <section key={cluster.id} className="report-cluster">
            <div className="report-cluster__header">
              <span className="report-cluster__rank">#{rank}</span>
              <h2>{cluster.name}</h2>
              <span
                className="report-cluster__confidence"
                style={{ backgroundColor: CLUSTER_CONFIDENCE_COLORS[cluster.confidence] }}
              >
                {CLUSTER_CONFIDENCE_LABELS[cluster.confidence]}
              </span>
            </div>

            {snapshots[cluster.id] && (
              <img className="report-cluster__snapshot" src={snapshots[cluster.id]} alt={`Map snapshot of ${cluster.name}`} />
            )}

            <ClusterStatTiles stats={stats} revenueThreshold={revenueThreshold} />

            <div className="report-cluster__coords">
              <h3>Polygon Coordinates ({cluster.ring.length} points)</h3>
              <ol className="report-cluster__coords-list">
                {clusterToLatLngList(cluster).map((point, index) => (
                  // eslint-disable-next-line react/no-array-index-key -- vertices have no stable id and never reorder independently of the ring array
                  <li key={index}>
                    {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
                  </li>
                ))}
              </ol>
            </div>

            {listings.length > 0 && (
              <div className="report-cluster__charts">
                {chartDefinitions.map((chart) => (
                  <chart.Component key={chart.id} listings={listings} />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}
