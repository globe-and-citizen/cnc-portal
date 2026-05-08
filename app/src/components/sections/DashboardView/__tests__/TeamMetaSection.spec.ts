import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestingPinia } from '@pinia/testing'
import { useTeamStore } from '@/stores'
import { useUserDataStore } from '@/stores/user'
import TeamMetaSection from '../TeamMetaSection.vue'

const teamStoreState = {
  currentTeamId: '22',
  currentTeamMeta: {
    data: {
      id: '22',
      name: 'Sher Team',
      description: 'Team description for testing coverage.',
      ownerAddress: '0xOWNER',
      members: [{ name: 'Alice', description: 'dev' }],
      teamContracts: []
    }
  }
}

const mountSection = () =>
  mount(TeamMetaSection, {
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })],
      stubs: {
        TeamMetaActions: {
          name: 'TeamMetaActions',
          props: ['currentTeam', 'isOwner'],
          template: '<div data-test="team-meta-actions-stub">{{ isOwner ? "owner" : "employee" }}</div>'
        }
      }
    }
  })

describe('TeamMetaSection.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useTeamStore).mockReturnValue(teamStoreState as never)
    vi.mocked(useUserDataStore).mockReturnValue({ address: '0xOWNER' } as never)
  })

  it('renders team name, description and owner badge', () => {
    const wrapper = mountSection()
    expect(wrapper.text()).toContain('Sher Team')
    expect(wrapper.text()).toContain('Team description for testing coverage.')
    expect(wrapper.text()).toContain('Owner')
  })

  it('renders employee badge when user is not owner', () => {
    vi.mocked(useUserDataStore).mockReturnValue({ address: '0xEMP' } as never)
    const wrapper = mountSection()
    expect(wrapper.text()).toContain('Employee')
    expect(wrapper.text()).not.toContain('Owner')
  })

  it('passes currentTeam and ownership state to TeamMetaActions', () => {
    const wrapper = mountSection()
    const actions = wrapper.getComponent({ name: 'TeamMetaActions' })
    expect(actions.props('currentTeam')).toEqual(teamStoreState.currentTeamMeta.data)
    expect(actions.props('isOwner')).toBe(true)
  })
})
