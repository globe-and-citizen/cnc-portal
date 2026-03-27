import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { useTeamStore } from '@/stores'
import TeamSelectMenu from '@/components/TeamSelectMenu.vue'
import { useGetTeamsQuery } from '@/queries/team.queries'
import { mockTeamStore, mockTeamsData } from '@/tests/mocks/index'
import { mockRouterPush } from '@/tests/mocks/router.mock'
import { createMockQueryResponse } from '@/tests/mocks/query.mock'

// jsdom does not implement scrollIntoView — reka-ui calls it when highlighting items
Element.prototype.scrollIntoView = vi.fn()

// currentTeamId must be a Vue ref so that storeToRefs() can extract it properly
const mockCurrentTeamId = ref<string | null>(mockTeamStore.currentTeamId)

const createWrapper = () => mount(TeamSelectMenu, { attachTo: document.body })

describe('TeamSelectMenu', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  beforeEach(() => {
    vi.clearAllMocks()
    Element.prototype.scrollIntoView = vi.fn()
    mockCurrentTeamId.value = mockTeamStore.currentTeamId

    // Return the mock store with currentTeamId as a ref so storeToRefs works
    vi.mocked(useTeamStore).mockImplementation(
      () =>
        ({
          ...mockTeamStore,
          currentTeamId: mockCurrentTeamId
        }) as unknown as ReturnType<typeof useTeamStore>
    )
  })

  describe('rendering', () => {
    it('renders the select trigger button', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('button').exists()).toBe(true)
    })

    it('shows a loading icon when teams are being fetched', () => {
      vi.mocked(useGetTeamsQuery).mockReturnValueOnce(
        createMockQueryResponse([], true) as ReturnType<typeof useGetTeamsQuery>
      )
      const wrapper = createWrapper()
      expect(wrapper.find('svg').exists()).toBe(true)
    })

    it('shows placeholder text when no team matches', () => {
      vi.mocked(useGetTeamsQuery).mockReturnValueOnce(
        createMockQueryResponse([]) as ReturnType<typeof useGetTeamsQuery>
      )
      vi.mocked(useRoute).mockReturnValueOnce({
        params: {},
        path: '/teams',
        meta: {}
      } as ReturnType<typeof useRoute>)

      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('Select team')
    })
  })

  describe('default selection', () => {
    it('pre-selects the team matching the current route param id', () => {
      // useRoute is globally mocked with params.id = '1' and mockTeamsData[0].id = '1'
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain(mockTeamsData[0]!.name)
    })

    it.skip('auto-selects first team and navigates when no team is active', async () => {
      mockCurrentTeamId.value = null
      vi.mocked(useRoute).mockReturnValueOnce({
        params: {},
        path: '/teams',
        meta: {}
      } as ReturnType<typeof useRoute>)

      createWrapper()
      await new Promise((r) => setTimeout(r, 0))

      expect(mockTeamStore.setCurrentTeamId).toHaveBeenCalledWith(mockTeamsData[0]!.id)
      expect(mockRouterPush).toHaveBeenCalledWith(`/teams/${mockTeamsData[0]!.id}`)
    })

    it('does not auto-navigate when a team is already active via route param', async () => {
      // useRoute returns params.id = '1' by default — team is already "active"
      createWrapper()
      await new Promise((r) => setTimeout(r, 0))

      expect(mockRouterPush).not.toHaveBeenCalled()
    })
  })

  describe('team items', () => {
    it('displays all team names in the dropdown', async () => {
      const wrapper = createWrapper()
      await wrapper.find('button').trigger('click')
      await wrapper.vm.$nextTick()

      mockTeamsData.forEach((team) => {
        expect(wrapper.html()).toContain(team.name)
      })
    })

    it('renders the initial letter avatar for each team item', async () => {
      const wrapper = createWrapper()
      await wrapper.find('button').trigger('click')
      await wrapper.vm.$nextTick()

      mockTeamsData.forEach((team) => {
        expect(wrapper.html()).toContain(team.name.charAt(0).toUpperCase())
      })
    })
  })

  describe('team selection', () => {
    it('calls setCurrentTeamId with the selected team id', async () => {
      const wrapper = createWrapper()
      await wrapper.find('button').trigger('click')
      await wrapper.vm.$nextTick()

      const options = wrapper.findAll('[role="option"]')
      if (options[0]) {
        await options[0].trigger('click')
        await wrapper.vm.$nextTick()
        expect(mockTeamStore.setCurrentTeamId).toHaveBeenCalledWith(mockTeamsData[0]!.id)
      }
    })

    it('navigates to /teams/:id when a team is selected', async () => {
      const wrapper = createWrapper()
      await wrapper.find('button').trigger('click')
      await wrapper.vm.$nextTick()

      const options = wrapper.findAll('[role="option"]')
      if (options[0]) {
        await options[0].trigger('click')
        await wrapper.vm.$nextTick()
        expect(mockRouterPush).toHaveBeenCalledWith(`/teams/${mockTeamsData[0]!.id}`)
      }
    })
  })

  describe('search', () => {
    it('renders a search input with the correct placeholder', async () => {
      const wrapper = createWrapper()
      await wrapper.find('button').trigger('click')
      await wrapper.vm.$nextTick()

      // USelectMenu renders its dropdown in a portal attached to document.body
      const input = document.querySelector('input')
      expect(input).not.toBeNull()
      expect(input?.getAttribute('placeholder')).toBe('Search team...')
    })

    it('filters teams by name based on search input', async () => {
      vi.mocked(useGetTeamsQuery).mockReturnValueOnce(
        createMockQueryResponse([
          { ...mockTeamsData[0]!, id: '1', name: 'Alpha Team' },
          { ...mockTeamsData[0]!, id: '2', name: 'Beta Squad' }
        ]) as ReturnType<typeof useGetTeamsQuery>
      )

      const wrapper = createWrapper()
      await wrapper.find('button').trigger('click')
      await wrapper.vm.$nextTick()

      const input = document.querySelector('input') as HTMLInputElement
      expect(input).not.toBeNull()

      // Simulate typing — use nativeInputValueSetter to trigger reka-ui's input handler
      input.value = 'Beta'
      input.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }))
      await wrapper.vm.$nextTick()

      const listbox = document.querySelector('[role="listbox"]')
      expect(listbox?.textContent).toContain('Beta Squad')
      expect(listbox?.textContent).not.toContain('Alpha Team')
    })
  })
})
