import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { parseEther, type Address } from 'viem'
import AdvertisingCampaignWorkspace from '@/components/sections/ContractManagementView/AdvertisingCampaignWorkspace.vue'
import {
  useAdvertisingCampaigns,
  useCampaignEventsByCode,
  type AdvertisingCampaign
} from '@/composables/campaign/reads'

vi.mock('@/composables/campaign/reads', () => ({
  useAdvertisingCampaigns: vi.fn(),
  useCampaignEventsByCode: vi.fn()
}))
vi.mock('@/components/sections/ContractManagementView/forms/CreateAdvertisingCampaign.vue', () => ({
  default: { template: '<div data-test="create-campaign-form" />' }
}))
vi.mock(
  '@/components/sections/ContractManagementView/forms/WithdrawAdvertisingCampaign.vue',
  () => ({ default: { template: '<div data-test="withdraw-campaign-form" />' } })
)

const MANAGER = '0x1111111111111111111111111111111111111111' as Address
const campaigns = ref<AdvertisingCampaign[]>([])
const isPending = ref(false)
const isError = ref(false)

describe('AdvertisingCampaignWorkspace.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    campaigns.value = []
    isPending.value = false
    isError.value = false
    vi.mocked(useAdvertisingCampaigns).mockReturnValue({
      data: campaigns,
      isPending,
      isError,
      refetch: vi.fn()
    } as unknown as ReturnType<typeof useAdvertisingCampaigns>)
    vi.mocked(useCampaignEventsByCode).mockReturnValue({
      data: ref({}),
      refetch: vi.fn()
    } as unknown as ReturnType<typeof useCampaignEventsByCode>)
  })

  function mountComponent() {
    return mount(AdvertisingCampaignWorkspace, { props: { managerAddress: MANAGER } })
  }

  it('renders a purpose-built empty state for funded campaigns', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('[data-test="campaigns-empty"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('No funded campaigns yet')
  })

  it('renders the loading and error states independently', async () => {
    isPending.value = true
    const wrapper = mountComponent()
    expect(wrapper.find('[data-test="campaigns-loading"]').exists()).toBe(true)
    isPending.value = false
    isError.value = true
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="campaigns-error"]').exists()).toBe(true)
  })

  it('shows campaign status, funding and remaining budget', () => {
    campaigns.value = [
      {
        id: 1,
        code: 'CAMPAIGN-1',
        budget: parseEther('10'),
        amountSpent: parseEther('4'),
        remainingBudget: parseEther('6'),
        advertiser: '0x2222222222222222222222222222222222222222',
        status: 'active'
      }
    ]
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('CAMPAIGN-1')
    expect(wrapper.text()).toContain('10 POL')
    expect(wrapper.text()).toContain('6 POL')
    expect(wrapper.text()).toContain('Active')
  })
})
