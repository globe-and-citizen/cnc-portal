import { describe, expect, it, vi } from 'vitest'
import ListIndex from '@/views/team/ListIndex.vue'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import type { Team } from '@/types/team'

describe('ListIndex', () => {
  // Define interface for component instance
  interface ComponentInstance {
    teamsAreFetching: boolean
    teamsError: unknown
    teams: Team[]
  }
  vi.mock('@/stores/teamStore', () => ({
    useTeamStore: () => ({
      currentTeamId: ref(1),
      teamsMeta: {
        teams: [
          {
            id: '1',
            name: 'Team A',
            members: []
          },
          {
            id: '2',
            name: 'Team B',
            members: [1, 2]
          }
        ],
        teamsAreFetching: false,
        teamsError: null,
        reloadTeams: vi.fn()
      },
      fetchTeam: vi.fn(),
      setCurrentTeamId: vi.fn(),
      currentTeam: { name: 'Team A' }
    })
  }))

  vi.mock('vue-router', () => ({
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
  }))

  vi.mock('@/composables/useCustomFetch', () => {
    return {
      useCustomFetch: vi.fn(() => ({
        get: () => ({
          json: () => ({
            execute: vi.fn(),
            data: [{ id: '0x123', name: 'John Doe', description: 'Lorem' }],
            isFetching: ref(false),
            error: ref<unknown>(null)
          })
        })
      }))
    }
  })

  it('should render the team List and switch from loading, to error state', async () => {
    const wrapper = mount(ListIndex, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: ['AddTeamForm']
      }
    })

    expect(wrapper.html()).toContain('Team List View')
    expect(wrapper.html()).toContain('John Doe')

    const vm = wrapper.vm as unknown as ComponentInstance

    // Set an invalid step number
    vm.teamsError = 'New Error'
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="error-state"]').exists()).toBeTruthy()

    // Set an invalid step number
    vm.teamsAreFetching = true
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="loader"]').exists()).toBeTruthy()
  })
})
