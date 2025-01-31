import { describe, expect, it, vi } from 'vitest'
import ShowIndex from '@/views/team/[id]/ShowIndex.vue'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

describe('ShowIndex', () => {
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
        name: 'Team View'
      }
    }))
  }))

  it('should render the team Breadcrumb', () => {
    // Your test here
    const wrapper = mount(ShowIndex)
    expect(wrapper.html()).toContain('Team View')
    // Test if setCurrentTeamId is called

    // Update team meta and check it the team name is displayed

    // Navigate to a new page

    // wrapper.vm.$router.push('/teams/1')
    // vi.mock('vue-router', () => ({
    //   useRoute: vi.fn(() => ({
    //     params: {
    //       id: 0
    //     },
    //     meta: {
    //       name: 'Team View V2'
    //     }
    //   }))
    // }))
    // expect(wrapper.html()).toContain('Team View V2')
  })
})
