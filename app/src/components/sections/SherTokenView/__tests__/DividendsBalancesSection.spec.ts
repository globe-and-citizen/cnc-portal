import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { mockTeamStore, mockUseContractBalance, resetComposableMocks } from '@/tests/mocks'

type MockDividend = {
  amount: number
  token: {
    id: string
    name: string
    symbol: string
    code: string
    decimals: number
    address: string
  }
  values: Record<
    string,
    {
      value: number
      formated: string
      id: string
      code: string
      symbol: string
      price: number
      formatedPrice: string
    }
  >
}

const baseDividend: MockDividend = {
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

const makeDividend = (): MockDividend => ({
  amount: baseDividend.amount,
  token: { ...baseDividend.token },
  values: Object.fromEntries(
    Object.entries(baseDividend.values).map(([code, value]) => [code, { ...value }])
  )
})

import DividendsBalancesSection from '@/components/sections/SherTokenView/DividendsBalancesSection.vue'

describe('DividendsBalancesSection.vue', () => {
  const createWrapper = () => {
    return mount(DividendsBalancesSection, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })
  }

  beforeEach(() => {
    mockTeamStore.getContractAddressByType = vi.fn(() => '0xbank')
  })

  afterEach(() => {
    resetComposableMocks()
    vi.clearAllMocks()
  })

  it('mounts and renders rows from dividends (filtered > 0 USD)', async () => {
    const ethDividend = makeDividend()
    ethDividend.token = {
      ...ethDividend.token,
      id: 'native',
      name: 'Ethereum',
      symbol: 'ETH',
      code: 'ETH',
      decimals: 18
    }
    ethDividend.amount = 1
    ethDividend.values.USD = {
      ...ethDividend.values.USD,
      value: 2000,
      formated: '$2,000'
    }

    const usdcDividend = makeDividend()
    usdcDividend.token = {
      ...usdcDividend.token,
      id: 'usdc',
      name: 'USD Coin',
      symbol: 'USDC',
      code: 'USDC',
      decimals: 6
    }
    usdcDividend.amount = 500
    usdcDividend.values.USD = {
      ...usdcDividend.values.USD,
      value: 500,
      formated: '$500'
    }

    const zeroDividend = makeDividend()
    zeroDividend.token = {
      ...zeroDividend.token,
      id: 'foo',
      name: 'FooToken',
      symbol: 'FOO',
      code: 'FOO',
      decimals: 18
    }
    zeroDividend.amount = 10
    zeroDividend.values.USD = {
      ...zeroDividend.values.USD,
      value: 0,
      formated: '$0'
    }

    mockUseContractBalance.dividends.value = [ethDividend, usdcDividend, zeroDividend]

    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    const bankAddress = (wrapper.vm as unknown as { bankAddress?: string }).bankAddress
    expect(bankAddress).toBe('0xbank')

    const dividends = (wrapper.vm as unknown as { dividends: MockDividend[] }).dividends
    expect(dividends.length).toBe(3)

    // Table exists
    expect(wrapper.find('[data-test="dividends-table"]').exists()).toBe(true)

    // Should render only 2 rows (filtered > 0 USD)
    const rows = (wrapper.vm as unknown as { tableRows: unknown[] }).tableRows
    expect(rows.length).toBe(2)
  })

  it('sorts by USD descending and assigns rank starting from 1', async () => {
    const maticDividend = makeDividend()
    maticDividend.token = {
      ...maticDividend.token,
      id: 'matic',
      name: 'Polygon',
      symbol: 'MATIC',
      code: 'MATIC',
      decimals: 18
    }
    maticDividend.amount = 100
    maticDividend.values.USD = {
      ...maticDividend.values.USD,
      value: 100,
      formated: '$100'
    }

    const usdcDividend = makeDividend()
    usdcDividend.token = {
      ...usdcDividend.token,
      id: 'usdc',
      name: 'USD Coin',
      symbol: 'USDC',
      code: 'USDC',
      decimals: 6
    }
    usdcDividend.amount = 500
    usdcDividend.values.USD = {
      ...usdcDividend.values.USD,
      value: 500,
      formated: '$500'
    }

    const ethDividend = makeDividend()
    ethDividend.token = {
      ...ethDividend.token,
      id: 'native',
      name: 'Ethereum',
      symbol: 'ETH',
      code: 'ETH',
      decimals: 18
    }
    ethDividend.amount = 1
    ethDividend.values.USD = {
      ...ethDividend.values.USD,
      value: 2000,
      formated: '$2,000'
    }

    mockUseContractBalance.dividends.value = [maticDividend, usdcDividend, ethDividend]

    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const rows = (
      wrapper.vm as unknown as {
        tableRows: Array<{
          rank: number
          token: { symbol: string }
          values: { USD?: { formated: string } }
        }>
      }
    ).tableRows

    expect(rows[0]?.rank).toBe(1)
    expect(rows[0]?.token.symbol).toBe('ETH')
    expect(rows[0]?.values.USD?.formated).toBe('$2,000')
  })

  it('shows token icons for known symbols and initial fallback for unknown', async () => {
    const unknownDividend = makeDividend()
    unknownDividend.token = {
      ...unknownDividend.token,
      id: 'foo',
      name: 'FooToken',
      symbol: 'FOO',
      code: 'FOO',
      decimals: 18
    }
    unknownDividend.amount = 10
    unknownDividend.values.USD = {
      ...unknownDividend.values.USD,
      value: 1234,
      formated: '$1,234'
    }

    const ethDividend = makeDividend()
    ethDividend.token = {
      ...ethDividend.token,
      id: 'native',
      name: 'Ethereum',
      symbol: 'ETH',
      code: 'ETH',
      decimals: 18
    }
    ethDividend.amount = 1
    ethDividend.values.USD = {
      ...ethDividend.values.USD,
      value: 1000,
      formated: '$1,000'
    }

    const usdcDividend = makeDividend()
    usdcDividend.token = {
      ...usdcDividend.token,
      id: 'usdc',
      name: 'USD Coin',
      symbol: 'USDC',
      code: 'USDC',
      decimals: 6
    }
    usdcDividend.amount = 500
    usdcDividend.values.USD = {
      ...usdcDividend.values.USD,
      value: 500,
      formated: '$500'
    }

    // Place unknown with highest USD to appear first row
    mockUseContractBalance.dividends.value = [unknownDividend, ethDividend, usdcDividend]

    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const rows = (
      wrapper.vm as unknown as {
        tableRows: Array<{ icon: string | null; name?: string }>
      }
    ).tableRows

    expect(rows[0]?.icon).toBeNull()
    expect(rows[0]?.name).toBe('FooToken')
    expect(rows[1]?.icon).not.toBeNull()
  })

  it.skip('shows loading state when composable is loading', () => {
    mockUseContractBalance.isLoading.value = true
    mockUseContractBalance.dividends.value = []

    const wrapper = createWrapper()
    expect(wrapper.find('[data-test="loading"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="table"]').exists()).toBe(false)
  })

  it('renders empty state when there are no dividend holdings', () => {
    mockUseContractBalance.dividends.value = []
    mockUseContractBalance.isLoading.value = false

    const wrapper = createWrapper()
    expect(wrapper.find('[data-test="empty-state"]').exists()).toBe(true)
  })
})
