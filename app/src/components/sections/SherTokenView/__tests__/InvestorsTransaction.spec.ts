import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'

// Auto-imported @nuxt/ui components bypass `config.global.stubs` because the
// Nuxt UI Vite plugin resolves them through their file path. Mocking the
// modules ensures our stubs are actually rendered so we can inspect props
// instead of reaching into `wrapper.vm`.
vi.mock('@nuxt/ui/components/Table.vue', () => ({
  default: {
    name: 'UTable',
    props: ['data', 'columns', 'loading'],
    template: '<div data-test="investor-table"></div>'
  }
}))
vi.mock('@nuxt/ui/components/Select.vue', () => ({
  default: {
    name: 'USelect',
    props: ['modelValue', 'items'],
    emits: ['update:modelValue'],
    template: '<div data-test="investor-type-filter"></div>'
  }
}))

import {
  buildInvestorResult,
  buildSafeResult,
  createWrapper,
  INVESTOR_ADDRESS,
  SAFE_ROUTER_ADDRESS,
  USDC_ADDRESS
} from './InvestorsTransaction.fixture'

type DisplayedRow = { type: string; token: string }
type Column = { header: string }

const tableData = (wrapper: VueWrapper) =>
  wrapper.findComponent({ name: 'UTable' }).props('data') as DisplayedRow[]
const tableColumns = (wrapper: VueWrapper) =>
  wrapper.findComponent({ name: 'UTable' }).props('columns') as Column[]
const tableLoading = (wrapper: VueWrapper) =>
  wrapper.findComponent({ name: 'UTable' }).props('loading') as boolean

const {
  apolloState,
  mockUseQuery,
  mockGetTokenPrice,
  mockInvestorSymbolData,
  mockGetContractAddressByType
} = vi.hoisted(() => {
  const apolloState = {
    investorResult: null as unknown as { value: unknown },
    investorError: null as unknown as { value: Error | null },
    investorLoading: null as unknown as { value: boolean },
    safeResult: null as unknown as { value: unknown },
    safeError: null as unknown as { value: Error | null },
    safeLoading: null as unknown as { value: boolean }
  }
  const mockUseQuery = vi.fn()
  const mockGetTokenPrice = vi.fn(() => 1)
  const mockInvestorSymbolData = { value: 'SHER' }
  const mockGetContractAddressByType = vi.fn((type: string) => {
    if (type === 'InvestorV1') return INVESTOR_ADDRESS
    if (type === 'SafeDepositRouter') return SAFE_ROUTER_ADDRESS
    return null
  })
  return {
    apolloState,
    mockUseQuery,
    mockGetTokenPrice,
    mockInvestorSymbolData,
    mockGetContractAddressByType
  }
})

vi.mock('@vue/apollo-composable', async () => {
  const { ref } = await import('vue')
  apolloState.investorResult = ref()
  apolloState.investorError = ref<Error | null>(null)
  apolloState.investorLoading = ref(false)
  apolloState.safeResult = ref()
  apolloState.safeError = ref<Error | null>(null)
  apolloState.safeLoading = ref(false)
  return { useQuery: mockUseQuery }
})

vi.mock('@/stores', () => ({
  useTeamStore: () => ({
    getContractAddressByType: mockGetContractAddressByType
  }),
  useCurrencyStore: () => ({
    localCurrency: { code: 'USD' },
    supportedTokens: [{ id: 'usdc', symbol: 'USDC', address: USDC_ADDRESS }],
    getTokenPrice: mockGetTokenPrice
  })
}))

vi.mock('@/composables/investor/reads', () => ({
  useInvestorSymbol: () => ({
    data: mockInvestorSymbolData
  })
}))

describe('InvestorsTransactions', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    vi.clearAllMocks()
    apolloState.investorResult.value = buildInvestorResult()
    apolloState.investorError.value = null
    apolloState.investorLoading.value = false
    apolloState.safeResult.value = buildSafeResult()
    apolloState.safeError.value = null
    apolloState.safeLoading.value = false
    mockGetTokenPrice.mockReturnValue(1)
    mockInvestorSymbolData.value = 'SHER'
    mockGetContractAddressByType.mockImplementation((type: string) => {
      if (type === 'InvestorV1') return INVESTOR_ADDRESS
      if (type === 'SafeDepositRouter') return SAFE_ROUTER_ADDRESS
      return null
    })
    mockUseQuery.mockReset()
    mockUseQuery
      .mockReturnValueOnce({
        result: apolloState.investorResult,
        error: apolloState.investorError,
        loading: apolloState.investorLoading
      })
      .mockReturnValueOnce({
        result: apolloState.safeResult,
        error: apolloState.safeError,
        loading: apolloState.safeLoading
      })
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })

  it('maps investor and safe router events into table rows', () => {
    wrapper = createWrapper()
    const data = tableData(wrapper)
    const columns = tableColumns(wrapper)
    expect(data).toHaveLength(3)
    expect(data.map((row) => row.type)).toEqual(
      expect.arrayContaining(['mint', 'safeDeposit', 'safeMultiplierUpdated'])
    )
    expect(data.find((row) => row.type === 'mint')?.token).toBe('SHER')
    expect(data.find((row) => row.type === 'safeMultiplierUpdated')?.token).toBe('x')
    expect(columns.at(-1)?.header).toBe('Value (USD)')
  })

  it('passes loading from investor query to table', () => {
    apolloState.investorLoading.value = true
    wrapper = createWrapper()
    expect(tableLoading(wrapper)).toBe(true)
  })

  it('filters displayed rows by selected type', async () => {
    wrapper = createWrapper()
    wrapper.getComponent({ name: 'USelect' }).vm.$emit('update:modelValue', 'safeDeposit')
    await nextTick()
    const data = tableData(wrapper)
    expect(data).toHaveLength(1)
    expect(data[0]?.type).toBe('safeDeposit')
  })

  it('filters rows by date range', async () => {
    wrapper = createWrapper()
    wrapper
      .getComponent('[data-test="investor-date-filter"]')
      .vm.$emit('update:modelValue', [
        new Date('2020-01-01T00:00:00Z'),
        new Date('2020-01-01T23:59:59Z')
      ])
    await nextTick()
    expect(tableData(wrapper)).toHaveLength(0)
  })
})
