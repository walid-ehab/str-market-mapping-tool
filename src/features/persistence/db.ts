import { openDB, type IDBPDatabase } from 'idb'
import { v4 as uuidv4 } from 'uuid'
import type { Cluster } from '@/types/cluster'

const DB_NAME = 'str-market-mapping-tool'
const DB_VERSION = 2
const PROJECTS_STORE = 'projects'
const META_STORE = 'meta'
const CURRENT_PROJECT_KEY = 'currentProjectId'

// v1 of this database had a single 'app-state' record holding one dataset + its clusters —
// uploading a new CSV silently discarded whatever clusters were drawn for the previous one.
// v2 replaces that with many named ProjectRecords (switchable, never overwritten by an upload).
const LEGACY_STORE = 'app-state'
const LEGACY_KEY = 'state'

export interface ProjectRecord {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  clusters: Cluster[]
  revenueThreshold: number
  colorModeId: string
  hiddenLegendEntries: Record<string, string[]>
  filterValues: Record<string, unknown>
  mapStyleId: string
  /** PROPERTY_HOST_TYPE values counted as "professionally hosted". Absent on projects saved before this setting existed. */
  professionalHostTypes?: string[]
  /** Filename of the CSV last uploaded into this project — a re-upload hint, not the data itself. */
  lastDatasetFileName: string | null
}

export type ProjectSummary = Pick<ProjectRecord, 'id' | 'name' | 'updatedAt'>

let dbPromise: Promise<IDBPDatabase> | null = null

function getDb(): Promise<IDBPDatabase> {
  dbPromise ??= openDB(DB_NAME, DB_VERSION, {
    // Fires on THIS connection when some other tab opens a newer version (e.g. after a
    // deploy) and is waiting on us. Without this, an old tab left open holds the lock
    // indefinitely and every other tab's openDB() call — including a fresh reload — hangs
    // forever with no error, since the versionchange transaction never gets to run.
    blocking() {
      dbPromise?.then((db) => db.close())
      dbPromise = null
    },
    upgrade(db, oldVersion, _newVersion, transaction) {
      if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
        db.createObjectStore(PROJECTS_STORE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE)
      }

      if (oldVersion < 2 && db.objectStoreNames.contains(LEGACY_STORE)) {
        transaction
          .objectStore(LEGACY_STORE)
          .get(LEGACY_KEY)
          .then((legacy) => {
            if (!legacy) return
            const now = Date.now()
            const project: ProjectRecord = {
              id: uuidv4(),
              name: legacy.dataset?.fileName?.replace(/\.csv$/i, '') || 'My Project',
              createdAt: now,
              updatedAt: now,
              clusters: legacy.clusters ?? [],
              revenueThreshold: legacy.revenueThreshold,
              colorModeId: legacy.colorModeId,
              hiddenLegendEntries: legacy.hiddenLegendEntries ?? {},
              filterValues: legacy.filterValues,
              mapStyleId: legacy.mapStyleId,
              lastDatasetFileName: legacy.dataset?.fileName ?? null,
            }
            transaction.objectStore(PROJECTS_STORE).put(project)
            transaction.objectStore(META_STORE).put(project.id, CURRENT_PROJECT_KEY)
          })
      }
    },
  })
  return dbPromise
}

export async function listProjects(): Promise<ProjectRecord[]> {
  const db = await getDb()
  const all = (await db.getAll(PROJECTS_STORE)) as ProjectRecord[]
  return all.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function getProject(id: string): Promise<ProjectRecord | null> {
  const db = await getDb()
  const value = (await db.get(PROJECTS_STORE, id)) as ProjectRecord | undefined
  return value ?? null
}

export async function saveProject(project: ProjectRecord): Promise<void> {
  const db = await getDb()
  await db.put(PROJECTS_STORE, project)
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDb()
  await db.delete(PROJECTS_STORE, id)
}

export async function getCurrentProjectId(): Promise<string | null> {
  const db = await getDb()
  const value = (await db.get(META_STORE, CURRENT_PROJECT_KEY)) as string | undefined
  return value ?? null
}

export async function setCurrentProjectId(id: string): Promise<void> {
  const db = await getDb()
  await db.put(META_STORE, id, CURRENT_PROJECT_KEY)
}
