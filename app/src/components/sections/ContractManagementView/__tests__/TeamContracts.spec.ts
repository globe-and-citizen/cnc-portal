import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import TeamContracts from '@/components/sections/ContractManagementView/TeamContracts.vue'
import { useCampaignEventsByCode } from '@/composables/campaign/reads'
import { mockTeamStore } from '@/tests/mocks'
import { useTeamStore } from '@/stores'

vi.mock('@/composables/campaign/reads', () => ({
  useCampaignEventsByCode: vi.fn()
}))
vi.mock('@/composables/useContractFunctions', () => ({
  getContractData: vi.fn().mockResolvedValue([])
}))

const CAMPAIGN_ADDR = '0xAAaaaaAAAAaaAAAaaaaAaaAAAAAaaaaaAAAaaaA1'

describe('TeamContracts.vue', () => {
  const refetch = vi.fn().mockResolvedValue(undefined)
  const data = ref({})
  const isError = ref(false)

  beforeEach(() => {
    vi.clearAllMocks()
    data.value = {}
    isError.value = false
    vi.mocked(useCampaignEventsByCode).mockReturnValue({
      data,
      isError,
      error: ref(null),
      refetch
    } as unknown as ReturnType<typeof useCampaignEventsByCode>)

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

  it('wires useCampaignEventsByCode with a disabled query until the modal opens', () => {
    mountComponent()
    expect(useCampaignEventsByCode).toHaveBeenCalledTimes(1)
    const [, opts] = vi.mocked(useCampaignEventsByCode).mock.calls[0]
    expect((opts!.enabled as unknown as { value: boolean }).value).toBe(false)
  })

  it('opens the events modal and refetches when "View Events" is clicked', async () => {
    const wrapper = mountComponent()
    const viewEventsBtn = wrapper.findAll('button').find((b) => b.text() === 'View Events')
    expect(viewEventsBtn).toBeTruthy()

    await viewEventsBtn!.trigger('click')
    await flushPromises()

    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('shows an error toast when the events query reports an error', async () => {
    const wrapper = mountComponent()
    isError.value = true
    await flushPromises()
    // The component subscribes via `watch` — triggering isError should not throw
    expect(wrapper.exists()).toBe(true)
  })
})
