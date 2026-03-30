import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import BankBalanceSection from '../BankBalanceSection.vue'
import type { Address } from 'viem'
import { defineComponent } from 'vue'
import { mockUseContractBalance } from '@/tests/mocks'

vi.mock('@/composables/useContractBalance', () => ({
  useContractBalance: vi.fn(() => mockUseContractBalance)
}))

// Mock @iconify/vue FIRST, before any other imports
vi.mock('@iconify/vue', () => ({
  Icon: {
    name: 'Icon',
    template: '<span></span>',
    props: ['icon']
  }
}))

const baseTotal = {
  USD: {
    value: 50500,
    formated: '$50.5K',
    id: 'usd',
    code: 'USD',
    symbol: '$',
    price: 1000,
    formatedPrice: '$1K'
  }
}

describe('BankBalanceSection', () => {
  const defaultProps = {
    bankAddress: '0x1234567890123456789012345678901234567890' as Address
  }

  const createWrapper = () =>
    mount(BankBalanceSection, {
      props: defaultProps,
      global: {
        stubs: {
          DepositModal: defineComponent({ name: 'DepositModal', template: '<div />' }),
          TransferModal: defineComponent({ name: 'TransferModal', template: '<div />' }),
          AddressToolTip: defineComponent({ props: ['address'], template: '<div />' })
        }
      }
    })

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseContractBalance.total.value = {
      USD: { ...baseTotal.USD }
    }
    mockUseContractBalance.isLoading.value = false
  })

  it('renders total balance', () => {
    const wrapper = createWrapper()

    expect(wrapper.text()).toContain(mockUseContractBalance.total.value.USD.formated)
    expect(wrapper.text()).toContain('USD')
  })

  it('shows loading spinner while balance is loading', () => {
    mockUseContractBalance.isLoading.value = true
    const wrapper = createWrapper()

    expect(wrapper.find('[data-test="loading-spinner"]').exists()).toBe(true)
  })

  it('renders contract actions when bank address is provided', () => {
    const wrapper = createWrapper()

    expect(wrapper.findComponent({ name: 'DepositModal' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'TransferModal' }).exists()).toBe(true)
  })
})
