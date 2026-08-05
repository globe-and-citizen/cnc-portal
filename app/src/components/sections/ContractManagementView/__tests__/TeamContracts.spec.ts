import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { computed, ref } from 'vue'
import TeamContracts from '@/components/sections/ContractManagementView/TeamContracts.vue'
import { useCampaignManagerSettings } from '@/composables/campaign/reads'
import { mockTeamStore } from '@/tests/mocks'
import { useTeamStore } from '@/stores'

vi.mock('@/composables/campaign/reads', () => ({
  useCampaignManagerSettings: vi.fn()
}))
vi.mock('@/components/sections/ContractManagementView/AdvertisingCampaignWorkspace.vue', () => ({
  default: {
    props: ['managerAddress'],
    template: '<div data-test="campaign-workspace">{{ managerAddress }}</div>'
  }
}))

const CAMPAIGN_ADDR = '0xAAaaaaAAAAaaAAAaaaaAaaAAAAAaaaaaAAAaaaA1'

describe('TeamContracts.vue', () => {
  const settingsEnabled = ref(false)

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useCampaignManagerSettings).mockImplementation((_address, options) => {
      settingsEnabled.value = (options?.enabled as { value: boolean }).value
      return {
        data: ref({
          costPerClick: '0.1',
          costPerImpression: '0.01',
          bankAddress: '0x1111111111111111111111111111111111111111'
        }),
        isPending: ref(false),
        isError: ref(false),
        refetch: vi.fn()
      } as unknown as ReturnType<typeof useCampaignManagerSettings>
    })
    vi.mocked(useTeamStore).mockReturnValue({
      ...mockTeamStore,
      currentTeam: {
        ...mockTeamStore.currentTeam,
        teamContracts: [
          {
            address: CAMPAIGN_ADDR,
            admins: ['0xAdminAddress'],
            type: 'Campaign',
            deployer: '0xDeployerAddress'
          }
        ]
      }
    } as ReturnType<typeof useTeamStore>)
  })

  function mountComponent() {
    return mount(TeamContracts, {
      global: { plugins: [createTestingPinia({ createSpy: vi.fn })] }
    })
  }

  it('separates the Campaign Manager from the funded campaign workspace', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('Campaign Manager')
    expect(wrapper.find('[data-test="campaign-workspace"]').text()).toContain(CAMPAIGN_ADDR)
  })

  it('shows the manager setup state when no Campaign Manager exists', () => {
    vi.mocked(useTeamStore).mockReturnValue({
      ...mockTeamStore,
      currentTeam: { ...mockTeamStore.currentTeam, teamContracts: [] }
    } as ReturnType<typeof useTeamStore>)
    const wrapper = mountComponent()
    expect(wrapper.find('[data-test="campaign-manager-empty"]').exists()).toBe(true)
  })

  it('keeps manager settings reads disabled until the settings panel opens', async () => {
    const wrapper = mountComponent()
    const enabled = vi.mocked(useCampaignManagerSettings).mock.calls[0]![1]!.enabled as ReturnType<
      typeof computed<boolean>
    >
    expect(enabled.value).toBe(false)
    const settingsButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Manager settings'))
    expect(settingsButton).toBeDefined()
    await settingsButton!.trigger('click')
    expect(enabled.value).toBe(true)
  })
})
