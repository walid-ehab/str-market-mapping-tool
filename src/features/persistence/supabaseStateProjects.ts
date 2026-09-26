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
  /** The explicit flag OR any cluster at all (even just Maybe) — either counts as "looked at this state" for display. */
  hasActivity: boolean
}

/** Reads a clusters jsonb blob (unknown shape) for its length and Good/Great count, without importing the full Cluster type. */
function summarizeClusters(clusters: unknown): { total: number; goodGreat: number } {
  if (!Array.isArray(clusters)) return { total: 0, goodGreat: 0 }
  const goodGreat = clusters.filter(
    (c) => c && typeof c === 'object' && ('confidence' in c ? c.confidence === 'good' || c.confidence === 'great' : false),
  ).length
  return { total: clusters.length, goodGreat }
}

/** One row per state that has ever been saved — everything else is presumed unexplored. Powers the landing map's color coding, so this fetches every state at once rather than per-state. */
export async function listStateProjectSummaries(): Promise<Map<string, StateProjectSummary>> {
  const { data, error } = await supabase.from('state_projects').select('state_name,clusters,explored')
  if (error) throw new Error(error.message)

  const summaries = new Map<string, StateProjectSummary>()
  for (const row of data ?? []) {
    const { total, goodGreat } = summarizeClusters(row.clusters)
    summaries.set(row.state_name, { goodGreatCount: goodGreat, hasActivity: row.explored || total > 0 })
  }
  return summaries
}
