import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useBackendHealth, useBackendWake } from '@/composables/useBackendWake'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { defineComponent, h } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('useBackendWake Composable', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    // Create a fresh QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false // Disable retries in tests for faster execution
        }
      }
    })

    // Clear all mocks
    mockFetch.mockClear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    queryClient.clear()
  })

  describe('useBackendHealth', () => {
    it('should make a fetch request to /api/health endpoint', async () => {
      // Mock successful response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          status: 'healthy',
          timestamp: '2025-12-11T17:35:00.000Z',
          service: 'backend'
        })
      } as Response)

      const TestComponent = defineComponent({
        setup() {
          const { refetch } = useBackendHealth()
          return { refetch }
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

      // Trigger the query
      await wrapper.vm.refetch()
      await flushPromises()

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/health'),
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        })
      )

      wrapper.unmount()
    })

    it('should return health check response data', async () => {
      const mockHealthData = {
        success: true,
        status: 'healthy',
        timestamp: '2025-12-11T17:35:00.000Z',
        service: 'backend'
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockHealthData
      } as Response)

      const TestComponent = defineComponent({
        setup() {
          const { data, refetch } = useBackendHealth()
          return { data, refetch }
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

      await wrapper.vm.refetch()
      await flushPromises()

      expect(wrapper.vm.data).toEqual(mockHealthData)

      wrapper.unmount()
    })

    it('should cache response for 3 minutes (staleTime)', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          status: 'healthy',
          timestamp: '2025-12-11T17:35:00.000Z',
          service: 'backend'
        })
      } as Response)

      const TestComponent = defineComponent({
        setup() {
          // Call useBackendHealth twice in same component (same context)
          const query1 = useBackendHealth()
          const query2 = useBackendHealth()
          return { data1: query1.data, data2: query2.data, refetch1: query1.refetch }
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

      // Trigger first query
      await wrapper.vm.refetch1()
      await flushPromises()

      // Both queries should have the same data (from cache)
      expect(wrapper.vm.data1).toEqual(wrapper.vm.data2)

      // Should only have made one fetch call
      expect(mockFetch).toHaveBeenCalledTimes(1)

      wrapper.unmount()
    })
  })

  describe('useBackendWake', () => {
    it('should call refetch on mount', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          status: 'healthy',
          service: 'backend'
        })
      } as Response)

      const TestComponent = defineComponent({
        setup() {
          useBackendWake()
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

      await flushPromises()
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(mockFetch).toHaveBeenCalled()

      wrapper.unmount()
    })

    it('should not block component rendering', async () => {
      // Mock a slow response
      mockFetch.mockImplementationOnce(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              status: 200,
              json: async () => ({ success: true })
            } as Response)
          }, 1000)
        })
      })

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

    it('should share cache between multiple useBackendWake calls in same app', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          status: 'healthy'
        })
      } as Response)

      // Single component that calls useBackendWake twice
      const TestComponent = defineComponent({
        setup() {
          useBackendWake() // First call
          useBackendWake() // Second call - should use cache
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

      await flushPromises()
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Should only make one fetch call despite two useBackendWake calls
      // because they share the same queryClient and cache
      expect(mockFetch).toHaveBeenCalledTimes(1)

      wrapper.unmount()
    })
  })

  describe('HealthCheckResponse Type', () => {
    it('should match expected response structure', async () => {
      const mockResponse = {
        success: true,
        status: 'healthy',
        timestamp: '2025-12-11T17:35:00.000Z',
        service: 'backend'
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      } as Response)

      const TestComponent = defineComponent({
        setup() {
          const { data, refetch } = useBackendHealth()
          return { data, refetch }
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

      await wrapper.vm.refetch()
      await flushPromises()

      expect(wrapper.vm.data).toHaveProperty('success', true)
      expect(wrapper.vm.data).toHaveProperty('status', 'healthy')
      expect(wrapper.vm.data).toHaveProperty('timestamp')
      expect(wrapper.vm.data).toHaveProperty('service', 'backend')

      wrapper.unmount()
    })
  })
})
