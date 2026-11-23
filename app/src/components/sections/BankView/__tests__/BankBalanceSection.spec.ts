import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import BankBalanceSection from '../BankBalanceSection.vue'
import type { Address } from 'viem'
import { defineComponent } from 'vue'
import { mockUseContractBalance } from '@/tests/mocks'

// Mock @iconify/vue FIRST, before any other imports
vi.mock('@iconify/vue', () => ({
  Icon: {
    name: 'Icon',
    template: '<span></span>',
    props: ['icon']
  }
}))

const baseTotal = {
  usd: { value: 50500, formatted: '$50.5K' },
  local: { value: 50500, formatted: '$50.5K' }
}

describe('[US-BANK-003] BankBalanceSection', () => {
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
          AddressTooltip: defineComponent({ props: ['address'], template: '<div />' })
        }
      }
    })

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseContractBalance.total.value = {
      usd: { ...baseTotal.usd },
      local: { ...baseTotal.local }
    }
    mockUseContractBalance.hasData.value = true
    mockUseContractBalance.isLoading.value = false
  })

  it('[AC-US-BANK-003-01] renders Bank holdings and their local-currency value', () => {
    const wrapper = createWrapper()

    expect(wrapper.get('[data-test="bank-total-usd"]').text()).toBe('$50,500.00')
    expect(wrapper.get('[data-test="bank-total-local"]').text()).toContain('$50,500.00 USD')
    expect(wrapper.text()).toContain('USD')
  })

  it.each([
    [null, '—'],
    [0, '$0.00']
  ] as const)(
    '[AC-US-BANK-003-10] distinguishes unavailable fiat value %s from a real zero',
    (value, expected) => {
      mockUseContractBalance.total.value = {
        usd: { value, formatted: expected },
        local: { value, formatted: expected }
      }
      const wrapper = createWrapper()
      expect(wrapper.get('[data-test="bank-total-usd"]').text()).toBe(expected)
      expect(wrapper.get('[data-test="bank-total-local"]').text()).toContain(expected)
    }
  )

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
