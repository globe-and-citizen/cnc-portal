import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useBackendWake } from '@/composables/useBackendWake'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { defineComponent, h } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'

// Mock the health query
const mockRefetch = vi.fn()

vi.mock('@/queries/health.queries', () => ({
  useBackendHealthQuery: vi.fn(() => ({
    data: null,
    error: null,
    isLoading: false,
    isFetching: false,
    status: 'pending',
    refetch: mockRefetch.mockResolvedValue({})
  }))
}))

describe('useBackendWake Composable', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    // Create a fresh QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false
        }
      }
    })

    mockRefetch.mockClear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    queryClient.clear()
  })

  describe('useBackendWake', () => {
    it('should call refetch on mount', async () => {
      const TestComponent = defineComponent({
        setup() {
          useBackendWake()
          return {}
        },
        render() {
          return h('div')
        }
      })

      const wrapper = mount(TestComponent, {
        global: {
          plugins: [[VueQueryPlugin, { queryClient }]]
        }
      })

      // Wait for mount lifecycle
      await flushPromises()

      expect(mockRefetch).toHaveBeenCalled()

      wrapper.unmount()
    })

    it('should handle refetch errors silently', async () => {
      const consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
      mockRefetch.mockRejectedValueOnce(new Error('Network error'))

      const TestComponent = defineComponent({
        setup() {
          useBackendWake()
          return {}
        },
        render() {
          return h('div')
        }
      })

      const wrapper = mount(TestComponent, {
        global: {
          plugins: [[VueQueryPlugin, { queryClient }]]
        }
      })

      await flushPromises()

      expect(consoleDebugSpy).toHaveBeenCalledWith(
        'Backend wake-up ping failed (non-critical):',
        expect.any(Error)
      )

      consoleDebugSpy.mockRestore()
      wrapper.unmount()
    })

    it('should not block component rendering', async () => {
      const TestComponent = defineComponent({
        setup() {
          useBackendWake()
          return { rendered: true }
        },
        render() {
          return h('div', 'Test')
        }
      })

      const wrapper = mount(TestComponent, {
        global: {
          plugins: [[VueQueryPlugin, { queryClient }]]
        }
      })

      // Component should be rendered immediately without waiting
      expect(wrapper.html()).toContain('Test')
      expect(wrapper.vm.rendered).toBe(true)

      wrapper.unmount()
    })

    it('should work in multiple component instances', async () => {
      const TestComponent = defineComponent({
        setup() {
          useBackendWake()
          return {}
        },
        render() {
          return h('div')
        }
      })

      const wrapper1 = mount(TestComponent, {
        global: {
          plugins: [[VueQueryPlugin, { queryClient }]]
        }
      })

      const wrapper2 = mount(TestComponent, {
        global: {
          plugins: [[VueQueryPlugin, { queryClient }]]
        }
      })

      await flushPromises()

      // Both instances should trigger refetch
      expect(mockRefetch).toHaveBeenCalled()
      wrapper1.unmount()
      wrapper2.unmount()
    })
  })
})
