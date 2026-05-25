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
export default defineConfig(({ mode }) => {
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
