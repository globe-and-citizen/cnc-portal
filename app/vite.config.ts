import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import inject from '@rollup/plugin-inject'
import { ENV_LIST } from './env-list'
import { isAddress } from 'ethers'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Validate .env file
  const env = loadEnv(mode, process.cwd(), '')

  if (!process.env.CI) {
    ENV_LIST.forEach((key) => {
      if (!env[key]) {
        throw new Error(`Missing ${key} in .env file`)
      } else if (key.includes('ADDRESS') && !isAddress(env[key])) {
        throw new Error(`Invalid address in ${key}`)
      } else if (key.includes('URL') && !env[key].startsWith('http')) {
        throw new Error(`Invalid URL in ${key}`)
      }
    })
  }

  return {
    plugins: [
      vue(),
      inject({
        Buffer: ['buffer', 'Buffer']
      })
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        buffer: 'buffer/'
      }
    },
    server: {
      host: true,
      port: 5173
    }
  }
})
