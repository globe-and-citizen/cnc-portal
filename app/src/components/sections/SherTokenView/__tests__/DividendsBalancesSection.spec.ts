import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'

// Mock assets used for token icons
vi.mock('@/assets/Ethereum.png', () => ({ default: 'ethereum.png' }))
vi.mock('@/assets/usdc.png', () => ({ default: 'usdc.png' }))
vi.mock('@/assets/matic-logo.png', () => ({ default: 'matic.png' }))

// Mock team store to provide a bank address
vi.mock('@/stores/teamStore', () => ({
  useTeamStore: vi.fn(() => ({
    getContractAddressByType: vi.fn(() => '0xbank')
  }))
}))

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

// Prepare a mutable mock for the composable
const mockComposable = {
  dividends: ref<MockDividend[]>([]),
  isLoading: ref(false)
}

vi.mock('@/composables/useContractBalance', () => ({
  useContractBalance: vi.fn(() => mockComposable)
}))

// Import component under test after mocks are set
import DividendsBalancesSection from '@/components/sections/SherTokenView/DividendsBalancesSection.vue'

describe('DividendsBalancesSection.vue', () => {
  const createWrapper = () =>
    mount(DividendsBalancesSection, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })

  afterEach(() => {
    vi.clearAllMocks()
    mockComposable.dividends.value = []
    mockComposable.isLoading.value = false
  })

  it('mounts and renders rows from dividends (filtered > 0 USD)', () => {
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

    mockComposable.dividends.value = [ethDividend, usdcDividend, zeroDividend]

    const wrapper = createWrapper()

    // Table exists
    expect(wrapper.find('[data-test="dividends-table"]').exists()).toBe(true)

    // Should render only 2 rows (filtered > 0 USD)
    const rows = wrapper.findAll('tbody tr[data-test$="-row"]')
    expect(rows.length).toBe(2)
  })

  it('sorts by USD descending and assigns rank starting from 1', () => {
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

    mockComposable.dividends.value = [maticDividend, usdcDividend, ethDividend]

    const wrapper = createWrapper()
    const firstRow = wrapper.find('tbody tr[data-test="0-row"]')
    const cells = firstRow.findAll('td')

    // Rank cell should be 1
    expect(cells[0].text()).toBe('1')
    // Amount cell should reflect the highest USD entry which is ETH here
    expect(cells[2].text()).toContain('ETH')
    // USD cell should be $2,000 for the first row
    expect(cells[3].text()).toContain('$2,000')
  })

  it('shows token icons for known symbols and initial fallback for unknown', () => {
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
    mockComposable.dividends.value = [unknownDividend, ethDividend, usdcDividend]

    const wrapper = createWrapper()

    const firstRowTokenCell = wrapper.find('tbody tr[data-test="0-row"] [data-test="token-cell"]')
    // Unknown symbol should NOT render an img, but should render initial "F"
    expect(firstRowTokenCell.find('[data-test="token-icon"]').exists()).toBe(false)
    expect(firstRowTokenCell.text()).toContain('F')

    const secondRowTokenCell = wrapper.find('tbody tr[data-test="1-row"] [data-test="token-cell"]')
    // Known symbol ETH should render an icon
    expect(secondRowTokenCell.find('[data-test="token-icon"]').exists()).toBe(true)
  })

  it('shows loading state when composable is loading', () => {
    mockComposable.isLoading.value = true
    mockComposable.dividends.value = []

    const wrapper = createWrapper()
    expect(wrapper.find('[data-test="loading"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="table"]').exists()).toBe(false)
  })

  it('renders empty state when there are no dividend holdings', () => {
    mockComposable.dividends.value = []
    mockComposable.isLoading.value = false

    const wrapper = createWrapper()
    expect(wrapper.find('[data-test="empty-state"]').exists()).toBe(true)
  })
})
