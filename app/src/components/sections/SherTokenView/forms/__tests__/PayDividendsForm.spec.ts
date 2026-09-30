import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import PayDividendsForm from '../PayDividendsForm.vue'
import { createTestingPinia } from '@pinia/testing'
import type { Team } from '@/types'
import { mockUseContractBalance, makeTokenBalance } from '@/tests/mocks'

const makeBalance = makeTokenBalance

const TokenAmountInputStub = {
  name: 'TokenAmountInput',
  props: ['modelValue', 'tokens', 'loading'],
  emits: ['update:modelValue'],
  template: `
    <div data-test="token-amount">
      <slot name="label" />
      <input
        data-test="amount-input"
        type="number"
        step="any"
        :value="modelValue?.amount || ''"
        @input="$emit('update:modelValue', { amount: $event.target.value, tokenId: modelValue?.tokenId || 'native' })"
      />
      <select
        data-test="token-select"
        :value="modelValue?.tokenId || 'native'"
        @change="$emit('update:modelValue', { amount: modelValue?.amount || '', tokenId: $event.target.value })"
      >
        <option v-for="token in tokens" :key="token.tokenId" :value="token.tokenId">
          {{ token.symbol }}
        </option>
      </select>
      <slot />
    </div>
  `
}

const defaultBalances = () => [
  makeBalance({
    amount: 10,
    token: {
      id: 'native',
      name: 'Ether',
      symbol: 'ETH',
      code: 'ETH',
      decimals: 18,
      address: '0x0000000000000000000000000000000000000001'
    },
    usdPrice: 2000
  }),
  makeBalance({
    amount: 25,
    token: {
      id: 'usdc',
      name: 'USD Coin',
      symbol: 'USDC',
      code: 'USDC',
      decimals: 6,
      address: '0x0000000000000000000000000000000000000002'
    },
    usdPrice: 1
  }),
  makeBalance({
    amount: 5,
    token: {
      id: 'sher',
      name: 'Sher Token',
      symbol: 'SHER',
      code: 'SHER',
      decimals: 6,
      address: '0x0000000000000000000000000000000000000003'
    }
  })
]

describe('PayDividendsForm.vue', () => {
  const defaultProps = {
    tokenSymbol: 'ETH',
    loading: false,
    team: {} as Team,
    isBodAction: false
  }

  const createComponent = (props = {}) =>
    mount(PayDividendsForm, {
      props: { ...defaultProps, ...props },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          TokenAmountInput: TokenAmountInputStub
        }
      }
    })

  afterEach(() => {
    vi.clearAllMocks()
    mockUseContractBalance.balances.value = []
  })

  it('renders bank empty warning when selected token balance is zero', () => {
    mockUseContractBalance.balances.value = [
      makeBalance({
        amount: 0,
        token: {
          id: 'native',
          name: 'Ether',
          symbol: 'ETH',
          code: 'ETH',
          decimals: 18,
          address: '0x0000000000000000000000000000000000000001'
        }
      })
    ]

    const wrapper = createComponent()
    expect(wrapper.find('[data-test="bank-empty-warning"]').exists()).toBe(true)
  })

  it('hides bank empty warning when balance is greater than zero', () => {
    mockUseContractBalance.balances.value = defaultBalances()

    const wrapper = createComponent()
    expect(wrapper.find('[data-test="bank-empty-warning"]').exists()).toBe(false)
  })

  it('[AC-US-SHER-002-01] submits a positive native amount within the Bank balance', async () => {
    mockUseContractBalance.balances.value = defaultBalances()

    const wrapper = createComponent()

    // User enters amount in the input field
    const amountInput = wrapper.find('[data-test="amount-input"]')
    await amountInput.setValue('1.5')
    await wrapper.vm.$nextTick()

    // Trigger submit (simulates user clicking submit button)
    await wrapper.vm.onSubmit()

    // Verify component emitted the submit event with parsed amount
    const submitEvents = wrapper.emitted<'submit'>('submit')
    expect(submitEvents).toBeTruthy()
    expect(submitEvents?.[0]).toEqual([1500000000000000000n, 'native'])
  })

  it('[AC-US-SHER-002-01] submits a held ERC-20 amount using its token precision', async () => {
    mockUseContractBalance.balances.value = defaultBalances()

    const wrapper = createComponent()

    // User selects a different token (USDC)
    const tokenSelect = wrapper.find('[data-test="token-select"]')
    await tokenSelect.setValue('usdc')
    await wrapper.vm.$nextTick()

    // User enters amount in the input field
    const amountInput = wrapper.find('[data-test="amount-input"]')
    await amountInput.setValue('2.5')
    await wrapper.vm.$nextTick()

    // Trigger submit (simulates user clicking submit button)
    await wrapper.vm.onSubmit()

    // Verify component emitted the submit event with amount parsed using USDC decimals (6)
    const submitEvents = wrapper.emitted<'submit'>('submit')
    expect(submitEvents?.[0]).toEqual([2500000n, 'usdc'])
  })

  it('[AC-US-SHER-002-07] excludes SHER from dividend token choices', () => {
    mockUseContractBalance.balances.value = defaultBalances()

    const wrapper = createComponent()
    const tokensProp = wrapper.findComponent(TokenAmountInputStub).props('tokens') as Array<{
      tokenId: string
    }>

    expect(tokensProp).toHaveLength(2)
    expect(tokensProp.some((token) => token.tokenId === 'sher')).toBe(false)
  })

  it('[AC-US-SHER-002-06] identifies the Board approval requirement before submission', () => {
    mockUseContractBalance.balances.value = defaultBalances()

    const wrapper = createComponent({ isBodAction: true })
    expect(wrapper.find('[data-test="bod-action-alert"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('This will create a BOD action')
  })

  it('[AC-US-SHER-002-10] rejects zero, non-numeric, and over-balance amounts', async () => {
    mockUseContractBalance.balances.value = defaultBalances()
    const wrapper = createComponent()
    const tokenAmount = wrapper.findComponent(TokenAmountInputStub)
    const submitButton = wrapper.find('[data-test="pay-dividends-submit-button"]')

    for (const invalidAmount of ['0', 'not-a-number', '11']) {
      tokenAmount.vm.$emit('update:modelValue', {
        amount: invalidAmount,
        tokenId: 'native'
      })
      await wrapper.vm.$nextTick()
      await submitButton.trigger('click')
    }

    expect(wrapper.emitted('submit')).toBeUndefined()
  })
})
