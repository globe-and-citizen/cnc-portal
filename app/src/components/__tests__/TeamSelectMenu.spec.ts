import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import TeamSelectMenu from '@/components/TeamSelectMenu.vue'
import { useGetTeamsQuery } from '@/queries/team.queries'
import { mockTeamStore, mockUserStore } from '@/tests/mocks/store.mock'
import { mockTeamData } from '@/tests/mocks/index'
import { createMockQueryResponse } from '@/tests/mocks/query.mock'
import { mockRouterPush, setMockRoute } from '@/tests/mocks/router.mock'

// UPopover is globally stubbed and renders both its trigger and content slots,
// so the dropdown markup is always present in the DOM during these tests.
const mountMenu = () => mount(TeamSelectMenu)

describe('TeamSelectMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('trigger', () => {
    it('shows the active team initials and name', () => {
      // Default mock route has params.id = '1' → mockTeamData ('Test Team').
      const trigger = mountMenu().find('[data-test="team-picker"]')
      expect(trigger.text()).toContain('TT') // initials
      expect(trigger.text()).toContain('Test Team')
    })

    it('shows the "All companies" state when no team is in the route', () => {
      setMockRoute({ name: 'teams', params: {}, path: '/teams', meta: { name: 'Companies' } })
      expect(mountMenu().find('[data-test="team-picker"]').text()).toContain('All companies')
    })

    it('shows a loading spinner while teams are being fetched', () => {
      vi.mocked(useGetTeamsQuery).mockReturnValueOnce(
        createMockQueryResponse([], true) as ReturnType<typeof useGetTeamsQuery>
      )
      const wrapper = mountMenu()
      expect(wrapper.find('[data-test="team-picker"] [data-icon*="loader"]').exists()).toBe(true)
    })
  })

  describe('menu', () => {
    it('lists each team with its role badge and member count', () => {
      const option = mountMenu().find('[data-test="team-option-1"]')
      expect(option.exists()).toBe(true)
      expect(option.text()).toContain('Test Team')
      expect(option.text()).toContain('Employee') // user is not the owner
      expect(option.text()).toContain('3 members') // mockTeamData has 3 members
    })

    it('marks the team as Owner when the user owns it', () => {
      mockUserStore.address = mockTeamData.ownerAddress as string
      expect(mountMenu().find('[data-test="team-option-1"]').text()).toContain('Owner')
    })

    it('shows All companies and Create company actions', () => {
      const wrapper = mountMenu()
      expect(wrapper.find('[data-test="all-companies"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="create-company"]').exists()).toBe(true)
    })
  })

  describe('actions', () => {
    it('selects a team: sets the current team and navigates to it', async () => {
      const wrapper = mountMenu()
      await wrapper.find('[data-test="team-option-1"]').trigger('click')
      expect(mockTeamStore.setCurrentTeamId).toHaveBeenCalledWith('1')
      expect(mockRouterPush).toHaveBeenCalledWith('/teams/1')
    })

    it('navigates to the companies list from "All companies"', async () => {
      const wrapper = mountMenu()
      await wrapper.find('[data-test="all-companies"]').trigger('click')
      expect(mockRouterPush).toHaveBeenCalledWith('/teams')
    })

    it('opens the create flow from "Create company"', async () => {
      const wrapper = mountMenu()
      await wrapper.find('[data-test="create-company"]').trigger('click')
      expect(mockRouterPush).toHaveBeenCalledWith({ path: '/teams', query: { create: '1' } })
    })
  })

  describe('search', () => {
    it('filters teams by name', async () => {
      vi.mocked(useGetTeamsQuery).mockReturnValueOnce(
        createMockQueryResponse([
          { ...mockTeamData, id: '1', name: 'Alpha Team' },
          { ...mockTeamData, id: '2', name: 'Beta Squad' }
        ]) as ReturnType<typeof useGetTeamsQuery>
      )
      const wrapper = mountMenu()
      await wrapper.find('input').setValue('Beta')

      const menu = wrapper.find('[data-test="team-menu"]')
      expect(menu.text()).toContain('Beta Squad')
      expect(menu.text()).not.toContain('Alpha Team')
    })

    it('hides "All companies" and shows an empty state when nothing matches', async () => {
      const wrapper = mountMenu()
      await wrapper.find('input').setValue('zzz')
      expect(wrapper.find('[data-test="all-companies"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="team-empty"]').exists()).toBe(true)
    })
  })
})
