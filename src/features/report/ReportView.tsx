import { ClusterStatTiles } from '@/features/cluster-analytics/ClusterStatTiles'
import { chartDefinitions } from '@/features/cluster-analytics/registry'
import { CLUSTER_CONFIDENCE_COLORS, CLUSTER_CONFIDENCE_LABELS } from '@/lib/clusterConfidence'
import { CopyButton } from './CopyButton'
import { formatPolygonGeoJson } from './polygonJson'
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

            <ClusterStatTiles stats={stats} revenueThreshold={revenueThreshold} variant="report" />

            <div className="report-cluster__coords">
              <div className="report-cluster__coords-header">
                <h3>Polygon Boundary ({cluster.ring.length} points, GeoJSON)</h3>
                <CopyButton value={formatPolygonGeoJson(cluster)} />
              </div>
              <pre className="report-cluster__coords-code">
                <code>{formatPolygonGeoJson(cluster)}</code>
              </pre>
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
