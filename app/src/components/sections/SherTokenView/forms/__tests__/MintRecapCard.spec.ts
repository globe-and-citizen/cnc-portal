import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import MintRecapCard from '../MintRecapCard.vue'

const VALID_ADDRESS = '0x1234567890123456789012345678901234567890'

const symbolRef = ref<string | undefined>('SHER')
const totalSupplyRef = ref<bigint | undefined>(100_000_000n)
const recipientBalanceRef = ref<bigint | undefined>(20_000_000n)

vi.mock('@/composables/investor/reads', () => ({
  useInvestorSymbol: vi.fn(() => ({ data: symbolRef })),
  useInvestorTotalSupply: vi.fn(() => ({ data: totalSupplyRef })),
  useInvestorBalanceOf: vi.fn(() => ({ data: recipientBalanceRef }))
}))

const mountRecap = (props: Record<string, unknown> = {}) =>
  mount(MintRecapCard, {
    props: {
      recipientAddress: VALID_ADDRESS,
      issuedAmount: 10,
      hasValidationError: false,
      ...props
    },
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })]
    }
  })

describe('MintRecapCard.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    symbolRef.value = 'SHER'
    totalSupplyRef.value = 100_000_000n
    recipientBalanceRef.value = 20_000_000n
  })

  it('renders recap lines for valid recipient context', () => {
    const wrapper = mountRecap()
    expect(wrapper.find('[data-test="recap-card"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="recap-stake-line"]').text()).toContain('Recipient stake')
    expect(wrapper.find('[data-test="recap-stake-line"]').text()).toContain('issuing')
    expect(wrapper.find('[data-test="recap-token-stake-line"]').text()).toContain('issuing')
    expect(wrapper.find('[data-test="new-total-supply-recap"]').text()).toContain(
      'New total supply'
    )
  })

  it('keeps same recap structure when recipient address is invalid', () => {
    const wrapper = mountRecap({ recipientAddress: '0x123' })
    expect(wrapper.find('[data-test="recap-stake-line"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="recap-token-stake-line"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="new-total-supply-recap"]').text()).toContain(
      'New total supply'
    )
  })

  it('formats recap stake and supply lines with expected precision for decimal issuance', () => {
    totalSupplyRef.value = 50_000_000n
    recipientBalanceRef.value = 28_000_000n
    symbolRef.value = 'shr'

    const wrapper = mountRecap({ issuedAmount: 1.162791 })

    expect(wrapper.find('[data-test="recap-stake-line"]').text()).toContain('issuing')
    expect(wrapper.find('[data-test="recap-token-stake-line"]').text()).toBe(
      'Recipient shr stake → 29.162791 shr (was 28 shr; issuing 1.162791 shr)'
    )
    expect(wrapper.find('[data-test="new-total-supply-recap"]').text()).toBe(
      'New total supply → 51.162791 shr (current supply 50 shr)'
    )
  })

  it('does not round recap stake up to 100% when it is only near 100%', () => {
    totalSupplyRef.value = 50_000_000n
    recipientBalanceRef.value = 28_000_000n
    symbolRef.value = 'shr'

    const wrapper = mountRecap({ issuedAmount: 219_999_949.871549 })

    expect(wrapper.find('[data-test="recap-stake-line"]').text()).toContain(
      'Recipient stake → 100%'
    )
  })

  it('shows status-only recap lines when amount is unsolvable', () => {
    totalSupplyRef.value = 50_000_000n
    recipientBalanceRef.value = 28_000_000n
    symbolRef.value = 'shr'

    const wrapper = mountRecap({
      issuedAmount: null,
      hasValidationError: true
    })

    expect(wrapper.find('[data-test="recap-stake-line"]').text()).toContain(
      'Recipient stake → 56% (was 56%; issuing 0%)'
    )
    expect(wrapper.find('[data-test="recap-token-stake-line"]').text()).toBe(
      'Recipient shr stake → 28 shr (was 28 shr; issuing 0 shr)'
    )
    expect(wrapper.find('[data-test="new-total-supply-recap"]').text()).toBe(
      'New total supply → 50 shr (current supply 50 shr)'
    )
  })

  it('does not render recap card when token symbol is unavailable', () => {
    symbolRef.value = undefined
    const wrapper = mountRecap()
    expect(wrapper.find('[data-test="recap-card"]').exists()).toBe(false)
  })
})
