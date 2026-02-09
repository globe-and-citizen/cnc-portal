import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'

// Mock the health query with hoisting
const mockRefetch = vi.fn()

vi.mock('@/queries/health.queries', () => ({
  useGetBackendHealthQuery: vi.fn(() => ({
    data: null,
    error: null,
    isLoading: false,
    isFetching: false,
    status: 'pending',
    refetch: mockRefetch.mockResolvedValue({})
  }))
}))

// Unmock the useBackendWake so we can test the real implementation
vi.unmock('@/composables/useBackendWake')

import { useBackendWake } from '@/composables/useBackendWake'

describe('useBackendWake Composable', () => {
  beforeEach(() => {
    mockRefetch.mockClear()
    vi.clearAllMocks()
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

      const wrapper = mount(TestComponent)

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

      const wrapper = mount(TestComponent)

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

      const wrapper = mount(TestComponent)

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

      const wrapper1 = mount(TestComponent)

      const wrapper2 = mount(TestComponent)

      await flushPromises()

      // Both instances should trigger refetch
      expect(mockRefetch).toHaveBeenCalled()
      wrapper1.unmount()
      wrapper2.unmount()
    })
  })
})
