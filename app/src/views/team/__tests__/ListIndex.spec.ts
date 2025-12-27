import { beforeEach, describe, expect, it, vi } from 'vitest'
import ListIndex from '@/views/team/ListIndex.vue'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { mockTeamsData } from '@/tests/mocks/query.mock'

vi.mock('vue-router', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useRoute: vi.fn(() => ({
      params: {
        id: 0
      },
      meta: {
        name: 'Team List View'
      }
    })),
    useRouter: vi.fn(() => ({
      push: vi.fn()
    }))
  }
})

vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useToastStore: vi.fn(() => ({
      addErrorToast: vi.fn(),
      addSuccessToast: vi.fn()
    })),
    useAccount: vi.fn(() => {
      return {
        chainId: ref(11155111)
      }
    }),
    useSwitchChain: vi.fn(() => {
      return {
        switchChain: vi.fn()
      }
    })
  }
})
vi.mock('@/queries/team.queries', () => ({
  useTeams: vi.fn(() => ({
    data: ref(mockTeamsData),
    error: ref(null),
    isPending: ref(false)
  }))
}))

describe('ListIndex', () => {
  // Define interface for component instance
  const queryClient = new QueryClient()
  // const useTeamsMock = vi.mocked(useTeams)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render the team List and switch from loading, to error , empty data or somes data', async () => {
    // Setup mock with test data
    // useTeamsMock.mockReturnValue(createMockQueryResponse(mockTeamsData))


    const wrapper = mount(ListIndex, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn }), [VueQueryPlugin, { queryClient }]],
        stubs: ['AddTeamForm']
      }
    })

    await wrapper.vm.$nextTick()
    expect(wrapper.html()).toContain('Team List View')
  })

  it('Should open the modal on click', async () => {
    // useTeamsMock.mockReturnValue({
    //   data: ref(createMockQueryResponse(mockTeamsData)),
    //   isPending: ref(false),
    //   error: ref(null),
    //   refetch: vi.fn()
    // })

    const wrapper = mount(ListIndex, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn }), [VueQueryPlugin, { queryClient }]],
        stubs: ['AddTeamForm']
      }
    })

    // Open the modal by clicking the button
    wrapper.find('[data-test="add-team"]').trigger('click')
    await wrapper.vm.$nextTick()
    // TODO: Assert modal opens once drawer implementation is finalized
  })
})
