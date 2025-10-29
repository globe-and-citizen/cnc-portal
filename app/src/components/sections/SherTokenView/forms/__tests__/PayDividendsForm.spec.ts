import { describe, it, expect, vi, afterEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import PayDividendsForm from '../PayDividendsForm.vue'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import type { Team } from '@/types'

type BalanceEntry = {
  amount: number
  token: {
    id: string
    name: string
    symbol: string
    code: string
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

const makeBalance = (overrides: Partial<BalanceEntry> = {}): BalanceEntry => {
  const base: BalanceEntry = {
    amount: 0,
    token: {
      id: 'native',
      name: 'Token',
      symbol: 'TKN',
      code: 'TKN',
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

const mockComposable = {
  balances: ref<BalanceEntry[]>([])
}

vi.mock('@/stores', () => ({
  useTeamStore: vi.fn(() => ({
    getContractAddressByType: vi.fn(() => '0xbank')
  }))
}))

vi.mock('@/composables/useContractBalance', () => ({
  useContractBalance: vi.fn(() => mockComposable)
}))

const TokenAmountStub = {
  props: ['modelValue', 'modelToken', 'tokens', 'loading'],
  emits: ['update:modelValue', 'update:modelToken'],
  template: `<div data-test="token-amount"><slot name="label" /><slot /></div>`
}

const ButtonUIStub = {
  props: ['loading', 'disabled'],
  emits: ['click'],
  template: `<button :disabled="disabled" data-test="submit-button" @click="$emit('click')"><slot /></button>`
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
    shallowMount(PayDividendsForm, {
      props: { ...defaultProps, ...props },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          TokenAmount: TokenAmountStub,
          ButtonUI: ButtonUIStub,
          BodAlert: BodAlertStub
        }
      }
    })

  afterEach(() => {
    vi.clearAllMocks()
    mockComposable.balances.value = []
  })

  it('renders bank empty warning when selected token balance is zero', () => {
    mockComposable.balances.value = [
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
    mockComposable.balances.value = defaultBalances()

    const wrapper = createComponent()
    expect(wrapper.find('[data-test="bank-empty-warning"]').exists()).toBe(false)
  })

  it('emits submit with parsed native token amount', async () => {
    mockComposable.balances.value = defaultBalances()

    const wrapper = createComponent()
    const tokenAmount = wrapper.findComponent(TokenAmountStub)

    tokenAmount.vm.$emit('update:modelValue', '1.5')
    await wrapper.vm.$nextTick()

    await wrapper.find('[data-test="submit-button"]').trigger('click')

    const submitEvents = wrapper.emitted<'submit'>('submit')
    expect(submitEvents).toBeTruthy()
    expect(submitEvents?.[0]).toEqual([1500000000000000000n, 'native'])
  })

  it('respects token decimals when submitting alternate token', async () => {
    mockComposable.balances.value = defaultBalances()

    const wrapper = createComponent()
    const tokenAmount = wrapper.findComponent(TokenAmountStub)

    tokenAmount.vm.$emit('update:modelToken', 'usdc')
    await wrapper.vm.$nextTick()

    tokenAmount.vm.$emit('update:modelValue', '2.5')
    await wrapper.vm.$nextTick()

    await wrapper.find('[data-test="submit-button"]').trigger('click')

    const submitEvents = wrapper.emitted<'submit'>('submit')
    expect(submitEvents?.[0]).toEqual([2500000n, 'usdc'])
  })

  it('passes non-sher tokens to TokenAmount', () => {
    mockComposable.balances.value = defaultBalances()

    const wrapper = createComponent()
    const tokensProp = wrapper.findComponent(TokenAmountStub).props('tokens') as Array<{
      tokenId: string
    }>

    expect(tokensProp).toHaveLength(2)
    expect(tokensProp.some((token) => token.tokenId === 'sher')).toBe(false)
  })

  it('shows BodAlert when bod action is required', () => {
    mockComposable.balances.value = defaultBalances()

    const wrapper = createComponent({ isBodAction: true })
    expect(wrapper.find('[data-test="bod-alert"]').exists()).toBe(true)
  })
})

