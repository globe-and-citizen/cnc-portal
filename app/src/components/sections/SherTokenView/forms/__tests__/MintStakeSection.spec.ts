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
    props: { recipientAddress, hasValidationError: false },
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })],
      stubs: {
        TwinAmountInputs: {
          name: 'TwinAmountInputs',
          props: ['percentage', 'amount', 'inputColor', 'minPercentage', 'maxPercentage'],
          emits: ['update:percentage', 'update:amount'],
          template: `<div data-test="twin-inputs-stub">
            <div data-test="stub-input-color">{{ inputColor }}</div>
            <div data-test="stub-min">{{ minPercentage }}</div>
            <div data-test="stub-max">{{ maxPercentage }}</div>
            <button data-test="emit-percentage" @click="$emit('update:percentage', 20)">percentage</button>
            <button data-test="emit-amount" @click="$emit('update:amount', 30)">amount</button>
          </div>`
        },
        MintRecapCard: {
          name: 'MintRecapCard',
          props: [
            'recipientAddress',
            'issuedAmount',
            'requestedStakePercentage',
            'hasValidationError'
          ],
          template:
            '<div data-test="recap-stub">{{ issuedAmount }}|{{ requestedStakePercentage }}|{{ hasValidationError }}</div>'
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
    expect(wrapper.find('[data-test="stub-min"]').text()).toBe('20')
    expect(wrapper.find('[data-test="stub-max"]').text()).toBe('100')
  })

  it('emits initial stake payload and issued amount on mount', () => {
    const wrapper = mountSection()
    expect(wrapper.emitted('update:issuedAmount')?.[0]).toEqual([0])
    expect(wrapper.emitted('update:stakePayload')?.[0]).toEqual([
      expect.objectContaining({
        amount: 0,
        percentage: 0,
        stakeMode: 'ending',
        totalSupply: 100
      })
    ])
  })

  it('emits issued amount and payload after amount update', async () => {
    const wrapper = mountSection()

    await wrapper.find('[data-test="emit-amount"]').trigger('click')
    await flushPromises()

    const issuedEvents = wrapper.emitted('update:issuedAmount') ?? []
    const payloadEvents = wrapper.emitted('update:stakePayload') ?? []
    const latestPayload = payloadEvents[payloadEvents.length - 1]?.[0] as
      | { amount: number; percentage: number; stakeMode: string }
      | undefined

    expect(issuedEvents[issuedEvents.length - 1]).toEqual([10])
    expect(latestPayload?.amount).toBe(30)
    expect(latestPayload?.stakeMode).toBe('ending')
    expect(latestPayload?.percentage).toBeCloseTo(27.27272727272727, 10)
  })

  it('converts ending amount to final stake percentage (not amount/supply)', async () => {
    totalSupplyRef.value = 50_000_000n
    recipientBalanceRef.value = 28_000_000n
    const wrapper = mountSection()
    wrapper.findComponent({ name: 'TwinAmountInputs' }).vm.$emit('update:amount', 100)
    await flushPromises()

    expect(wrapper.findComponent({ name: 'TwinAmountInputs' }).props('percentage')).toBeCloseTo(
      81.97,
      2
    )
  })

  it('keeps add-mode percentage-to-amount sync for high percentages', async () => {
    totalSupplyRef.value = 50_000_000n
    recipientBalanceRef.value = undefined
    const wrapper = mountSection()
    await wrapper.find('[data-test="add-mode-button"]').trigger('click')
    wrapper.findComponent({ name: 'TwinAmountInputs' }).vm.$emit('update:percentage', 99)
    await flushPromises()

    expect(wrapper.findComponent({ name: 'TwinAmountInputs' }).props('amount')).toBeCloseTo(4950, 6)
    const payloadEvents = wrapper.emitted('update:stakePayload') ?? []
    expect(payloadEvents[payloadEvents.length - 1]?.[0]).toMatchObject({
      addMax: 100,
      stakeMode: 'add'
    })
  })

  it('disables ending mode and defaults to add mode on empty supply', async () => {
    totalSupplyRef.value = 0n
    recipientBalanceRef.value = 0n
    const wrapper = mountSection()
    await flushPromises()

    expect(wrapper.find('[data-test="ending-mode-button"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-test="stub-min"]').text()).toBe('0')
    expect(wrapper.find('[data-test="stub-max"]').text()).toBe('100')
    expect(wrapper.find('[data-test="stub-input-color"]').text()).toBe('primary')
  })
})
