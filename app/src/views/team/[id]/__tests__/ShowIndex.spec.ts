import { beforeEach, describe, expect, it, vi } from 'vitest'
import ShowIndex from '@/views/team/[id]/ShowIndex.vue'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import type { Team } from '@/types/team'
import { createRouter, createWebHistory } from 'vue-router'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'

// Create mutable refs for reactive state outside the mock
const mockError = ref<Error | null>(null)
const mockIsFetching = ref(false)
const mockData = ref<Team | null>(null)

// Mock the team queries to control the reactive state
vi.mock('@/queries/team.queries', () => {
  return {
    useTeams: () => ({
      data: ref([]),
      isPending: ref(false),
      error: ref(null),
      refetch: vi.fn()
    }),
    useTeam: () => ({
      data: mockData,
      isPending: mockIsFetching,
      isEnabled: mockIsFetching,
      error: mockError,
      refetch: vi.fn()
    })
  }
})

describe('ShowIndex', () => {
  // Define interface for component instance
  const queryClient = new QueryClient()

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset refs between tests if needed
    mockError.value = null
    mockIsFetching.value = false
    mockData.value = null
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
        plugins: [router, createTestingPinia({ createSpy: vi.fn }), [VueQueryPlugin, { queryClient }]],
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
    const error500 = new Error('New Error') as Error & { status?: number }
    error500.status = 500
    mockError.value = error500
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="loader"]').exists()).toBeFalsy()
    expect(wrapper.find('[data-test="error-state"]').exists()).toBeTruthy()

    const error404 = new Error('New Error') as Error & { status?: number }
    error404.status = 404
    mockError.value = error404
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
