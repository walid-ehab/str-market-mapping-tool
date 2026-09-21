import { openDB, type IDBPDatabase } from 'idb'
import type { Cluster } from '@/types/cluster'
import type { Listing } from '@/types/listing'

const DB_NAME = 'str-market-mapping-tool'
const DB_VERSION = 1
const STORE_NAME = 'app-state'
const STATE_KEY = 'state'

export interface PersistedDataset {
  fileName: string
  uploadedAt: number
  listings: Listing[]
}

export interface PersistedState {
  dataset: PersistedDataset | null
  clusters: Cluster[]
  revenueThreshold: number
  colorModeId: string
  hiddenLegendEntries: Record<string, string[]>
  filterValues: Record<string, unknown>
  mapStyleId: string
}

let dbPromise: Promise<IDBPDatabase> | null = null

function getDb(): Promise<IDBPDatabase> {
  dbPromise ??= openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    },
  })
  return dbPromise
}

/**
 * Persistence lives behind this save/load/clear interface so IndexedDB is an
 * implementation detail — swappable later without touching any feature that uses it.
 */
export async function savePersistedState(state: PersistedState): Promise<void> {
  const db = await getDb()
  await db.put(STORE_NAME, state, STATE_KEY)
}

export async function loadPersistedState(): Promise<PersistedState | null> {
  const db = await getDb()
  const value = (await db.get(STORE_NAME, STATE_KEY)) as PersistedState | undefined
  return value ?? null
}

export async function clearPersistedState(): Promise<void> {
  const db = await getDb()
  await db.delete(STORE_NAME, STATE_KEY)
}
