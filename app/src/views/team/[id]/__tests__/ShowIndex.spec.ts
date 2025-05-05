import { beforeEach, describe, expect, it, vi } from 'vitest'
import ShowIndex from '@/views/team/[id]/ShowIndex.vue'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import type { Team } from '@/types/team'
import { createRouter, createWebHistory } from 'vue-router'
// Create mutable refs for reactive state outside the mock
const mockError = ref<string | null>(null)
const mockIsFetching = ref(false)
const mockData = ref<Team | null>(null)
const mockStatus = ref(200)

// Mock the modules BEFORE importing the component
vi.mock('@/composables/useCustomFetch', () => {
  // Inline the fake implementation to avoid hoisting issues
  return {
    useCustomFetch: () => ({
      json: () => ({
        execute: vi.fn(),
        error: mockError,
        isFetching: mockIsFetching,
        data: mockData,
        status: mockStatus
      }),
      post: () => ({
        json: () => ({
          execute: vi.fn(),
          error: mockError,
          isFetching: mockIsFetching,
          data: mockData,
          status: mockStatus
        })
      }),
      get: () => ({
        json: () => ({
          execute: vi.fn(),
          error: mockError,
          isFetching: mockIsFetching,
          data: mockData,
          status: mockStatus
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
    mockStatus.value = 200
  })
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      {
        path: '/team/:id',
        name: 'show-team',
        meta: { name: 'Team View' },
        component: { template: '<div>Home</div>' }
      } // Basic route
    ] // Define your routes here if needed
  })
  // TODO test navigation

  it('should render the team Breadcrumb', async () => {
    // Your test here
    const wrapper = mount(ShowIndex, {
      global: {
        plugins: [router, createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          ContinueAddTeamForm: true,
          TeamMeta: true,
          MemberSection: true
        }
      }
    })
    await router.push({ name: 'show-team', params: { id: '1' } })
    await wrapper.vm.$nextTick()
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
    mockStatus.value = 500
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="loader"]').exists()).toBeFalsy()
    expect(wrapper.find('[data-test="error-state"]').exists()).toBeTruthy()

    mockError.value = 'New Error'
    mockStatus.value = 404
    await wrapper.vm.$nextTick()

    mockData.value = {
      id: '0x123',
      name: 'Team Name',
      description: 'Lorem',
      members: [],
      ownerAddress: '0xDDDD',
      officerAddress: '0x123',
      teamContracts: []
    }
    mockError.value = null
    await wrapper.vm.$nextTick()
    expect(wrapper.html()).toContain('Team Name')
  })

  // Display the component whit the officer address

  // TODO: change route
  // TODO: Click the modal
})
