import { defineConfig, type Plugin, type UserConfig, version as viteVersion } from 'vite'
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

export default defineConfig(({ mode }) => {
  // Declared as UserConfig so conditional assignments below are contextually
  // typed where the installed Vite version supports them.
  const config: UserConfig = {
    plugins: [react(), pwaVersionPlugin()],
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
  }

  if (mode === 'production') {
    // Production hygiene: strip debug statements; keep console.error/warn so
    // field failures ([sync] push failed, chime errors) remain diagnosable.
    //
    // The minifier API differs by Vite generation:
    // - Vite <=5 (esbuild-based): esbuild transform options `drop`/`pure`.
    // - Vite >=6 (rolldown/oxc): rolldown output minify options
    //   `compress.dropConsole` / `compress.dropDebugger`. The assignment goes
    //   through a structural cast because older type definitions don't know
    //   these keys; unknown options degrade gracefully to defaults instead of
    //   failing the build.
    const major = Number.parseInt(viteVersion.split('.', 1)[0] ?? '0', 10)
    if (major >= 6) {
      const build = config.build as Record<string, unknown>
      build.rolldownOptions = {
        output: {
          minify: {
            compress: {
              dropConsole: true,
              dropDebugger: true,
            },
          },
        },
      }
    } else {
      config.esbuild = {
        drop: ['debugger'],
        pure: ['console.log', 'console.info', 'console.debug', 'console.trace'],
      } as Record<string, unknown>
    }
  }

  return config
})