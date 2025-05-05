import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ContractManagementView from '@/views/team/[id]/ContractManagementView.vue'

import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import { useToastStore } from '@/stores'

vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: { id: '1' }
  })
}))

vi.mock('@/stores/user', () => ({
  useUserDataStore: () => ({
    address: '0xOwnerAddress'
  })
}))

vi.mock('@/stores/useToastStore', () => ({
  useToastStore: () => ({
    addErrorToast: vi.fn(),
    addSuccessToast: vi.fn()
  })
}))

const executeMock = vi.fn()

const teamDataMock = ref({
  id: '1',
  name: 'Test Team',
  ownerAddress: '0xOwnerAddress',
  bankAddress: '0xBankAddress',
  addCampaignAddress: null,
  teamContracts: [
    { type: 'Bank', address: '0xBankAddress' },
    { type: 'Campaign', address: '0xCampaignAddress' }
  ]
})

vi.mock('@/composables/useCustomFetch', () => {
  return {
    useCustomFetch: vi.fn(() => ({
      get: () => ({
        json: () => ({
          data: teamDataMock,
          execute: vi.fn(),
          error: ref(null),
          isFetching: ref(false)
        })
      }),
      put: () => ({
        json: () => ({
          execute: vi.fn()
        })
      })
    }))
  }
})

// Add mock for fetchTeam
vi.mock('@/composables/fetchTeam', () => ({
  fetchTeam: vi.fn(async (teamId: string) => {
    if (teamId === '1') {
      return {
        teamIsFetching: ref(false),
        teamError: ref(null),
        team: teamDataMock
      }
    } else {
      return {
        teamIsFetching: ref(false),
        teamError: ref('Team not found'),
        team: ref(null)
      }
    }
  })
}))
// Add mock for teamStore
const mockTeamStore = {
  currentTeam: teamDataMock.value,
  currentTeamMeta: { teamIsFetching: false, team: teamDataMock.value },
  fetchTeam: vi.fn()
}

vi.mock('@/stores', () => ({
  useTeamStore: vi.fn(() => mockTeamStore),
  useToastStore: vi.fn(() => ({
    addErrorToast: vi.fn(),
    addSuccessToast: vi.fn()
  }))
}))

vi.mock('@/composables/addCampaign', () => {
  return {
    useDeployAddCampaignContract: () => ({
      contractAddress: ref('0xDeployedCampaignAddress'),
      execute: executeMock,
      isLoading: ref(false)
    })
  }
})

describe('ContractManagementView.vue', () => {
  const createComponent = () =>
    mount(ContractManagementView, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          CardComponent: {
            template: '<div><slot /></div>'
          },
          TeamMeta: {
            template: '<div><slot /></div>'
          },
          CreateAddCampaign: {
            template: '<div><slot /></div>',
            props: ['bankAddress']
          },
          TeamContracts: {
            template: '<div><slot /></div>'
          },
          ModalComponent: {
            template: '<div><slot /></div>',
            props: ['modelValue']
          }
        }
      }
    })

  beforeEach(() => {
    executeMock.mockClear()
    mockTeamStore.currentTeam = teamDataMock.value
    mockTeamStore.currentTeamMeta = { teamIsFetching: false, team: teamDataMock.value }
    vi.mocked(useToastStore).mockClear()
  })

  it('renders the deploy button if user is team owner and no campaign exists', async () => {
    const wrapper = createComponent()
    await wrapper.vm.$nextTick()
    const button = wrapper.find('[data-test="createAddCampaign"]')
    expect(button.exists()).toBe(true)
    expect(button.text()).toContain('Deploy advertise contract')
  })

  it('renders team data correctly from teamStore', async () => {
    const wrapper = createComponent()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Deploy advertise contract')
  })

  it('does not render deploy button if user is not the team owner', async () => {
    mockTeamStore.currentTeam.ownerAddress = '0xAnotherAddress'

    const wrapper = createComponent()
    await wrapper.vm.$nextTick()

    const button = wrapper.find('[data-test="createAddCampaign"]')
    expect(button.exists()).toBe(false)
  })

  it('shows loading spinner when team is fetching', async () => {
    mockTeamStore.currentTeamMeta.teamIsFetching = true
    const wrapper = createComponent()
    await wrapper.vm.$nextTick()

    const spinner = wrapper.find('.loading-spinner')
    expect(spinner.exists()).toBe(true)
  })
})
