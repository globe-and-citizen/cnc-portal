import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv, PluginOption } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

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
    server: {
      host: true,
      port: 5173
    },
    build: {
      sourcemap: true
    },
    css: {
      devSourcemap: true
    }
  }
})
