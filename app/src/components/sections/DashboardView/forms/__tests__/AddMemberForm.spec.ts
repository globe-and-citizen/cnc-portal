import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AddMemberForm from '@/components/sections/DashboardView/forms/AddMemberForm.vue'
import { createTestingPinia } from '@pinia/testing'

// Create mutable refs for reactive state outside the mock
const mockError = ref<string | null>(null)
const mockIsFetching = ref(false)
const mockStatusCode = ref<number | null>(null)

// Mock the modules BEFORE importing the component
vi.mock('@/composables/useCustomFetch', () => {
  // Inline the fake implementation to avoid hoisting issues
  return {
    useCustomFetch: () => ({
      json: () => ({
        execute: vi.fn(),
        error: mockError,
        isFetching: mockIsFetching,
        statusCode: mockStatusCode
      }),
      post: () => ({
        json: () => ({
          execute: vi.fn(),
          error: mockError,
          isFetching: mockIsFetching,
          statusCode: mockStatusCode
        })
      }),
      get: () => ({
        json: () => ({
          execute: vi.fn(),
          error: mockError,
          isFetching: mockIsFetching,
          statusCode: mockStatusCode,
          data: { value: { users: [] } }
        })
      })
    })
  }
})

// Helper to mount the component
const mountComponent = () => {
  return mount(AddMemberForm, {
    props: {
      teamId: 'team-123'
    },
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })]
    }
  })
}

describe('AddMemberForm.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset refs between tests if needed
    mockError.value = null
    mockIsFetching.value = false
    mockStatusCode.value = null
  })

  it('State 1: no error, not loading, no statusCode', async () => {
    const wrapper = mountComponent()

    // Set state after mount (simulate async change)
    mockError.value = null
    mockIsFetching.value = false
    mockStatusCode.value = null

    // Wait for watchers to run
    await wrapper.vm.$nextTick()

    // There should be no alerts rendered
    expect(wrapper.findAll('.alert').length).toBe(0)
  })

  it('State 2: no error, loading, no statusCode', async () => {
    const wrapper = mountComponent()

    // Simulate loading after mount
    mockError.value = null
    mockIsFetching.value = true
    mockStatusCode.value = null

    await wrapper.vm.$nextTick()

    // Find ButtonUI (ensure you use correct selector if needed)
    const button = wrapper.findComponent({ name: 'ButtonUI' })
    // Expect loading to be true
    expect(button.props('loading')).toBe(true)
    expect(button.props('disabled')).toBe(true)
  })

  it('State 3: error exists, not loading, statusCode', async () => {
    const wrapper = mountComponent()

    // Simulate error state
    mockError.value = 'Error'
    mockIsFetching.value = false
    mockStatusCode.value = 500

    await wrapper.vm.$nextTick()

    const alert = wrapper.find('.alert.alert-danger')
    expect(alert.exists()).toBe(true)
    expect(alert.text()).toContain('Something went wrong')

    mockStatusCode.value = 401

    await wrapper.vm.$nextTick()

    const alert2 = wrapper.find('.alert.alert-warning')
    expect(alert2.exists()).toBe(true)
    expect(alert2.text()).toContain("You don't have the right for this")
  })

  it('State 4: no error, not loading, statusCode 201', async () => {
    const wrapper = mountComponent()

    // For a success state, you might need to simulate a transition from loading to not loading.
    // For example, start with loading true, then set it to false with a success status:
    mockError.value = null
    mockIsFetching.value = true
    mockStatusCode.value = null

    await wrapper.vm.$nextTick()

    // Now simulate that loading finished successfully:
    mockIsFetching.value = false
    mockStatusCode.value = 201

    await wrapper.vm.$nextTick()

    // The component's watcher should trigger and emit 'memberAdded'
    expect(wrapper.emitted('memberAdded')).toBeTruthy()
  })
})
