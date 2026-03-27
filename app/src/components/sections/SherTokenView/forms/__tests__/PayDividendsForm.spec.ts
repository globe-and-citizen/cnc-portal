import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import PayDividendsForm from '../PayDividendsForm.vue'
import { createTestingPinia } from '@pinia/testing'
import type { Team } from '@/types'
import { mockUseContractBalance, resetComposableMocks } from '@/tests/mocks'

type BalanceEntry = {
  amount: number
  token: {
    id: string
    name: string
    symbol: string
    code: string
    coingeckoId: string
    decimals: number
    address: string
  }
  values: {
    USD: {
      value: number
      formated: string
      id: string
      code: string
      symbol: string
      price: number
      formatedPrice: string
    }
  }
}

type BalanceEntryOverrides = Partial<Omit<BalanceEntry, 'token' | 'values'>> & {
  token?: Partial<BalanceEntry['token']>
  values?: {
    USD?: Partial<BalanceEntry['values']['USD']>
  }
}

const makeBalance = (overrides: BalanceEntryOverrides = {}): BalanceEntry => {
  const base: BalanceEntry = {
    amount: 0,
    token: {
      id: 'native',
      name: 'Token',
      symbol: 'TKN',
      code: 'TKN',
      coingeckoId: 'token',
      decimals: 18,
      address: '0x0000000000000000000000000000000000000000'
    },
    values: {
      USD: {
        value: 0,
        formated: '$0',
        id: 'usd',
        code: 'USD',
        symbol: '$',
        price: 1,
        formatedPrice: '$1'
      }
    }
  }

  return {
    ...base,
    ...overrides,
    token: { ...base.token, ...(overrides.token ?? {}) },
    values: {
      USD: { ...base.values.USD, ...(overrides.values?.USD ?? {}) }
    }
  }
}

const TokenAmountStub = {
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

const BodAlertStub = {
  template: `<div data-test="bod-alert" />`
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
    values: {
      USD: {
        value: 20000,
        formated: '$20K',
        id: 'usd',
        code: 'USD',
        symbol: '$',
        price: 2000,
        formatedPrice: '$2K'
      }
    }
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
    values: {
      USD: {
        value: 25,
        formated: '$25',
        id: 'usd',
        code: 'USD',
        symbol: '$',
        price: 1,
        formatedPrice: '$1'
      }
    }
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
          TokenAmount: TokenAmountStub,
          BodAlert: BodAlertStub
        }
      }
    })

  afterEach(() => {
    resetComposableMocks()
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

  it('emits submit with parsed native token amount', async () => {
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

  it('respects token decimals when submitting alternate token', async () => {
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

  it('passes non-sher tokens to TokenAmount', () => {
    mockUseContractBalance.balances.value = defaultBalances()

    const wrapper = createComponent()
    const tokensProp = wrapper.findComponent(TokenAmountStub).props('tokens') as Array<{
      tokenId: string
    }>

    expect(tokensProp).toHaveLength(2)
    expect(tokensProp.some((token) => token.tokenId === 'sher')).toBe(false)
  })

  it('shows BodAlert when bod action is required', () => {
    mockUseContractBalance.balances.value = defaultBalances()

    const wrapper = createComponent({ isBodAction: true })
    expect(wrapper.find('[data-test="bod-alert"]').exists()).toBe(true)
  })
})
