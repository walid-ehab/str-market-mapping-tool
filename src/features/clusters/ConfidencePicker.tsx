import {
  CLUSTER_CONFIDENCE_COLORS,
  CLUSTER_CONFIDENCE_LABELS,
  CLUSTER_CONFIDENCE_ORDER,
  type ClusterConfidence,
} from '@/lib/clusterConfidence'

interface ConfidencePickerProps {
  value: ClusterConfidence
  onChange: (confidence: ClusterConfidence) => void
}

/** Great / Good / Maybe — how likely a drawn cluster is to be a good STR market. */
export function ConfidencePicker({ value, onChange }: ConfidencePickerProps) {
  return (
    <div className="confidence-picker">
      {CLUSTER_CONFIDENCE_ORDER.map((confidence) => {
        const isActive = confidence === value
        const color = CLUSTER_CONFIDENCE_COLORS[confidence]
        return (
          <button
            key={confidence}
            type="button"
            className={`confidence-picker__option${isActive ? ' confidence-picker__option--active' : ''}`}
            style={isActive ? { backgroundColor: color, borderColor: color } : { borderColor: color, color }}
            onClick={() => onChange(confidence)}
          >
            {CLUSTER_CONFIDENCE_LABELS[confidence]}
          </button>
        )
      })}
    </div>
  )
}
