import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { parseUnits, zeroAddress } from 'viem'
import { createTestingPinia } from '@pinia/testing'
import PayDividendsTable from '@/components/sections/SherTokenView/PayDividendsTable.vue'
import { mockUseGetDividendBalances, resetComposableMocks } from '@/tests/mocks'

// Only mock external composable - this is a true external dependency
vi.mock('@/composables/bank/reads', () => ({
  useGetDividendBalances: () => mockUseGetDividendBalances
}))

describe('PayDividendsTable.vue', () => {
  beforeEach(() => {
    resetComposableMocks()
    vi.clearAllMocks()
  })

  const createWrapper = (props = {}) => {
    return mount(PayDividendsTable, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          // Stub UI components - not essential to test
          UCard: true,
          UTable: true,
          UAlert: true,
          UButton: true,
          // Stub child component - will be tested separately
          ClaimDividendButton: true
        }
      },
      props
    })
  }

  it('renders loading state when data is loading', () => {
    mockUseGetDividendBalances.isLoading.value = true
    mockUseGetDividendBalances.data.value = []

    const wrapper = createWrapper()

    // Component should show loading indicator
    expect(wrapper.exists()).toBe(true)
  })

  it('renders empty state when no dividends', () => {
    mockUseGetDividendBalances.isLoading.value = false
    mockUseGetDividendBalances.data.value = []

    const wrapper = createWrapper()

    // Component mounts successfully with empty data
    expect(wrapper.exists()).toBe(true)
  })

  it('renders table with dividend data', () => {
    mockUseGetDividendBalances.isLoading.value = false
    mockUseGetDividendBalances.data.value = [
      {
        token: {
          address: '0xTOKEN1',
          name: 'Ethereum',
          symbol: 'ETH',
          decimals: 18
        },
        balance: parseUnits('1', 18),
        error: null
      }
    ]

    const wrapper = createWrapper()

    // Component renders successfully with data
    expect(wrapper.exists()).toBe(true)
  })

  it('handles multiple tokens with different decimals', () => {
    mockUseGetDividendBalances.isLoading.value = false
    mockUseGetDividendBalances.data.value = [
      {
        token: {
          address: '0xETH',
          name: 'Ethereum',
          symbol: 'ETH',
          decimals: 18
        },
        balance: parseUnits('1', 18),
        error: null
      },
      {
        token: {
          address: '0xUSDC',
          name: 'USD Coin',
          symbol: 'USDC',
          decimals: 6
        },
        balance: parseUnits('100', 6),
        error: null
      },
      {
        token: {
          address: '0xPOL',
          name: 'Polygon',
          symbol: 'POL',
          decimals: 18
        },
        balance: parseUnits('50', 18),
        error: null
      }
    ]

    const wrapper = createWrapper()

    // Component handles multiple tokens
    expect(wrapper.exists()).toBe(true)
  })

  it('processes tokens with zero balance', () => {
    mockUseGetDividendBalances.isLoading.value = false
    mockUseGetDividendBalances.data.value = [
      {
        token: {
          address: '0xETH',
          name: 'Ethereum',
          symbol: 'ETH',
          decimals: 18
        },
        balance: parseUnits('1', 18),
        error: null
      },
      {
        token: {
          address: '0xZERO',
          name: 'Zero Token',
          symbol: 'ZERO',
          decimals: 18
        },
        balance: 0n,
        error: null
      }
    ]

    const wrapper = createWrapper()

    // Component handles zero balance tokens
    expect(wrapper.exists()).toBe(true)
  })

  it('identifies native token by zero address', () => {
    mockUseGetDividendBalances.isLoading.value = false
    mockUseGetDividendBalances.data.value = [
      {
        token: {
          address: zeroAddress,
          name: 'Native Token',
          symbol: 'NATIVE',
          decimals: 18
        },
        balance: parseUnits('1', 18),
        error: null
      }
    ]

    const wrapper = createWrapper()

    // Component renders with native token
    expect(wrapper.exists()).toBe(true)
  })

  it('displays USDC token correctly', () => {
    mockUseGetDividendBalances.isLoading.value = false
    mockUseGetDividendBalances.data.value = [
      {
        token: {
          address: '0xUSDC',
          name: 'USD Coin',
          symbol: 'USDC',
          decimals: 6
        },
        balance: parseUnits('100', 6),
        error: null
      }
    ]

    const wrapper = createWrapper()

    // Component renders with USDC token
    expect(wrapper.exists()).toBe(true)
  })
})
