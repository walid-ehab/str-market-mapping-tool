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
