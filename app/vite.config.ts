import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv, PluginOption } from 'vite'
import vue from '@vitejs/plugin-vue'
import ui from '@nuxt/ui/vite'
import vueDevTools from 'vite-plugin-vue-devtools'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import tailwindcss from '@tailwindcss/vite'
import { sentryVitePlugin } from '@sentry/vite-plugin'

export const ENV_LIST = ['VITE_APP_BACKEND_URL', 'VITE_APP_NETWORK_ALIAS']
const SUPPORTED_NETWORKS = ['sepolia', 'hardhat', 'amoy', 'polygon']

// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => {
  // Validate .env file
  const env = loadEnv(mode, process.cwd(), '')

  if (!process.env.CI) {
    ENV_LIST.forEach((key) => {
      if (!env[key]) {
        throw new Error(`Missing ${key} in .env file`)
      } else if (key === 'VITE_APP_NETWORK_ALIAS' && !SUPPORTED_NETWORKS.includes(env[key])) {
        throw new Error(`Network ${env[key]} is not supported`)
      } else if (key.includes('URL') && !env[key].startsWith('http')) {
        throw new Error(`Invalid URL in ${key}`)
      }
    })
  }
  const plugins: PluginOption = [
    vue(),
    tailwindcss(),
    ui(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true
      },
      protocolImports: true
    })
  ]

  if (!process.env.CI) {
    plugins.push(vueDevTools())
  }

  // In E2E mode, instrument source files so Playwright can collect coverage
  // via `window.__coverage__`. Imported dynamically so the devDep isn't
  // required for prod/dev builds — Railway and other prod-only installs
  // (`npm ci --omit=dev`) would fail otherwise.
  if (process.env.VITE_E2E === 'true') {
    const { default: istanbul } = await import('vite-plugin-istanbul')
    plugins.push(
      istanbul({
        include: 'src/**/*',
        exclude: ['node_modules', 'test/', 'src/e2e/**'],
        extension: ['.js', '.ts', '.vue'],
        requireEnv: false,
        cypress: false
      })
    )
  }

  const isProd = mode === 'production'

  // Upload source maps to Sentry in production and delete them from dist/
  // so they are never served to end-users (hidden sourcemap).
  if (isProd && process.env.SENTRY_AUTH_TOKEN) {
    plugins.push(
      sentryVitePlugin({
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT ?? 'cnc-portal-app',
        authToken: process.env.SENTRY_AUTH_TOKEN,
        sourcemaps: {
          // Remove .map files from the dist folder after upload so they
          // are never accessible to end-users.
          deleteAfterUpload: true
        },
        release: {
          name: process.env.VITE_APP_RELEASE ?? undefined
        }
      })
    )
  }

  return {
    plugins,
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        buffer: 'buffer/',
        crypto: 'crypto-browserify',
        stream: 'stream-browserify',
        events: 'events'
      }
    },
    ui: {
      button: {
        defaultVariant: {
          size: 'xl'
        }
      },
      input: {
        defaultVariant: {
          size: 'xl'
        }
      },
      select: {
        defaultVariant: {
          size: 'xl'
        }
      },
      selectMenu: {
        defaultVariant: {
          size: 'xl'
        }
      },
      textarea: {
        defaultVariant: {
          size: 'xl'
        }
      },
      switch: {
        defaultVariant: {
          size: 'xl'
        }
      }
    },
    server: {
      host: true,
      port: 5173
    },
    optimizeDeps: {
      // Pre-bundle in the initial pass so Vite never re-optimizes mid-session.
      // `viem/accounts` is pulled in only by the e2e mock connector and would
      // otherwise be discovered late, triggering an "Outdated Optimize Dep"
      // reload that breaks Playwright runs against a cold dev server.
      // `xlsx` is only reached via the lazy `import('xlsx')` in the accounting
      // export — without this, the first Export click re-optimizes and reloads
      // the page, silently aborting the download.
      // The ProseMirror packages back the Nuxt UI `UEditor` (weekly goals memo).
      // Pre-bundling them as a single copy avoids the "Adding different instances
      // of a keyed plugin" TipTap error and mid-session re-optimize reloads.
      include: [
        'viem/accounts',
        'xlsx',
        '@nuxt/ui > prosemirror-state',
        '@nuxt/ui > prosemirror-transform',
        '@nuxt/ui > prosemirror-model',
        '@nuxt/ui > prosemirror-view',
        '@nuxt/ui > prosemirror-gapcursor'
      ]
    },
    build: {
      // 'hidden' generates source maps but does NOT reference them in the
      // output files, so browsers cannot load them. The Sentry plugin above
      // uploads them to Sentry (prod only) and then deletes them from dist/.
      sourcemap: isProd ? 'hidden' : true
    },
    css: {
      devSourcemap: true
    }
  }
})
