import { describe, it, expect, vi } from 'vitest'
import TheDrawer from '@/components/TheDrawer.vue'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'

// Create a router instance with a basic route
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: { template: '<div>Home</div>' } },
    { path: '/teams', component: { template: '<div>Teams</div>' } },
    {
      path: '/teams/:id',
      name: 'show-team',
      meta: { name: 'Team View' },
      component: { template: '<div>Teams Vew</div>' },
      children: [
        { path: '/teams/:id/bank', name: 'bank', component: { template: '<div>Teams Bank</div>' } },
        {
          path: '/teams/:id/cash-remunerations',
          name: 'cash-remunerations',
          component: { template: '<div>Teams</div>' }
        },
        {
          path: '/teams/:id/expense-account',
          name: 'expense-account',
          component: { template: '<div>Teams</div>' }
        }
      ]
    },
    { path: '/transactions', component: { template: '<div>Teams</div>' } },
    { path: '/admin', component: { template: '<div>Teams</div>' } }
  ]
})

describe('TheDrawer', () => {
  const name = 'John Doe'
  const address = '0xc0ffee254729296a45a3885639AC7E10F9d54979'

  describe('Team Selection', () => {
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
          teamsAreFetching: true,
          teamsError: null,
          reloadTeams: vi.fn()
        },
        fetchTeam: vi.fn(),
        setCurrentTeamId: vi.fn(),
        currentTeam: { name: 'Team A' }
      })
    }))
    it('should toggle team dropdown when clicked', async () => {
      const wrapper = mount(TheDrawer, {
        props: {
          user: { name, address }
        },
        global: {
          plugins: [router, createTestingPinia({ createSpy: vi.fn })]
        }
      })

      const teamSelector = wrapper.find('[data-test="team-display"]')

      // Check if the team name is displayed and if the dropdown button is not visible
      expect(teamSelector.exists()).toBe(true)
      expect(teamSelector.text()).toContain('Team A')
      expect(teamSelector.find("[data-test='team-dropdown']").exists()).toBe(false)

      // Click the team selector & check if dropdown is visible
      await teamSelector.trigger('click')
      expect(teamSelector.find("[data-test='team-dropdown']").exists()).toBe(true)
      expect(teamSelector.find('.skeleton').exists()).toBe(true)
    })
  })
})
