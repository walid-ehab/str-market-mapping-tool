import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

const MAPLIBRE_WORKER_DIR = 'maplibre-worker'
// The worker script imports this sibling module by its literal relative filename at
// runtime, so both files must be served from the same directory under an unhashed path —
// see maplibreWorkerFiles() below for why this can't go through Vite's normal asset pipeline.
const MAPLIBRE_WORKER_FILES = ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']

/**
 * MapLibre GL JS resolves its worker script from `import.meta.url` using a dynamic
 * template literal, which bundlers can't statically detect — Vite never emits the file,
 * so the worker silently 404s and nothing ever renders (no error surfaces; tiles/points
 * just never appear). We point MapLibre at a stable, well-known path instead (via
 * `setWorkerUrl`, see src/features/map/setupMapWorker.ts) and this plugin serves the two
 * files that path needs — the worker script and the shared chunk it imports by relative
 * path — verbatim, in dev and in the production build alike.
 */
function maplibreWorkerFiles(): Plugin {
  const require = createRequire(import.meta.url)
  const maplibreDist = dirname(require.resolve('maplibre-gl/dist/maplibre-gl-worker.mjs'))

  return {
    name: 'maplibre-worker-files',
    configureServer(server) {
      // Vite serves the dev server under `base` too, so the request path is prefixed with
      // it (e.g. `/str-market-mapping-tool/maplibre-worker/...`) — match against that,
      // not a hardcoded root-relative path.
      const prefix = `${server.config.base}${MAPLIBRE_WORKER_DIR}/`
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0] ?? ''
        const name = url.startsWith(prefix) ? url.slice(prefix.length) : null
        if (!name || !MAPLIBRE_WORKER_FILES.includes(name)) {
          next()
          return
        }
        res.setHeader('Content-Type', 'text/javascript')
        res.end(readFileSync(join(maplibreDist, name)))
      })
    },
    generateBundle() {
      for (const name of MAPLIBRE_WORKER_FILES) {
        this.emitFile({
          type: 'asset',
          fileName: `${MAPLIBRE_WORKER_DIR}/${name}`,
          source: readFileSync(join(maplibreDist, name)),
        })
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  // Served at https://<user>.github.io/str-market-mapping-tool/ — a GitHub Pages project
  // site, not a custom domain, so every asset URL needs this prefix.
  base: '/str-market-mapping-tool/',
  plugins: [react(), maplibreWorkerFiles()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
