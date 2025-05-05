import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import AdministrationView from '../team/[id]/AdministrationView.vue'
import TabNavigation from '@/components/TabNavigation.vue'

import { SingleTeamTabs } from '@/types'

const mockTeam = {
  id: '1',
  name: 'Test Team'
}
describe('AdministrationView', () => {
  beforeEach(() => {
    vi.mock('@/stores/teamStore', async (importOriginal) => {
      const actual: object = await importOriginal()
      return {
        ...actual,
        useTeamStore: vi.fn(() => ({
          currentTeam: mockTeam
        }))
      }
    })
  })

  function createWrapper(initialState = {}) {
    return mount(AdministrationView, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              team: {
                currentTeam: mockTeam,
                ...initialState
              }
            }
          })
        ],
        stubs: {
          ProposalSection: true,
          BoardOfDirectorsSection: true
        },
        components: {
          TabNavigation
        }
      }
    })
  }

  it('renders properly with team data', () => {
    const wrapper = createWrapper()
    expect(wrapper.findComponent({ name: 'TabNavigation' }).exists()).toBe(true)
  })

  it('displays correct tabs', () => {
    const wrapper = createWrapper()
    const tabNav = wrapper.findComponent({ name: 'TabNavigation' })
    expect(tabNav.props('tabs')).toEqual([
      SingleTeamTabs.Proposals,
      SingleTeamTabs.BoardOfDirectors
    ])
  })
  it('displays the proposal tab by default', () => {
    const wrapper = createWrapper()
    expect(wrapper.findComponent({ name: 'ProposalSection' }).exists()).toBe(true)
  })
  it('displays the board of directors tab', async () => {
    interface IWrapper {
      activeTab: number
    }
    const wrapper = createWrapper()
    ;(wrapper.vm as unknown as IWrapper).activeTab = 1
    await wrapper.vm.$nextTick()
    expect(wrapper.findComponent({ name: 'BoardOfDirectorsSection' }).exists()).toBe(true)
  })
})
