import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

function pwaVersionPlugin(): Plugin {
  const buildTime = new Date().toISOString()
  const buildVersion = `pomau-${Date.now()}`

  return {
    name: 'pwa-version-plugin',
    config(config) {
      config.define = {
        ...(config.define || {}),
        '__APP_BUILD_VERSION__': JSON.stringify(buildVersion),
        '__APP_BUILD_TIME__': JSON.stringify(buildTime),
      }
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ version: buildVersion, time: buildTime }),
      })
    },
    closeBundle() {
      const swDistPath = path.resolve(process.cwd(), 'dist/sw.js')
      if (fs.existsSync(swDistPath)) {
        let content = fs.readFileSync(swDistPath, 'utf-8')
        content = content.replace(/__CACHE_VERSION__/g, buildVersion)
        content = content.replace(/const CACHE = ['"][^'"]+['"]/, `const CACHE = '${buildVersion}'`)
        fs.writeFileSync(swDistPath, content, 'utf-8')
      }
    },
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), pwaVersionPlugin()],
  // Production hygiene: strip debug statements; keep console.error/warn so
  // field failures ([sync] push failed, chime errors) remain diagnosable.
  ...(mode === 'production'
    ? {
        esbuild: {
          drop: ['debugger'],
          pure: ['console.log', 'console.info', 'console.debug', 'console.trace'],
        },
      }
    : {}),
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/scheduler/')) {
            return 'vendor-react'
          }
          if (id.includes('node_modules/recharts/') || id.includes('node_modules/d3-') || id.includes('node_modules/victory-vendor/')) {
            return 'vendor-charts'
          }
          if (id.includes('node_modules/dexie')) {
            return 'vendor-db'
          }
          if (id.includes('node_modules/lucide-react/')) {
            return 'vendor-icons'
          }
        },
      },
    },
  },
}))