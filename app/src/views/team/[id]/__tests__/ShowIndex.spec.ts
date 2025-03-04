import { beforeEach, describe, expect, it, vi } from 'vitest'
import ShowIndex from '@/views/team/[id]/ShowIndex.vue'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import type { Team } from '@/types/team'
// Create mutable refs for reactive state outside the mock
const mockError = ref<string | null>(null)
const mockIsFetching = ref(false)
const mockData = ref<Team | null>(null)

// Mock the modules BEFORE importing the component
vi.mock('@/composables/useCustomFetch', () => {
  // Inline the fake implementation to avoid hoisting issues
  return {
    useCustomFetch: () => ({
      json: () => ({
        execute: vi.fn(),
        error: mockError,
        isFetching: mockIsFetching,
        data: mockData
      }),
      post: () => ({
        json: () => ({
          execute: vi.fn(),
          error: mockError,
          isFetching: mockIsFetching,
          data: mockData
        })
      }),
      get: () => ({
        json: () => ({
          execute: vi.fn(),
          error: mockError,
          isFetching: mockIsFetching,
          data: mockData
        })
      })
    })
  }
})
describe('ShowIndex', () => {
  // Define interface for component instance
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset refs between tests if needed
    mockError.value = null
    mockIsFetching.value = false
    mockData.value = null
  })

  vi.mock('vue-router', () => ({
    useRoute: vi.fn(() => ({
      params: {
        id: 0
      },
      name: 'show-team',
      meta: {
        name: 'Team View'
      }
    }))
  }))

  it('should render the team Breadcrumb', async () => {
    // Your test here
    const wrapper = mount(ShowIndex, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          ContinueAddTeamForm: true,
          TeamMeta: true,
          MemberSection: true
        }
      }
    })
    console.log('Wrapper HTML', wrapper.html())
    expect(wrapper.html()).toContain('Team View')
    expect(wrapper.find('[data-test="loader"]').exists()).toBeFalsy()

    // Set state after mount (simulate async change)

    // Set loader to loading
    mockError.value = null
    mockIsFetching.value = true
    mockData.value = null
    // Wait for watchers to run
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="loader"]').exists()).toBeTruthy()

    // Set state after mount (simulate async change)
    // set error to a string
    mockIsFetching.value = false
    mockError.value = 'New Error'
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="loader"]').exists()).toBeFalsy()
    expect(wrapper.find('[data-test="error-state"]').exists()).toBeTruthy()

    console.log('Wrapper HTML', wrapper.html())

    mockData.value = {
      id: '0x123',
      name: 'Team Name',
      description: 'Lorem',
      bankAddress: null,
      members: [],
      ownerAddress: '',
      votingAddress: null,
      boardOfDirectorsAddress: '',
      teamContracts: []
    }
    mockError.value = null
    await wrapper.vm.$nextTick()
    expect(wrapper.html()).toContain('Team Name')
    console.log('Wrapper HTML', wrapper.html())

    mockData.value = { ...mockData.value, officerAddress: '0x123' }
    mockError.value = null
    await wrapper.vm.$nextTick()
  })
})
