import { beforeEach, describe, expect, it, vi } from 'vitest'
import ShowIndex from '@/views/team/[id]/ShowIndex.vue'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import type { Team } from '@/types/team'
import { createRouter, createWebHistory } from 'vue-router'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { useTeam } from '@/queries/team.queries'
import { createMockAxiosResponse } from '@/tests/mocks/query.mock'

describe('ShowIndex', () => {
  // Define interface for component instance
  const queryClient = new QueryClient()
  const useTeamMock = vi.mocked(useTeam)

  beforeEach(() => {
    vi.clearAllMocks()
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
    const customTeamData: Team = {
      id: '0x123',
      name: 'Team Name',
      description: 'Lorem',
      members: [],
      ownerAddress: '0xDDDD',
      officerAddress: '0x123',
      teamContracts: []
    }

    // Override the useTeam mock for this test
    useTeamMock.mockReturnValue({
      data: ref(customTeamData),
      isPending: ref(false),
      isEnabled: ref(false),
      error: ref(null),
      refetch: vi.fn()
    })

    const wrapper = mount(ShowIndex, {
      global: {
        plugins: [
          router,
          createTestingPinia({ createSpy: vi.fn }),
          [VueQueryPlugin, { queryClient }]
        ],
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

    // Test that team name is rendered
    expect(wrapper.html()).toContain('Team Name')
  })

  // Display the component whit the officer address

  // TODO: change route
  // TODO: Click the modal
})
