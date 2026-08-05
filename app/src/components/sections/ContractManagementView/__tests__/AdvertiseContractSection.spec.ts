import { describe, it, expect, vi, beforeEach } from 'vitest'
import AdvertiseContractSection from '@/components/sections/ContractManagementView/AdvertiseContractSection.vue'
import { useTeamStore } from '@/stores'
import { mockTeamStore, renderWithProviders } from '@/tests/mocks'

vi.mock('@/components/sections/ContractManagementView/TeamContracts.vue', () => ({
  default: { template: '<div data-test="team-contracts-stub" />' }
}))

vi.mock('@/components/sections/ContractManagementView/forms/CreateAddCampaign.vue', () => ({
  default: { template: '<div data-test="create-add-campaign-stub" />' }
}))

const mountSection = () => renderWithProviders(AdvertiseContractSection)

describe('AdvertiseContractSection.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the loader while team meta is pending', () => {
    vi.mocked(useTeamStore).mockReturnValue({
      ...mockTeamStore,
      currentTeamMeta: { isPending: true, data: undefined }
    } as unknown as ReturnType<typeof useTeamStore>)

    const wrapper = mountSection()
    expect(wrapper.find('[data-icon="i-lucide-loader-circle"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="createAddCampaign"]').exists()).toBe(false)
  })

  it('renders the deploy card once team meta has resolved', () => {
    vi.mocked(useTeamStore).mockReturnValue({
      ...mockTeamStore,
      currentTeamMeta: { isPending: false, data: mockTeamStore.currentTeam }
    } as unknown as ReturnType<typeof useTeamStore>)

    const wrapper = mountSection()
    expect(wrapper.find('[data-icon="i-lucide-loader-circle"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="createAddCampaign"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Advertising campaigns')
  })

  it('hides manager setup once a Campaign Manager exists', () => {
    vi.mocked(useTeamStore).mockReturnValue({
      ...mockTeamStore,
      currentTeamMeta: { isPending: false, data: mockTeamStore.currentTeam },
      currentTeam: {
        ...mockTeamStore.currentTeam,
        teamContracts: [
          {
            address: '0xAAaaaaAAAAaaAAAaaaaAaaAAAAAaaaaaAAAaaaA1',
            admins: [],
            type: 'Campaign',
            deployer: '0xDeployerAddress'
          }
        ]
      }
    } as unknown as ReturnType<typeof useTeamStore>)
    const wrapper = mountSection()
    expect(wrapper.find('[data-test="createAddCampaign"]').exists()).toBe(false)
  })
})
