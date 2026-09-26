import { supabase } from '@/lib/supabaseClient'
import type { StateProjectRow } from '@/types/supabaseSchema'

/** Loads a state's saved clusters/settings row, or null if nothing's been saved for it yet. */
export async function getStateProject(stateName: string): Promise<StateProjectRow | null> {
  const { data, error } = await supabase.from('state_projects').select('*').eq('state_name', stateName).maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

/** Upserts a state's clusters/settings — creates the row on first save, replaces it thereafter. */
export async function saveStateProject(row: StateProjectRow): Promise<void> {
  const { error } = await supabase.from('state_projects').upsert(row, { onConflict: 'state_name' })
  if (error) throw new Error(error.message)
}

export interface StateProjectSummary {
  goodGreatCount: number
  explored: boolean
}

/** Counts a cluster as Good/Great without importing the full Cluster type — this only ever reads a jsonb blob of unknown shape. */
function countGoodGreat(clusters: unknown): number {
  if (!Array.isArray(clusters)) return 0
  return clusters.filter(
    (c) => c && typeof c === 'object' && ('confidence' in c ? c.confidence === 'good' || c.confidence === 'great' : false),
  ).length
}

/** One row per state that has ever been saved — everything else is presumed unexplored. Powers the landing map's color coding, so this fetches every state at once rather than per-state. */
export async function listStateProjectSummaries(): Promise<Map<string, StateProjectSummary>> {
  const { data, error } = await supabase.from('state_projects').select('state_name,clusters,explored')
  if (error) throw new Error(error.message)

  const summaries = new Map<string, StateProjectSummary>()
  for (const row of data ?? []) {
    summaries.set(row.state_name, { goodGreatCount: countGoodGreat(row.clusters), explored: row.explored })
  }
  return summaries
}
