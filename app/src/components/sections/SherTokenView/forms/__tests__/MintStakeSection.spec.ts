import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import MintStakeSection from '../MintStakeSection.vue'

const VALID_ADDRESS = '0x1234567890123456789012345678901234567890'

const totalSupplyRef = ref<bigint | undefined>(undefined)
const recipientBalanceRef = ref<bigint | undefined>(undefined)

vi.mock('@/composables/investor/reads', () => ({
  useInvestorTotalSupply: vi.fn(() => ({ data: totalSupplyRef })),
  useInvestorBalanceOf: vi.fn(() => ({ data: recipientBalanceRef }))
}))

const mountSection = (recipientAddress = VALID_ADDRESS) =>
  mount(MintStakeSection, {
    props: { recipientAddress },
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })],
      stubs: {
        TwinAmountInputs: {
          name: 'TwinAmountInputs',
          props: ['percentage', 'amount', 'inputColor'],
          emits: ['update:percentage', 'update:amount'],
          template: `<div data-test="twin-inputs-stub">
            <div data-test="stub-input-color">{{ inputColor }}</div>
            <button data-test="emit-percentage" @click="$emit('update:percentage', '20')">percentage</button>
            <button data-test="emit-amount" @click="$emit('update:amount', '30')">amount</button>
          </div>`
        },
        MintRecapCard: {
          name: 'MintRecapCard',
          props: ['recipientAddress', 'issuedAmount', 'hasValidationError', 'validationMessage'],
          template:
            '<div data-test="recap-stub">{{ issuedAmount }}|{{ hasValidationError }}|{{ validationMessage }}</div>'
        }
      }
    }
  })

describe('MintStakeSection.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    totalSupplyRef.value = 100_000_000n
    recipientBalanceRef.value = 20_000_000n
  })

  it('renders mode buttons and child sections', () => {
    const wrapper = mountSection()
    expect(wrapper.find('[data-test="add-mode-button"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="ending-mode-button"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="twin-inputs-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="recap-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="stake-range-hint"]').text()).toContain(
      'Allowed Ending % range: > 20% and < 100%'
    )
  })

  it('emits initial invalid state on mount', () => {
    const wrapper = mountSection()
    expect(wrapper.emitted('update:issuedAmount')?.[0]).toEqual([null])
    expect(wrapper.emitted('update:isStakeInvalid')?.[0]).toEqual([true])
  })

  it('emits issued amount and valid state after amount update', async () => {
    const wrapper = mountSection()

    await wrapper.find('[data-test="emit-amount"]').trigger('click')
    await flushPromises()

    const issuedEvents = wrapper.emitted('update:issuedAmount') ?? []
    const invalidEvents = wrapper.emitted('update:isStakeInvalid') ?? []

    expect(issuedEvents.at(-1)).toEqual([10])
    expect(invalidEvents.at(-1)).toEqual([false])
  })

  it('converts ending amount to final stake percentage (not amount/supply)', async () => {
    totalSupplyRef.value = 50_000_000n
    recipientBalanceRef.value = 28_000_000n
    const wrapper = mountSection()
    wrapper.findComponent({ name: 'TwinAmountInputs' }).vm.$emit('update:amount', '100')
    await flushPromises()

    expect(wrapper.findComponent({ name: 'TwinAmountInputs' }).props('percentage')).toBe('81.97')
  })

  it('uses estimated ending percentage with invalid recipient context for amount sync', async () => {
    totalSupplyRef.value = 50_000_000n
    const wrapper = mountSection('0x123')
    wrapper.findComponent({ name: 'TwinAmountInputs' }).vm.$emit('update:amount', '100')
    await flushPromises()

    expect(wrapper.findComponent({ name: 'TwinAmountInputs' }).props('percentage')).toBe('66.67')
  })

  it('keeps percentage-to-amount sync when recipient address is invalid', async () => {
    const wrapper = mountSection('0x123')

    await wrapper.find('[data-test="emit-percentage"]').trigger('click')
    await flushPromises()

    expect(wrapper.findComponent({ name: 'TwinAmountInputs' }).props('amount')).toBe('25')
  })

  it('keeps add-mode percentage-to-amount sync for high percentages', async () => {
    totalSupplyRef.value = 50_000_000n
    const wrapper = mountSection('0x123')
    await wrapper.find('[data-test="add-mode-button"]').trigger('click')
    wrapper.findComponent({ name: 'TwinAmountInputs' }).vm.$emit('update:percentage', '99')
    await flushPromises()

    expect(wrapper.findComponent({ name: 'TwinAmountInputs' }).props('amount')).toBe('4,950')
  })

  it('keeps add-mode sync active without recipient context', async () => {
    totalSupplyRef.value = 50_000_000n
    const wrapper = mountSection('0x123')
    await wrapper.find('[data-test="add-mode-button"]').trigger('click')
    wrapper.findComponent({ name: 'TwinAmountInputs' }).vm.$emit('update:percentage', '56')
    await flushPromises()

    expect(wrapper.findComponent({ name: 'TwinAmountInputs' }).props('amount')).toBe('63.64')
    expect(wrapper.find('[data-test="recap-stub"]').text()).toContain('|false')
  })

  it('keeps ending percentage-to-amount sync even when ending % is below current stake', async () => {
    recipientBalanceRef.value = 40_000_000n
    const wrapper = mountSection()

    await wrapper.find('[data-test="emit-percentage"]').trigger('click')
    await flushPromises()

    expect(wrapper.findComponent({ name: 'TwinAmountInputs' }).props('amount')).toBe('15')
    expect(wrapper.find('[data-test="ending-stake-validation-message"]').text()).toContain(
      'Ending % must be greater than 40%'
    )
  })

  it('shows validation when ending stake exceeds 100%', async () => {
    const wrapper = mountSection()
    wrapper.findComponent({ name: 'TwinAmountInputs' }).vm.$emit('update:percentage', '120')
    await flushPromises()

    expect(wrapper.find('[data-test="ending-stake-validation-message"]').text()).toContain(
      'must stay below 100%'
    )
    expect(wrapper.find('[data-test="recap-stub"]').text()).toContain('true')
  })

  it('shows add-mode validation when added stake is not solvable', async () => {
    recipientBalanceRef.value = 28_000_000n
    totalSupplyRef.value = 50_000_000n
    const wrapper = mountSection()
    await wrapper.find('[data-test="add-mode-button"]').trigger('click')
    wrapper.findComponent({ name: 'TwinAmountInputs' }).vm.$emit('update:percentage', '56')
    await flushPromises()

    expect(wrapper.find('[data-test="stake-range-hint"]').text()).toContain(
      'Allowed Add % range: > 0% and < 44% (current stake 56%).'
    )
    expect(wrapper.find('[data-test="ending-stake-validation-message"]').text()).toContain(
      'Add % is outside the allowed range shown above.'
    )
    expect(wrapper.find('[data-test="recap-stub"]').text()).toContain(
      '|true|Add % is outside the allowed range shown above.'
    )
    expect(wrapper.findComponent({ name: 'TwinAmountInputs' }).props('amount')).toBe('')
  })

  it('does not keep stale recap amount when ending percentage is above 100', async () => {
    const wrapper = mountSection()
    wrapper.findComponent({ name: 'TwinAmountInputs' }).vm.$emit('update:amount', '100')
    await flushPromises()
    wrapper.findComponent({ name: 'TwinAmountInputs' }).vm.$emit('update:percentage', '200')
    await flushPromises()

    expect(wrapper.find('[data-test="recap-stub"]').text()).toBe(
      '|true|Ending % must stay below 100%.'
    )
  })

  it('keeps ending sync valid when computed amount has thousand separators', async () => {
    const wrapper = mountSection()
    wrapper.findComponent({ name: 'TwinAmountInputs' }).vm.$emit('update:percentage', '99')
    await flushPromises()

    expect(wrapper.find('[data-test="ending-stake-validation-message"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="recap-stub"]').text()).toContain('|false')
  })

  it('treats non-finite amount as invalid input', async () => {
    const wrapper = mountSection()
    wrapper.findComponent({ name: 'TwinAmountInputs' }).vm.$emit('update:amount', 'Infinity')
    await flushPromises()

    expect(wrapper.find('[data-test="ending-stake-validation-message"]').text()).toContain(
      'Amount must be greater than 0'
    )
    expect(wrapper.find('[data-test="recap-stub"]').text()).toContain('|true')
  })

  it('disables ending mode and defaults to add mode on empty supply', async () => {
    totalSupplyRef.value = 0n
    recipientBalanceRef.value = 0n
    const wrapper = mountSection()
    await flushPromises()

    expect(wrapper.find('[data-test="ending-mode-button"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-test="stake-range-hint"]').text()).toContain(
      'Add mode: enter shr amount to create initial supply.'
    )
    expect(wrapper.find('[data-test="stub-input-color"]').text()).toBe('primary')
  })

  it('shows explicit validation when ending stake is exactly 100%', async () => {
    const wrapper = mountSection()
    wrapper.findComponent({ name: 'TwinAmountInputs' }).vm.$emit('update:percentage', '100')
    await flushPromises()

    expect(wrapper.find('[data-test="ending-stake-validation-message"]').text()).toContain(
      'must stay below 100%'
    )
    expect(wrapper.find('[data-test="recap-stub"]').text()).toContain('true')
  })

  it('switches input color with mode', async () => {
    const wrapper = mountSection()
    expect(wrapper.find('[data-test="stub-input-color"]').text()).toBe('neutral')

    await wrapper.find('[data-test="add-mode-button"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-test="stub-input-color"]').text()).toBe('primary')
  })
})
