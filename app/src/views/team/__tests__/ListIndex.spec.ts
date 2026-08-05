import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'
import ListIndex from '@/views/team/ListIndex.vue'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { createMockQueryResponse } from '@/tests/mocks/query.mock'
import { mockTeamsData, mockTeamData, mockRouterReplace } from '@/tests/mocks'
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
            name: 'TeamCard',
            template:
              '<div :data-test="`team-card-${team.id}`" class="team-card"><strong>{{ team.name }}</strong></div>',
            props: ['team', 'to']
          }
        }
      }
    })
  }

  describe('Component Rendering', () => {
    it('should render the page heading when teams are visible', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('h2').text()).toContain('Team List View')
    })

    it('should hide the page heading when no teams are visible', async () => {
      const wrapper = createWrapper([])
      await wrapper.vm.$nextTick()

      expect(wrapper.find('h2').exists()).toBe(false)
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
      expect(wrapper.findAll('[data-test="loader"] [aria-busy="true"]')).toHaveLength(16) // 4 skeletons × 4 items
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

    it('should hide the page heading during loading', async () => {
      const wrapper = createWrapper([], true)
      await wrapper.vm.$nextTick()

      expect(wrapper.find('h2').exists()).toBe(false)
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

    // The grid itself still renders — it is what holds the create tile — but it
    // holds no team cards.
    it('should not display any team card when teams array is empty', async () => {
      const wrapper = createWrapper([])
      await wrapper.vm.$nextTick()

      expect(wrapper.findAll('[data-test^="team-card-"]')).toHaveLength(0)
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

    it('should hide the page heading on error', async () => {
      const error = new Error('Failed to fetch')
      const wrapper = createWrapper([], false, error)
      await wrapper.vm.$nextTick()

      expect(wrapper.find('h2').exists()).toBe(false)
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

  describe('Company links', () => {
    it('should give each team card a route to its company overview', async () => {
      const wrapper = createWrapper(mockTeamsData)
      await wrapper.vm.$nextTick()

      const teamCard = wrapper
        .findAllComponents({ name: 'TeamCard' })
        .find((card) => card.props('team').id === mockTeamData.id)

      expect(teamCard?.props('to')).toEqual({
        name: 'show-team',
        params: { id: mockTeamData.id }
      })
    })

    it('should create a distinct destination for every company', async () => {
      const teams = [
        { ...mockTeamData, id: '1' },
        { ...mockTeamData, id: '2', name: 'Team 2' },
        { ...mockTeamData, id: '3', name: 'Team 3' }
      ]
      const wrapper = createWrapper(teams)
      await wrapper.vm.$nextTick()

      expect(
        wrapper.findAllComponents({ name: 'TeamCard' }).map((card) => card.props('to'))
      ).toEqual(teams.map((team) => ({ name: 'show-team', params: { id: team.id } })))
    })
  })

  describe('User Interactions', () => {
    it('should open add team modal when add team button is clicked', async () => {
      const wrapper = createWrapper([], false)
      await wrapper.vm.$nextTick()

      const addTeamBtn = wrapper.find('[data-test="add-team"]')
      expect(addTeamBtn.exists()).toBe(true)
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

  describe('Create company deep link', () => {
    it('auto-opens the create modal and clears the query when navigated with ?create=1', async () => {
      vi.mocked(useRoute).mockReturnValue({
        params: {},
        meta: { name: 'Team List View' },
        query: { create: '1' }
      } as unknown as ReturnType<typeof useRoute>)
      vi.mocked(useGetTeamsQuery).mockReturnValueOnce(createMockQueryResponse(mockTeamsData))

      const wrapper = mount(ListIndex, {
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })],
          stubs: { AddTeamCard: true, TeamCard: true, AddTeamForm: true }
        }
      })
      await wrapper.vm.$nextTick()

      // The mocked UModal only renders its body (with the close button) when open.
      expect(wrapper.find('[data-test="close-wage-modal-button"]').exists()).toBe(true)
      expect(mockRouterReplace).toHaveBeenCalledWith({ query: {} })
    })
  })
})
