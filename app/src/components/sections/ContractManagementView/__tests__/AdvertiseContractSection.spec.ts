import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import AdvertiseContractSection from '@/components/sections/ContractManagementView/AdvertiseContractSection.vue'
import { useTeamStore } from '@/stores'
import { mockTeamStore } from '@/tests/mocks'

vi.mock('@/components/sections/ContractManagementView/TeamContracts.vue', () => ({
  default: { template: '<div data-test="team-contracts-stub" />' }
}))

vi.mock('@/components/sections/ContractManagementView/forms/CreateAddCampaign.vue', () => ({
  default: { template: '<div data-test="create-add-campaign-stub" />' }
}))

const mountSection = () =>
  mount(AdvertiseContractSection, {
    global: { plugins: [createTestingPinia({ createSpy: vi.fn })] }
  })

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
  })
})
