import { configDefaults, defineConfig, mergeConfig } from 'vitest/config'

import { fileURLToPath } from 'node:url'
import viteConfig from './vite.config'

import dotenv from 'dotenv'

dotenv.config()
process.env.TZ = 'UTC'
const mockFiles = ['store', 'composables', 'wagmi.vue', 'transactions', 'erc20'].map(
  (name) => `./src/tests/setup/${name}.setup.ts`
)
export default defineConfig((env) =>
  mergeConfig(viteConfig(env), {
    test: {
      setupFiles: mockFiles,
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'test/e2e/*', 'constant/*'],
      root: fileURLToPath(new URL('./', import.meta.url)),
      coverage: {
        provider: 'istanbul',
        exclude: ['./src/tests/*'],
        enabled: process.env.VITE_ENABLE_COVERAGE
          ? (process.env.VITE_ENABLE_COVERAGE as unknown as boolean)
          : false
      },
      env: {
        VITE_APP_NETWORK_ALIAS: 'sepolia'
      }
    }
  })
)
