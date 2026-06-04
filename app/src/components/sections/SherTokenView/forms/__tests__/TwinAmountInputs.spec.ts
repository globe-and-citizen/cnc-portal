import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import TwinAmountInputs from '../TwinAmountInputs.vue'

const totalSupplyRef = ref<bigint | undefined>(undefined)
const symbolRef = ref<string | undefined>('SHER')

vi.mock('@/composables/investor/reads', () => ({
  useInvestorSymbol: vi.fn(() => ({ data: symbolRef })),
  useInvestorTotalSupply: vi.fn(() => ({ data: totalSupplyRef }))
}))

const mountInputs = (props: Record<string, unknown> = {}) =>
  mount(TwinAmountInputs, {
    props: {
      percentage: 25,
      amount: 10,
      minPercentage: 5,
      maxPercentage: 80,
      inputColor: 'neutral',
      ...props
    },
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })]
    }
  })

describe('TwinAmountInputs.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    totalSupplyRef.value = 100_000_000n
    symbolRef.value = 'SHER'
  })

  it('renders sync helper and token symbol', () => {
    const wrapper = mountInputs()
    expect(wrapper.find('[data-test="percentage-min"]').text()).toContain('Min > 5%')
    expect(wrapper.find('[data-test="percentage-max"]').text()).toContain('Max < 80%')
    expect(wrapper.text()).toContain('Both fields stay in sync.')
    expect(wrapper.text()).toContain('SHER')
  })

  it('emits updates for percentage and amount', async () => {
    const wrapper = mountInputs()

    await wrapper.find('[data-test="percentage-input"]').setValue('33')
    await wrapper.find('[data-test="amount-input"]').setValue('12')

    const percentageEvents = wrapper.emitted('update:percentage') ?? []
    const amountEvents = wrapper.emitted('update:amount') ?? []
    expect(percentageEvents[percentageEvents.length - 1]).toEqual([33])
    expect(amountEvents[amountEvents.length - 1]).toEqual([12])
  })

  it('disables percentage input when total supply is zero', () => {
    totalSupplyRef.value = 0n
    const wrapper = mountInputs({ percentage: 40 })

    const percentageInput = wrapper.find('input[data-test="percentage-input"]')
    expect(percentageInput.attributes('disabled')).toBeDefined()
    expect((percentageInput.element as HTMLInputElement).value).toBe('100')
  })
})
