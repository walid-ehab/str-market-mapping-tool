import type { Position } from 'geojson'

/** A user-drawn polygon marking a cluster of listings. */
export interface Cluster {
  id: string
  name: string
  color: string
  /** Closed linear ring, [lng, lat] pairs, first === last. */
  ring: Position[]
  createdAt: number
}
