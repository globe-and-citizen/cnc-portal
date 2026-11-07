import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { computed, ref, toValue } from 'vue'
import { useChainId } from '@wagmi/vue'
import { useContractWritesV3 } from '@/composables/contracts/useContractWritesV3'
import { createContractWriteV3Mock } from '@/tests/mocks/erc20.mock'
import { USelectStub } from '@/tests/stubs/nuxt-ui.stubs'
import type { CampaignManagerSettings } from '@/composables/campaign/reads'
import CampaignManagersSection from '@/components/sections/ContractManagementView/CampaignManagersSection.vue'
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
const OTHER_MANAGER = '0x0000000000000000000000000000000000000002'
const settings = ref<CampaignManagerSettings | undefined>()
const pending = ref(false)
const click = createContractWriteV3Mock()
const impression = createContractWriteV3Mock()
vi.mock('@/composables/contracts/useContractWritesV3', () => ({
  useContractWritesV3: vi.fn(({ functionName }: { functionName: string }) =>
    functionName === 'setCostPerClick' ? click : impression
  )
}))
const initialSettings: CampaignManagerSettings = {
  costPerClick: '0.1',
  costPerImpression: '0.01',
  bankAddress: '0x1111111111111111111111111111111111111111'
}

describe('CampaignManagersSection.vue', () => {
  const settingsEnabled = ref(false)

  beforeEach(() => {
    vi.clearAllMocks()
    settings.value = { ...initialSettings }
    pending.value = false
    click.mutate.mockReset()
    impression.mutate.mockReset()
    click.error.value = impression.error.value = null
    click.isPending.value = impression.isPending.value = false
    vi.mocked(useChainId)().value = 1
    vi.mocked(useCampaignManagerSettings).mockImplementation((_address, options) => {
      settingsEnabled.value = (options?.enabled as { value: boolean }).value
      return {
        data: settings,
        isPending: pending,
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
    return mount(CampaignManagersSection, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          Select: USelectStub,
          UModal: { template: '<div />' },
          Slideover: {
            props: ['open'],
            emits: ['update:open'],
            template:
              '<div v-if="open"><button data-test="close-settings" @click="$emit(\'update:open\', false)">Close</button><slot name="body" /></div>'
          }
        }
      }
    })
  }

  it('[AC-US-CONTRACT-003-01] identifies the configured Campaign Manager separately', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('Campaign Manager')
    expect(wrapper.find('[data-test="campaign-workspace"]').text()).toContain(CAMPAIGN_ADDR)
  })

  it('[AC-US-CONTRACT-003-05] shows manager setup when no Campaign Manager exists', () => {
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

  it('waits for loaded settings before constructing the draft', async () => {
    settings.value = undefined
    pending.value = true
    const wrapper = mountComponent()
    await wrapper.get('[data-test="campaign-manager-settings"]').trigger('click')
    expect(wrapper.find('[data-test="manager-cost-per-click"]').exists()).toBe(false)
    settings.value = { ...initialSettings }
    pending.value = false
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[data-test="manager-cost-per-click"]').element).toHaveProperty(
      'value',
      '0.1'
    )
    expect(wrapper.get('[data-test="campaign-rate-save"]').attributes('disabled')).toBeDefined()
  })

  it('discards edits on close and uses the newest loaded settings on reopening', async () => {
    const wrapper = mountComponent()
    await wrapper.get('[data-test="campaign-manager-settings"]').trigger('click')
    await wrapper.get('[data-test="manager-cost-per-click"]').setValue('0.2')
    expect(settings.value).toEqual(initialSettings)
    await wrapper.get('[data-test="close-settings"]').trigger('click')
    expect(wrapper.find('[data-test="manager-cost-per-click"]').exists()).toBe(false)
    settings.value = { ...initialSettings, costPerClick: '0.3' }
    await wrapper.get('[data-test="campaign-manager-settings"]').trigger('click')
    expect(wrapper.get('[data-test="manager-cost-per-click"]').element).toHaveProperty(
      'value',
      '0.3'
    )
    expect(wrapper.get('[data-test="campaign-rate-save"]').attributes('disabled')).toBeDefined()
  })

  it('adopts the fresh query result after reopening on a cached settings result', async () => {
    const wrapper = mountComponent()
    await wrapper.get('[data-test="campaign-manager-settings"]').trigger('click')
    await wrapper.get('[data-test="close-settings"]').trigger('click')
    await wrapper.get('[data-test="campaign-manager-settings"]').trigger('click')
    settings.value = { ...initialSettings, costPerClick: '0.9' }
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[data-test="manager-cost-per-click"]').element).toHaveProperty(
      'value',
      '0.9'
    )
    expect(wrapper.get('[data-test="campaign-rate-save"]').attributes('disabled')).toBeDefined()
  })

  it('recreates the draft for another manager and keeps its write target', async () => {
    const store = vi.mocked(useTeamStore)()
    store.currentTeam!.teamContracts.push({
      address: OTHER_MANAGER,
      type: 'Campaign',
      deployer: OTHER_MANAGER,
      admins: []
    })
    const wrapper = mountComponent()
    await wrapper.get('[data-test="campaign-manager-settings"]').trigger('click')
    await wrapper.get('[data-test="manager-cost-per-click"]').setValue('0.2')
    pending.value = true
    settings.value = undefined
    await wrapper.get('[data-test="campaign-manager-select"]').setValue(OTHER_MANAGER)
    expect(wrapper.find('[data-test="manager-cost-per-click"]').exists()).toBe(false)
    settings.value = { ...initialSettings, costPerClick: '0.4' }
    pending.value = false
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[data-test="manager-cost-per-click"]').element).toHaveProperty(
      'value',
      '0.4'
    )
    expect(wrapper.getComponent({ name: 'CampaignManagerRatesForm' }).props('managerAddress')).toBe(
      OTHER_MANAGER
    )
    await wrapper.get('[data-test="manager-cost-per-click"]').setValue('0.6')
    await wrapper.get('[data-test="campaign-rate-save"]').trigger('click')
    expect(click.mutate).toHaveBeenCalledWith({ args: [600000000000000000n] }, expect.anything())
    expect(impression.mutate).not.toHaveBeenCalled()
    const write = vi.mocked(useContractWritesV3).mock.calls.at(-2)![0]
    expect(write.functionName).toBe('setCostPerClick')
    expect(toValue(write.contractAddress)).toBe(OTHER_MANAGER)
  })

  it('discards a draft when the active chain changes at the same address', async () => {
    const wrapper = mountComponent()
    await wrapper.get('[data-test="campaign-manager-settings"]').trigger('click')
    await wrapper.get('[data-test="manager-cost-per-click"]').setValue('0.2')
    settings.value = { ...initialSettings, costPerClick: '0.8' }
    vi.mocked(useChainId)().value = 2
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[data-test="manager-cost-per-click"]').element).toHaveProperty(
      'value',
      '0.8'
    )
    expect(wrapper.get('[data-test="campaign-rate-save"]').attributes('disabled')).toBeDefined()
  })
})
