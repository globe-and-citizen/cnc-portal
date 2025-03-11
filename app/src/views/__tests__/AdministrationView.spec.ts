import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import AdministrationView from '../team/[id]/AdministrationView.vue'
import TabNavigation from '@/components/TabNavigation.vue'
import ProposalSection from '@/components/sections/SingleTeamView/ProposalSection.vue'
import BoardOfDirectorsSection from '@/components/sections/SingleTeamView/BoardOfDirectorsSection.vue'
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
          TabNavigation: true,
          ProposalSection: true,
          BoardOfDirectorsSection: true
        },
        components: {
          TabNavigation,
          ProposalSection,
          BoardOfDirectorsSection
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
})
