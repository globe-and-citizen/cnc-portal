import { configDefaults, defineConfig, mergeConfig } from 'vitest/config'

import { fileURLToPath } from 'node:url'
import viteConfig from './vite.config'

import dotenv from 'dotenv'

dotenv.config()

export default defineConfig((env) =>
  mergeConfig(viteConfig(env), {
    test: {
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'test/e2e/*'],
      root: fileURLToPath(new URL('./', import.meta.url)),
      coverage: {
        provider: 'istanbul',
        enabled: process.env.VITE_ENABLE_COVERAGE
          ? (process.env.VITE_ENABLE_COVERAGE as unknown as boolean)
          : false
      }
    }
  })
)
