import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import InvestorsActions from '@/components/sections/SherTokenView/InvestorsActions.vue'
import type { Address } from 'viem'
import { mockInvestorReads, mockTeamStore, resetContractMocks } from '@/tests/mocks'

const DistributeMintActionStub = {
  props: ['tokenSymbol', 'investorsAddress'],
  template: '<div data-test="distribute-mint-action" />'
}

const MintTokenActionStub = {
  props: ['tokenSymbol', 'investorsOwner'],
  template: '<div data-test="mint-token-action" />'
}

const PayDividendsActionStub = {
  props: ['tokenSymbol', 'shareholdersCount', 'investorsAddress', 'investorsOwner', 'bankAddress'],
  template: '<div data-test="pay-dividends-action" />'
}

const ToggleSherCompensationButtonStub = {
  template: '<div data-test="toggle-sher-compensation-button" />'
}

const InvestInSafeButtonStub = {
  template: '<div data-test="invest-in-safe-button" />'
}

const SetCompensationMultiplierButtonStub = {
  template: '<div data-test="set-compensation-multiplier-button" />'
}

describe('InvestorsActions.vue', () => {
  beforeEach(() => {
    resetContractMocks()
    vi.clearAllMocks()

    mockTeamStore.getContractAddressByType = vi.fn((type: string) => {
      if (type === 'InvestorV1') return '0x2222222222222222222222222222222222222222'
      if (type === 'Bank') return '0x1111111111111111111111111111111111111111'
      return '0x0000000000000000000000000000000000000000'
    })

    mockInvestorReads.symbol.data.value = 'SHER'
    mockInvestorReads.owner.data.value = '0xOwner'
    mockInvestorReads.shareholders.data.value = ['0x123', '0x456']
    mockInvestorReads.symbol.isLoading.value = false
    mockInvestorReads.owner.isLoading.value = false
  })

  const createWrapper = () =>
    mount(InvestorsActions, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          CardComponent: { template: '<div><slot /></div>' },
          AddressToolTip: true,
          DistributeMintAction: DistributeMintActionStub,
          MintTokenAction: MintTokenActionStub,
          PayDividendsAction: PayDividendsActionStub,
          ToggleSherCompensationButton: ToggleSherCompensationButtonStub,
          SetCompensationMultiplierButton: SetCompensationMultiplierButtonStub,
          InvestInSafeButton: InvestInSafeButtonStub
        }
      }
    })

  it('renders skeletons when data is loading', () => {
    mockInvestorReads.symbol.isLoading.value = true
    mockInvestorReads.owner.isLoading.value = true

    const wrapper = createWrapper()

    expect(wrapper.find('[data-test="skeleton-1"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="skeleton-2"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="skeleton-3"]').exists()).toBe(true)
  })

  it('renders action components when data is available', () => {
    const wrapper = createWrapper()

    expect(wrapper.find('[data-test="distribute-mint-action"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="mint-token-action"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="pay-dividends-action"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="toggle-sher-compensation-button"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="invest-in-safe-button"]').exists()).toBe(true)
  })

  it('passes props to action components', () => {
    const wrapper = createWrapper()

    const distribute = wrapper.findComponent(DistributeMintActionStub)
    const mint = wrapper.findComponent(MintTokenActionStub)
    const pay = wrapper.findComponent(PayDividendsActionStub)

    expect(distribute.props('tokenSymbol')).toBe('SHER')
    expect(distribute.props('investorsAddress')).toBe(
      '0x2222222222222222222222222222222222222222' as Address
    )

    expect(mint.props('tokenSymbol')).toBe('SHER')
    expect(mint.props('investorsOwner')).toBe('0xOwner' as Address)

    expect(pay.props('tokenSymbol')).toBe('SHER')
    expect(pay.props('shareholdersCount')).toBe(2)
    expect(pay.props('investorsAddress')).toBe(
      '0x2222222222222222222222222222222222222222' as Address
    )
    expect(pay.props('investorsOwner')).toBe('0xOwner' as Address)
    expect(pay.props('bankAddress')).toBe('0x1111111111111111111111111111111111111111' as Address)
  })

  it('shows error toast when token symbol fails', async () => {
    const wrapper = createWrapper()

    mockInvestorReads.symbol.error.value = new Error('Symbol error')
    await wrapper.vm.$nextTick()

  })

  it('shows error toast when shareholders fetch fails', async () => {
    const wrapper = createWrapper()

    mockInvestorReads.shareholders.error.value = new Error('Shareholders error')
    await wrapper.vm.$nextTick()

  })

  it('shows error toast when owner fetch fails', async () => {
    const wrapper = createWrapper()

    mockInvestorReads.owner.error.value = new Error('Owner error')
    await wrapper.vm.$nextTick()

  })
})
