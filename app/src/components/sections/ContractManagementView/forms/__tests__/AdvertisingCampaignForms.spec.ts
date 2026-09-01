import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import { parseEther, type Address } from 'viem'
import CreateAdvertisingCampaign from '@/components/sections/ContractManagementView/forms/CreateAdvertisingCampaign.vue'
import WithdrawAdvertisingCampaign from '@/components/sections/ContractManagementView/forms/WithdrawAdvertisingCampaign.vue'
import {
  useCreateAdvertisingCampaign,
  useWithdrawAdvertisingCampaign
} from '@/composables/campaign/writes'

vi.mock('@/composables/campaign/writes', () => ({
  useCreateAdvertisingCampaign: vi.fn(),
  useWithdrawAdvertisingCampaign: vi.fn()
}))

const MANAGER = '0x1111111111111111111111111111111111111111' as Address
const ADVERTISER = '0x2222222222222222222222222222222222222222' as Address
const createMutate = vi.fn()
const withdrawMutate = vi.fn()

describe('advertising campaign transaction forms', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useCreateAdvertisingCampaign).mockReturnValue({
      mutate: createMutate,
      isPending: ref(false),
      error: ref(null)
    } as unknown as ReturnType<typeof useCreateAdvertisingCampaign>)
    vi.mocked(useWithdrawAdvertisingCampaign).mockReturnValue({
      mutate: withdrawMutate,
      isPending: ref(false),
      error: ref(null)
    } as unknown as ReturnType<typeof useWithdrawAdvertisingCampaign>)
  })

  it('explains funding and submits the wallet value for a new campaign', async () => {
    const wrapper = mount(CreateAdvertisingCampaign, { props: { managerAddress: MANAGER } })
    expect(wrapper.text()).toContain('Your wallet funds this campaign')
    const state = wrapper.getCurrentComponent().setupState.state as { budget: string }
    state.budget = '2.5'
    await wrapper.vm.$nextTick()
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(createMutate).toHaveBeenCalledWith(
      { value: parseEther('2.5') },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
  })

  it('previews the advertiser return and submits the final reported spend', async () => {
    const campaign = {
      id: 1,
      code: 'CAMPAIGN-1',
      budget: parseEther('10'),
      amountSpent: parseEther('4'),
      remainingBudget: parseEther('6'),
      advertiser: ADVERTISER,
      status: 'active' as const
    }
    const wrapper = mount(WithdrawAdvertisingCampaign, {
      props: { managerAddress: MANAGER, campaign }
    })
    expect(wrapper.text()).toContain('This closes the campaign')
    expect(wrapper.text()).toContain('6 POL')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(withdrawMutate).toHaveBeenCalledWith(
      { args: ['CAMPAIGN-1', parseEther('4')] },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
  })
})
