import { setWorkerUrl } from 'maplibre-gl'

// See the `maplibreWorkerFiles` Vite plugin (vite.config.ts) for why this path — and not
// MapLibre's own default resolution — is what actually serves the worker script.
setWorkerUrl('/maplibre-worker/maplibre-gl-worker.mjs')
