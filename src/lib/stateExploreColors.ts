import type { StateProjectSummary } from '@/features/persistence/supabaseStateProjects'

/**
 * Landing-map choropleth colors: a status pair (unexplored/explored) for states with no
 * Good/Great clusters yet, and a single-hue sequential ramp (light→dark) for Good/Great count
 * once there is one. The two tracks never overlap — a nonzero count always wins.
 */
export const UNEXPLORED_COLOR = '#e2e5eb'
export const EXPLORED_COLOR = '#e3c98f'

/** Light→dark, one hue (the app's brand green) — index 0 is "1 cluster", the rest are cumulative buckets. */
const GOOD_GREAT_RAMP = ['#cfe8dc', '#8fc7ab', '#4f9e79', '#124c3c']

export interface GoodGreatBucket {
  label: string
  color: string
}

/** For the legend — the same buckets colorForSummary uses, in light→dark order. */
export const GOOD_GREAT_BUCKETS: GoodGreatBucket[] = [
  { label: '1', color: GOOD_GREAT_RAMP[0] },
  { label: '2–3', color: GOOD_GREAT_RAMP[1] },
  { label: '4–6', color: GOOD_GREAT_RAMP[2] },
  { label: '7+', color: GOOD_GREAT_RAMP[3] },
]

function goodGreatColor(count: number): string {
  if (count <= 1) return GOOD_GREAT_RAMP[0]
  if (count <= 3) return GOOD_GREAT_RAMP[1]
  if (count <= 6) return GOOD_GREAT_RAMP[2]
  return GOOD_GREAT_RAMP[3]
}

export function colorForStateSummary(summary: StateProjectSummary | undefined): string {
  const count = summary?.goodGreatCount ?? 0
  if (count > 0) return goodGreatColor(count)
  return summary?.hasActivity ? EXPLORED_COLOR : UNEXPLORED_COLOR
}

/** Hover label — the count for states with Good/Great clusters, otherwise the explored/unexplored status. */
export function statusLabelForStateSummary(summary: StateProjectSummary | undefined): string {
  const count = summary?.goodGreatCount ?? 0
  if (count > 0) return `${count} Good/Great cluster${count === 1 ? '' : 's'}`
  return summary?.hasActivity ? 'Explored — no Good/Great clusters yet' : 'Unexplored'
}
