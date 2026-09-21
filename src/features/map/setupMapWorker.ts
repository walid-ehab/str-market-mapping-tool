import { setWorkerUrl } from 'maplibre-gl'

// See the `maplibreWorkerFiles` Vite plugin (vite.config.ts) for why this path — and not
// MapLibre's own default resolution — is what actually serves the worker script.
// `BASE_URL` (Vite's resolved `base`, trailing slash included) keeps this correct whether
// the app is served from the site root (dev) or a subpath (the GitHub Pages project site).
setWorkerUrl(`${import.meta.env.BASE_URL}maplibre-worker/maplibre-gl-worker.mjs`)
