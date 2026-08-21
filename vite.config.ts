import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
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

export default defineConfig({
  plugins: [react(), viteSingleFile(), pwaVersionPlugin()],
  build: {
    target: 'es2018',
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 100000000,
    cssCodeSplit: false,
  },
})