import { describe, it, expect, vi } from 'vitest'
import { setupApp } from '../main'
import { createApp } from 'vue'
import { WagmiPlugin } from '@wagmi/vue'
import { config } from '../wagmi.config'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'

vi.mock('@wagmi/vue', async () => {
  const originalModule = await vi.importActual<typeof import('@wagmi/vue')>('@wagmi/vue')
  return {
    ...originalModule,
    WagmiPlugin: {
      install: vi.fn()
    }
  }
})

vi.mock('@tanstack/vue-query', async () => {
  const originalModule =
    await vi.importActual<typeof import('@tanstack/vue-query')>('@tanstack/vue-query')
  return {
    ...originalModule,
    VueQueryPlugin: {
      install: vi.fn()
    },
    QueryClient: vi.fn()
  }
})

vi.mock('vue', async () => {
  const originalModule = await vi.importActual<typeof import('vue')>('vue')
  return {
    ...originalModule,
    createApp: vi.fn(originalModule.createApp)
  }
})

describe('main.ts', () => {
  it('should create a Vue app instance and register plugins', () => {
    const app = setupApp()
    const queryClient = new QueryClient()

    expect(createApp).toHaveBeenCalled()

    expect(WagmiPlugin.install).toHaveBeenCalledWith(app, { config })
    expect(VueQueryPlugin.install).toHaveBeenCalledWith(app, { queryClient })
  })
})
