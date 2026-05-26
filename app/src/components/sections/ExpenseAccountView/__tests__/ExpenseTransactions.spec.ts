import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import type { Address } from 'viem'
import * as utils from '@/utils'
import ExpenseTransactions from '../ExpenseTransactions.vue'
import {
  AddressToolTipStub,
  CustomDatePickerStub,
  EXPENSE_ADDRESS,
  USDC_ADDRESS,
  ZERO_ADDRESS,
  buildExpenseQueryResult,
  buildGroupedExpenseQueryResult,
  buildFallbackExpenseQueryResult,
  buildIncomingTransfersQueryResult
} from './ExpenseTransactions.test-utils'

const { apolloState, mockUseQuery, mockCurrencyStore, mockGetTokenPrice } = vi.hoisted(() => {
  const apolloState = {
    expenseQueryResult: null as unknown as { value: unknown },
    expenseQueryError: null as unknown as { value: Error | null },
    expenseQueryLoading: null as unknown as { value: boolean },
    incomingTransfersQueryResult: null as unknown as { value: unknown },
    incomingTransfersQueryError: null as unknown as { value: Error | null },
    incomingTransfersQueryLoading: null as unknown as { value: boolean }
  }
  const mockUseQuery = vi.fn()
  const mockGetTokenPrice = vi.fn(() => 1)
  const mockCurrencyStore = {
    localCurrency: { code: 'USD' },
    supportedTokens: [
      { id: 'native', symbol: 'ETH', address: '0x0000000000000000000000000000000000000000' },
      { id: 'usdc', symbol: 'USDC', address: '0xa3492d046095affe351cfac15de9b86425e235db' }
    ],
    getTokenPrice: mockGetTokenPrice
  }

  return { apolloState, mockUseQuery, mockCurrencyStore, mockGetTokenPrice }
})

vi.mock('@vue/apollo-composable', async () => {
  const { ref } = await import('vue')
  apolloState.expenseQueryResult = ref()
  apolloState.expenseQueryError = ref<Error | null>(null)
  apolloState.expenseQueryLoading = ref(false)
  apolloState.incomingTransfersQueryResult = ref()
  apolloState.incomingTransfersQueryError = ref<Error | null>(null)
  apolloState.incomingTransfersQueryLoading = ref(false)
  mockUseQuery.mockImplementation((_document, variables) => {
    if (variables && 'toAddress' in variables) {
      return {
        result: apolloState.incomingTransfersQueryResult,
        error: apolloState.incomingTransfersQueryError,
        loading: apolloState.incomingTransfersQueryLoading
      }
    }

    return {
      result: apolloState.expenseQueryResult,
      error: apolloState.expenseQueryError,
      loading: apolloState.expenseQueryLoading
    }
  })

  return { useQuery: mockUseQuery }
})

vi.mock('@/stores/currencyStore', () => ({
  useCurrencyStore: () => mockCurrencyStore
}))

const createWrapper = (expenseAddress: Address = EXPENSE_ADDRESS): VueWrapper =>
  mount(ExpenseTransactions, {
    props: { expenseAddress },
    global: {
      stubs: {
        AddressToolTip: AddressToolTipStub,
        CustomDatePicker: CustomDatePickerStub
      }
    }
  })

const getBodyRows = (wrapper: VueWrapper) => wrapper.findAll('tbody[data-slot="tbody"] > tr[data-slot="tr"]')

const getTypeFromRow = (row: ReturnType<typeof getBodyRows>[number]) => {
  const typeCell = row.findAll('td')[3]
  return typeCell ? typeCell.text().replace(/\s+/g, ' ').trim() : ''
}

const getValueFromRow = (row: ReturnType<typeof getBodyRows>[number]) => {
  const valueCell = row.findAll('td')[6]
  return valueCell ? valueCell.text().replace(/\s+/g, ' ').trim() : ''
}

const findRowByTxHash = (wrapper: VueWrapper, txHash: string) =>
  getBodyRows(wrapper).find((row) => row.find(`[address="${txHash}"]`).exists())

describe('ExpenseTransactions', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    vi.clearAllMocks()
    apolloState.expenseQueryResult.value = buildExpenseQueryResult()
    apolloState.expenseQueryError.value = null
    apolloState.expenseQueryLoading.value = false
    apolloState.incomingTransfersQueryResult.value = buildIncomingTransfersQueryResult()
    apolloState.incomingTransfersQueryError.value = null
    apolloState.incomingTransfersQueryLoading.value = false
    mockCurrencyStore.supportedTokens = [
      { id: 'native', symbol: 'ETH', address: ZERO_ADDRESS },
      { id: 'usdc', symbol: 'USDC', address: USDC_ADDRESS }
    ]
    mockGetTokenPrice.mockReturnValue(1)
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })

  it('maps query data and renders rows/columns', () => {
    wrapper = createWrapper()

    const rows = getBodyRows(wrapper)
    const rowTypes = rows.map(getTypeFromRow)
    const headers = wrapper.findAll('thead[data-slot="thead"] th').map((header) => header.text())

    expect(rows).toHaveLength(3)
    expect(rowTypes.join(' ')).toContain('deposit')
    expect(rowTypes.join(' ')).toContain('tokenDeposit')
    expect(rowTypes.join(' ')).toContain('transfer')
    expect(headers.at(-1)).toBe('Value (USD)')
  })

  it('passes loading state to table', () => {
    apolloState.incomingTransfersQueryLoading.value = true
    wrapper = createWrapper()
    const tableHeadClasses = wrapper.find('thead[data-slot="thead"]').classes()
    expect(tableHeadClasses).toContain('after:animate-[carousel_2s_ease-in-out_infinite]')
  })

  it('renders selected type filter control', () => {
    wrapper = createWrapper()
    expect(wrapper.find('[data-test="expense-transaction-history-type-filter"]').exists()).toBe(true)
  })

  it('groups multiple events sharing the same tx hash as sub-rows', async () => {
    apolloState.expenseQueryResult.value = buildGroupedExpenseQueryResult()
    apolloState.incomingTransfersQueryResult.value = undefined
    wrapper = createWrapper()

    expect(getBodyRows(wrapper)).toHaveLength(2)
    expect(wrapper.text()).toContain('2 events')

    await wrapper.find('[data-test="expense-transaction-expand-button"]').trigger('click')
    await nextTick()

    const sharedRows = getBodyRows(wrapper).filter((row) => row.find('[address="0xsharedhash"]').exists())
    expect(sharedRows).toHaveLength(2)
  })

  it('filters displayed rows by date range', async () => {
    wrapper = createWrapper()

    await wrapper.find('[data-test="date-filter-set-2020"]').trigger('click')
    await nextTick()

    expect(getBodyRows(wrapper)).toHaveLength(0)
  })

  it('uses disabled query option when expense address is empty', () => {
    wrapper = createWrapper('' as Address)
    const expenseQueryVariables = mockUseQuery.mock.calls[0]?.[1] as {
      contractAddress: { value: string }
    }
    const expenseQueryOptions = mockUseQuery.mock.calls[0]?.[2] as { enabled: { value: boolean } }
    const incomingTransfersVariables = mockUseQuery.mock.calls[1]?.[1] as {
      toAddress: { value: string }
    }
    const incomingTransfersOptions = mockUseQuery.mock.calls[1]?.[2] as {
      enabled: { value: boolean }
    }

    expect(expenseQueryVariables.contractAddress.value).toBe('')
    expect(expenseQueryOptions.enabled.value).toBe(false)
    expect(incomingTransfersVariables.toAddress.value).toBe('')
    expect(incomingTransfersOptions.enabled.value).toBe(false)
  })

  it('handles token resolution fallback and invalid amounts', () => {
    mockCurrencyStore.supportedTokens = []
    mockGetTokenPrice.mockImplementation((tokenId: string) => (tokenId === 'native' ? 3 : 0))
    apolloState.expenseQueryResult.value = buildFallbackExpenseQueryResult()

    wrapper = createWrapper()

    const nativeRow = findRowByTxHash(wrapper, '0xnativedeposit')
    const unknownRow = findRowByTxHash(wrapper, '0xunknowntx')

    expect(nativeRow).toBeDefined()
    expect(getValueFromRow(nativeRow!)).toContain('$3')

    expect(unknownRow).toBeDefined()
    expect(getValueFromRow(unknownRow!)).toContain('0 ERC20')
    expect(getValueFromRow(unknownRow!)).toContain('$0')
  })

  it('logs query errors', async () => {
    const logErrorSpy = vi.spyOn(utils.log, 'error')
    wrapper = createWrapper()

    const error = new Error('expense query failed')
    apolloState.expenseQueryError.value = error
    await nextTick()
    expect(logErrorSpy).toHaveBeenCalledWith('Ponder expense transaction query error:', error)

    apolloState.expenseQueryError.value = null
    apolloState.incomingTransfersQueryError.value = error
    await nextTick()
    expect(logErrorSpy).toHaveBeenCalledTimes(2)
  })

  it('shows an empty state when there are no transactions', () => {
    apolloState.expenseQueryResult.value = undefined
    apolloState.incomingTransfersQueryResult.value = undefined
    wrapper = createWrapper()
    expect(wrapper.find('[data-test="expense-transactions-empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="expense-transactions-error"]').exists()).toBe(false)
  })

  it('shows an error state when a transactions query fails', () => {
    apolloState.expenseQueryResult.value = undefined
    apolloState.incomingTransfersQueryResult.value = undefined
    apolloState.expenseQueryError.value = new Error('expense query failed')
    wrapper = createWrapper()
    expect(wrapper.find('[data-test="expense-transactions-error"]').exists()).toBe(true)
  })
})
