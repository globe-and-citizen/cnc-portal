import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { useTeamStore } from '@/stores'
import { useCurrencyStore } from '@/stores/currencyStore'
import { mockInvestorReads } from '@/tests/mocks'

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

const { eventFeedState, mockGetTokenPrice, mockInvestorSymbolData, mockGetContractAddressByType } =
  vi.hoisted(() => {
    const eventFeedState = {
      investorResult: null as unknown as { value: unknown },
      investorError: null as unknown as { value: Error | null },
      investorLoading: null as unknown as { value: boolean },
      safeResult: null as unknown as { value: unknown },
      safeError: null as unknown as { value: Error | null },
      safeLoading: null as unknown as { value: boolean }
    }
    const mockGetTokenPrice = vi.fn(() => 1)
    const mockInvestorSymbolData = { value: 'SHER' }
    const mockGetContractAddressByType = vi.fn((type: string) => {
      if (type === 'InvestorV1') return INVESTOR_ADDRESS
      if (type === 'SafeDepositRouter') return SAFE_ROUTER_ADDRESS
      return null
    })
    return {
      eventFeedState,
      mockGetTokenPrice,
      mockInvestorSymbolData,
      mockGetContractAddressByType
    }
  })

vi.mock('@/composables/investor/useInvestorEventsViaLogs', async () => {
  const { ref } = await import('vue')
  eventFeedState.investorResult = ref()
  eventFeedState.investorError = ref<Error | null>(null)
  eventFeedState.investorLoading = ref(false)
  return {
    useInvestorEventsViaLogs: () => ({
      result: eventFeedState.investorResult,
      error: eventFeedState.investorError,
      loading: eventFeedState.investorLoading
    })
  }
})

vi.mock('@/composables/investor/useSafeDepositRouterEventsViaLogs', async () => {
  const { ref } = await import('vue')
  eventFeedState.safeResult = ref()
  eventFeedState.safeError = ref<Error | null>(null)
  eventFeedState.safeLoading = ref(false)
  return {
    useSafeDepositRouterEventsViaLogs: () => ({
      result: eventFeedState.safeResult,
      error: eventFeedState.safeError,
      loading: eventFeedState.safeLoading
    })
  }
})

describe('InvestorsTransactions', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    vi.clearAllMocks()
    eventFeedState.investorResult.value = buildInvestorResult()
    eventFeedState.investorError.value = null
    eventFeedState.investorLoading.value = false
    eventFeedState.safeResult.value = buildSafeResult()
    eventFeedState.safeError.value = null
    eventFeedState.safeLoading.value = false
    mockGetTokenPrice.mockReturnValue(1)
    mockInvestorSymbolData.value = 'SHER'
    mockInvestorReads.symbol.data.value = 'SHER'
    mockGetContractAddressByType.mockImplementation((type: string) => {
      if (type === 'InvestorV1') return INVESTOR_ADDRESS
      if (type === 'SafeDepositRouter') return SAFE_ROUTER_ADDRESS
      return null
    })
    vi.mocked(useTeamStore).mockReturnValue({
      getContractAddressByType: mockGetContractAddressByType
    } as never)
    vi.mocked(useCurrencyStore).mockReturnValue({
      localCurrency: { code: 'USD' },
      supportedTokens: [{ id: 'usdc', symbol: 'USDC', address: USDC_ADDRESS }],
      getTokenPrice: mockGetTokenPrice
    } as never)
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
    expect(columns.some((column) => column.header === 'Value (USD)')).toBe(true)
  })

  it('passes loading from investor query to table', () => {
    eventFeedState.investorLoading.value = true
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
    expect(wrapper.get('[data-test="investor-transaction-history-date-select"]').exists()).toBe(
      true
    )
    const picker = wrapper.getComponent({ name: 'DatePicker' })
    expect(picker.props('mode')).toBe('range')
    expect(picker.props('storageKey')).toBe(
      'transaction-history-range-investor-transaction-history'
    )
    picker.vm.$emit('update:modelValue', {
      start: new Date('2020-01-01T00:00:00Z'),
      end: new Date('2020-01-01T23:59:59Z')
    })
    await nextTick()
    expect(tableData(wrapper)).toHaveLength(0)
  })
})
