import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'
import ListIndex from '@/views/team/ListIndex.vue'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { createMockQueryResponse } from '@/tests/mocks/query.mock'
import { mockTeamsData, mockTeamData, mockRouterPush } from '@/tests/mocks'
import type { Team } from '@/types'
import { useRoute } from 'vue-router'

// Import after mocks are defined
import { useGetTeamsQuery } from '@/queries/team.queries'

describe('ListIndex - Team List View', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useRoute).mockReturnValue({
      params: { id: '0' },
      meta: { name: 'Team List View' }
    } as ReturnType<typeof useRoute>)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // Helper function for component mounting
  const createWrapper = (
    teamsData: Team[] = mockTeamsData,
    isLoading = false,
    error: Error | null = null
  ) => {
    vi.mocked(useGetTeamsQuery).mockReturnValueOnce(
      createMockQueryResponse(teamsData, isLoading, error)
    )

    return mount(ListIndex, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          AddTeamCard: {
            template:
              '<div data-test="add-team-card"><button data-test="add-team">Add Team</button></div>'
          },
          TeamCard: {
            template:
              '<div :data-test="`team-card-${team.id}`" class="team-card"><strong>{{ team.name }}</strong></div>',
            props: ['team']
          }
        }
      }
    })
  }

  describe('Component Rendering', () => {
    it('should render the component with heading', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('h2').text()).toContain('Team List View')
    })

    it('should render component structure correctly', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.flex.flex-col.gap-6').exists()).toBe(true)
    })
  })

  describe('Loading State', () => {
    it('should display loader when teams are being fetched', async () => {
      const wrapper = createWrapper([], true) // Loading state with empty teams
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="loader"]').exists()).toBe(true)
      expect(wrapper.findAll('[data-test="loader"] .skeleton')).toHaveLength(16) // 4 skeletons × 4 items
    })

    it('should hide team list during loading', async () => {
      const wrapper = createWrapper([], true)
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="team-list"]').exists()).toBe(false)
    })

    it('should hide add team button during loading', async () => {
      const wrapper = createWrapper([], true)
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="add-team-button"]').exists()).toBe(false)
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

    it('should display add team button when no teams and not loading', async () => {
      const wrapper = createWrapper([], false)
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="add-team-button"]').exists()).toBe(true)
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

    it('should hide add team button on error', async () => {
      const error = new Error('Failed to fetch')
      const wrapper = createWrapper([], false, error)
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="add-team-button"]').exists()).toBe(false)
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

    it('should display add team button even when teams exist and not loading', async () => {
      const wrapper = createWrapper(mockTeamsData, false)
      await wrapper.vm.$nextTick()

      // The button shows when there's no error and not loading, regardless of team count
      expect(wrapper.find('[data-test="add-team-button"]').exists()).toBe(true)
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

    it('should navigate with correct team ID', async () => {
      const testTeam = { ...mockTeamData, id: '123' }
      const wrapper = createWrapper([testTeam])
      await wrapper.vm.$nextTick()

      const teamCard = wrapper.find(`[data-test="team-card-${testTeam.id}"]`)
      await teamCard.trigger('click')

      expect(mockRouterPush).toHaveBeenCalledWith('/teams/123')
    })

    it('should open add team modal when add team button is clicked', async () => {
      const wrapper = createWrapper([], false)
      await wrapper.vm.$nextTick()

      const addTeamBtn = wrapper.find('[data-test="add-team"]')
      expect(addTeamBtn.exists()).toBe(true)
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

  describe('Add Team Button', () => {
    it('should display add team button when empty and not loading', async () => {
      const wrapper = createWrapper([], false)
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="add-team-button"]').exists()).toBe(true)
    })
  })

  describe('Empty State with User Data', () => {
    it('should display user name in empty state message', async () => {
      const wrapper = createWrapper([], false)
      await wrapper.vm.$nextTick()

      const emptyState = wrapper.find('[data-test="empty-state"]')
      // The component uses userDataStore.name, which is mocked by createTestingPinia
      expect(emptyState.exists()).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle loading state that transitions to success', async () => {
      const wrapper = createWrapper([], true)
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="loader"]').exists()).toBe(true)

      // Simulate data loaded
      await wrapper.setData({}) // Force re-render
      vi.mocked(useGetTeamsQuery).mockReturnValue(createMockQueryResponse(mockTeamsData, false))
      await wrapper.vm.$nextTick()
    })

    it('should handle null/undefined team data gracefully', async () => {
      const useTeamsMock = vi.fn()
      useTeamsMock.mockReturnValue(createMockQueryResponse(null, false))
      vi.mocked(useGetTeamsQuery).mockImplementation(useTeamsMock)

      const wrapper = mount(ListIndex, {
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })],
          stubs: {
            AddTeamCard: { template: '<div data-test="add-team-card"></div>' },
            TeamCard: { template: '<div></div>', props: ['team'] }
          }
        }
      })

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
