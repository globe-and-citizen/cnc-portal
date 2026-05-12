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
        TeamMetaUpdateModal: {
          name: 'TeamMetaUpdateModal',
          template: '<div data-test="update" />'
        },
        TeamMetaArchiveModal: {
          name: 'TeamMetaArchiveModal',
          props: ['currentTeam'],
          template: '<div data-test="archive" />'
        },
        TeamMetaVisibilityModal: {
          name: 'TeamMetaVisibilityModal',
          props: ['currentTeam'],
          template: '<div data-test="visibility" />'
        },
        TeamMetaDeleteModal: {
          name: 'TeamMetaDeleteModal',
          props: ['currentTeam'],
          template: '<div data-test="delete" />'
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

  it('passes currentTeam to archive/visibility/delete actions', () => {
    const wrapper = mountSection()
    const archive = wrapper.getComponent({ name: 'TeamMetaArchiveModal' })
    const visibility = wrapper.getComponent({ name: 'TeamMetaVisibilityModal' })
    const del = wrapper.getComponent({ name: 'TeamMetaDeleteModal' })

    expect(archive.props('currentTeam')).toEqual(teamStoreState.currentTeamMeta.data)
    expect(visibility.props('currentTeam')).toEqual(teamStoreState.currentTeamMeta.data)
    expect(del.props('currentTeam')).toEqual(teamStoreState.currentTeamMeta.data)
  })

  it('shows owner-only actions only for owner', () => {
    const ownerWrapper = mountSection()
    expect(ownerWrapper.find('[data-test="update"]').exists()).toBe(true)
    expect(ownerWrapper.find('[data-test="archive"]').exists()).toBe(true)
    expect(ownerWrapper.find('[data-test="delete"]').exists()).toBe(true)

    vi.mocked(useUserDataStore).mockReturnValue({ address: '0xEMP' } as never)
    const employeeWrapper = mountSection()
    expect(employeeWrapper.find('[data-test="update"]').exists()).toBe(false)
    expect(employeeWrapper.find('[data-test="archive"]').exists()).toBe(false)
    expect(employeeWrapper.find('[data-test="delete"]').exists()).toBe(false)
    expect(employeeWrapper.find('[data-test="visibility"]').exists()).toBe(true)
  })
})
