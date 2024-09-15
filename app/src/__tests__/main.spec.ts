import { describe, it, expect, vi } from 'vitest'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { WagmiPlugin } from '@wagmi/vue'
import { VueQueryPlugin } from '@tanstack/vue-query'
import router from '../router'
import App from '../App.vue'
import { config } from '../wagmi.config'
import { QueryClient } from '@tanstack/vue-query'

vi.mock('./router', () => ({
  default: {
    isRouter: true,
    push: vi.fn()
  }
}))

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
  // Partially mock '@tanstack/vue-query' module
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

describe('App.vue setup', () => {
  it('should create a Vue app instance and register plugins', () => {
    const app = createApp(App)
    const queryClient = new QueryClient()

    app.use(createPinia())
    app.use(router)
    app.use(WagmiPlugin, { config })
    app.use(VueQueryPlugin, { queryClient })

    expect(WagmiPlugin.install).toHaveBeenCalledWith(app, { config })
    expect(VueQueryPlugin.install).toHaveBeenCalledWith(app, { queryClient })
  })
})
