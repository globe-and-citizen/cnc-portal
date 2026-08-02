import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'
import ListIndex from '@/views/team/ListIndex.vue'
import { mount } from '@vue/test-utils'
import { createMockQueryResponse } from '@/tests/mocks/query.mock'
import { mockTeamsData, mockTeamData, mockRouterPush, mockUserStore } from '@/tests/mocks'
import type { Team } from '@/types'
import { useRoute } from 'vue-router'

// Import after mocks are defined
import { useGetTeamsQuery } from '@/queries/team.queries'

describe('ListIndex - Team List View', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useRoute).mockReturnValue({
      params: { id: '0' },
      meta: { name: 'Companies' }
    } as ReturnType<typeof useRoute>)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // Helper function for component mounting
  const createWrapper = (
    teamsData: Team[] | null = mockTeamsData,
    isLoading = false,
    error: Error | null = null
  ) => {
    vi.mocked(useGetTeamsQuery).mockReturnValueOnce(
      createMockQueryResponse(teamsData, isLoading, error)
    )

    return mount(ListIndex, {
      global: {
        stubs: {
          TeamCard: {
            template:
              '<div :data-test="`team-card-${team.id}`" class="team-card"><strong>{{ team.name }}</strong></div>',
            props: ['team']
          },
          AddTeamForm: { template: '<div data-test="add-team-form"></div>' }
        }
      }
    })
  }

  describe('Toolbar', () => {
    it('renders the page heading', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('h2').text()).toContain('Companies')
    })

    it('keeps the toolbar visible while loading', async () => {
      const wrapper = createWrapper([], true)
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="companies-toolbar"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="create-company-button"]').exists()).toBe(true)
    })

    it('keeps the toolbar visible on error', async () => {
      const wrapper = createWrapper([], false, new Error('boom'))
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="companies-toolbar"]').exists()).toBe(true)
    })

    it('renders every toolbar control', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('[data-test="role-filter"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="search-companies"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="filters-button"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="view-toggle-cards"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="view-toggle-table"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="create-company-button"]').exists()).toBe(true)
    })
  })

  describe('Loading State', () => {
    it('should display loader when teams are being fetched', async () => {
      const wrapper = createWrapper([], true) // Loading state with empty teams
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="loader"]').exists()).toBe(true)
      expect(wrapper.findAll('[data-test="loader"] [aria-busy="true"]')).toHaveLength(16) // 4 skeletons × 4 items
    })

    it('should hide team list during loading', async () => {
      const wrapper = createWrapper([], true)
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="team-list"]').exists()).toBe(false)
    })
  })

  describe('Empty State', () => {
    it('should display empty state when no teams exist', async () => {
      const wrapper = createWrapper([]) // Empty teams array
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="empty-state"]').exists()).toBe(true)
    })

    it('should display appropriate message in empty state', async () => {
      const wrapper = createWrapper([])
      await wrapper.vm.$nextTick()

      const emptyState = wrapper.find('[data-test="empty-state"]')
      expect(emptyState.text()).toContain('You are currently not a part of any team')
      expect(emptyState.text()).toContain('Create a new team now!')
      expect(emptyState.text()).toContain(mockUserStore.name)
    })

    it('should display illustration in empty state', async () => {
      const wrapper = createWrapper([])
      await wrapper.vm.$nextTick()

      const illustration = wrapper.find('img[alt="Login illustration"]')
      expect(illustration.exists()).toBe(true)
      expect(illustration.attributes('width')).toBe('300')
    })

    it('should not display team list when teams array is empty', async () => {
      const wrapper = createWrapper([])
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="team-list"]').exists()).toBe(false)
    })

    it('should display the create company button when no teams', async () => {
      const wrapper = createWrapper([], false)
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="create-company-button"]').exists()).toBe(true)
    })
  })

  describe('Error State', () => {
    it('should display error message when teams fetch fails', async () => {
      const error = new Error('Failed to fetch teams')
      const wrapper = createWrapper([], false, error)
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="error-state"]').exists()).toBe(true)
    })

    it('should display error alert with appropriate message', async () => {
      const error = new Error('Network error')
      const wrapper = createWrapper([], false, error)
      await wrapper.vm.$nextTick()

      const errorAlert = wrapper.find('[data-test="error-state"]')
      expect(errorAlert.exists()).toBe(true)
      expect(errorAlert.text()).toContain('We are unable to retrieve your teams')
    })

    it('should hide team list on error', async () => {
      const error = new Error('Failed to fetch')
      const wrapper = createWrapper([], false, error)
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="team-list"]').exists()).toBe(false)
    })
  })

  describe('Teams List Display', () => {
    it('should display teams when data is loaded', async () => {
      const wrapper = createWrapper(mockTeamsData)
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="team-list"]').exists()).toBe(true)
    })

    it('should render team cards for each team', async () => {
      const wrapper = createWrapper(mockTeamsData)
      await wrapper.vm.$nextTick()

      const teamCards = wrapper.findAll('[data-test^="team-card-"]')
      expect(teamCards).toHaveLength(mockTeamsData.length)
    })

    it('should render team card with correct team data', async () => {
      const wrapper = createWrapper(mockTeamsData)
      await wrapper.vm.$nextTick()

      const teamCard = wrapper.find(`[data-test="team-card-${mockTeamData.id}"]`)
      expect(teamCard.exists()).toBe(true)
      expect(teamCard.text()).toContain(mockTeamData.name)
    })
  })

  describe('Role filter', () => {
    const ownerTeam: Team = {
      ...mockTeamData,
      id: '10',
      name: 'Owned Co',
      ownerAddress: mockUserStore.address as Team['ownerAddress']
    }
    const employeeTeam: Team = {
      ...mockTeamData,
      id: '20',
      name: 'Employed Co',
      ownerAddress: '0x9999999999999999999999999999999999999999'
    }

    it('counts owner / employee teams relative to the signed-in user', () => {
      const wrapper = createWrapper([ownerTeam, employeeTeam])
      const roleFilter = wrapper.find('[data-test="role-filter"]')
      expect(roleFilter.find('[data-test="role-option-all"]').text()).toContain('All · 2')
      expect(roleFilter.find('[data-test="role-option-owner"]').text()).toContain('Owner · 1')
      expect(roleFilter.find('[data-test="role-option-employee"]').text()).toContain('Employee · 1')
    })

    it('filters the rendered list when a role is selected', async () => {
      const wrapper = createWrapper([ownerTeam, employeeTeam])
      expect(wrapper.findAll('[data-test^="team-card-"]')).toHaveLength(2)

      await wrapper.find('[data-test="role-option-owner"]').trigger('click')
      const cards = wrapper.findAll('[data-test^="team-card-"]')
      expect(cards).toHaveLength(1)
      expect(cards[0]?.text()).toContain('Owned Co')

      await wrapper.find('[data-test="role-option-employee"]').trigger('click')
      const empCards = wrapper.findAll('[data-test^="team-card-"]')
      expect(empCards).toHaveLength(1)
      expect(empCards[0]?.text()).toContain('Employed Co')
    })
  })

  describe('Search', () => {
    const teams: Team[] = [
      { ...mockTeamData, id: '1', name: 'Alpha', description: 'first' },
      { ...mockTeamData, id: '2', name: 'Beta', description: 'second' }
    ]

    it('filters the list by name (case-insensitive)', async () => {
      const wrapper = createWrapper(teams)
      await wrapper.find('[data-test="search-companies"]').setValue('alpha')

      const cards = wrapper.findAll('[data-test^="team-card-"]')
      expect(cards).toHaveLength(1)
      expect(cards[0]?.text()).toContain('Alpha')
    })

    it('filters the list by description', async () => {
      const wrapper = createWrapper(teams)
      await wrapper.find('[data-test="search-companies"]').setValue('second')

      const cards = wrapper.findAll('[data-test^="team-card-"]')
      expect(cards).toHaveLength(1)
      expect(cards[0]?.text()).toContain('Beta')
    })
  })

  describe('View toggle', () => {
    it('renders the cards grid by default', () => {
      const wrapper = createWrapper(mockTeamsData)
      expect(wrapper.find('[data-test="team-list"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="table-view"]').exists()).toBe(false)
    })

    it('switches to the table view and back', async () => {
      const wrapper = createWrapper(mockTeamsData)

      await wrapper.find('[data-test="view-toggle-table"]').trigger('click')
      expect(wrapper.find('[data-test="team-list"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="table-view"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="companies-table"]').exists()).toBe(true)

      await wrapper.find('[data-test="view-toggle-cards"]').trigger('click')
      expect(wrapper.find('[data-test="team-list"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="table-view"]').exists()).toBe(false)
    })

    it('renders the treasury recap when teams are loaded', () => {
      const wrapper = createWrapper(mockTeamsData)
      expect(wrapper.find('[data-test="companies-recap"]').exists()).toBe(true)
    })
  })

  describe('Filters popover', () => {
    it('exposes hidden / archived switches in the panel', () => {
      const wrapper = createWrapper(mockTeamsData)
      const panel = wrapper.find('[data-test="filters-panel"]')
      expect(panel.exists()).toBe(true)
      expect(panel.find('[data-test="toggle-show-hidden"]').exists()).toBe(true)
      expect(panel.find('[data-test="toggle-show-archived"]').exists()).toBe(true)
    })

    it('shows an active-count badge once a visibility switch is on', async () => {
      const wrapper = createWrapper(mockTeamsData)
      expect(wrapper.find('[data-test="filters-count-badge"]').exists()).toBe(false)

      // USwitch renders the data-test on its own button[role="switch"].
      await wrapper.find('[data-test="toggle-show-hidden"]').trigger('click')

      const badge = wrapper.find('[data-test="filters-count-badge"]')
      expect(badge.exists()).toBe(true)
      expect(badge.text()).toContain('1')
    })

    it('reset visibility turns both switches back off', async () => {
      const wrapper = createWrapper(mockTeamsData)
      await wrapper.find('[data-test="toggle-show-hidden"]').trigger('click')
      await wrapper.find('[data-test="toggle-show-archived"]').trigger('click')
      expect(wrapper.find('[data-test="filters-count-badge"]').text()).toContain('2')

      await wrapper.find('[data-test="reset-visibility"]').trigger('click')
      expect(wrapper.find('[data-test="filters-count-badge"]').exists()).toBe(false)
    })
  })

  describe('User Interactions', () => {
    it('should navigate to team when team card is clicked', async () => {
      const wrapper = createWrapper(mockTeamsData)
      await wrapper.vm.$nextTick()

      const teamCard = wrapper.find(`[data-test="team-card-${mockTeamData.id}"]`)
      await teamCard.trigger('click')

      expect(mockRouterPush).toHaveBeenCalledWith(`/teams/${mockTeamData.id}`)
    })

    it('should handle multiple team clicks correctly', async () => {
      const multipleTeams = [
        { ...mockTeamData, id: '1' },
        { ...mockTeamData, id: '2', name: 'Team 2' },
        { ...mockTeamData, id: '3', name: 'Team 3' }
      ]
      const wrapper = createWrapper(multipleTeams)
      await wrapper.vm.$nextTick()

      const teamCard1 = wrapper.find('[data-test="team-card-1"]')
      const teamCard2 = wrapper.find('[data-test="team-card-2"]')
      const teamCard3 = wrapper.find('[data-test="team-card-3"]')

      await teamCard1.trigger('click')
      await teamCard2.trigger('click')
      await teamCard3.trigger('click')

      expect(mockRouterPush).toHaveBeenNthCalledWith(1, '/teams/1')
      expect(mockRouterPush).toHaveBeenNthCalledWith(2, '/teams/2')
      expect(mockRouterPush).toHaveBeenNthCalledWith(3, '/teams/3')
    })
  })

  describe('Edge Cases', () => {
    it('should handle null/undefined team data gracefully', async () => {
      const wrapper = createWrapper(null, false)
      await wrapper.vm.$nextTick()
      // Should render without crashing
      expect(wrapper.exists()).toBe(true)
    })

    it('should render correctly when teams array contains single item', async () => {
      const singleTeam = [mockTeamData]
      const wrapper = createWrapper(singleTeam)
      await wrapper.vm.$nextTick()

      const teamCards = wrapper.findAll('[data-test^="team-card-"]')
      expect(teamCards).toHaveLength(1)
    })
  })
})
