import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import type { Address } from 'viem'
import * as utils from '@/utils'
import ExpenseTransactions from '../ExpenseTransactions.vue'
import {
  AddressToolTipStub,
  CustomDatePickerStub,
  EXPENSE_ADDRESS,
  TransactionTableFooterStub,
  UBadgeStub,
  UCardStub,
  USelectStub,
  UTableStub,
  USDC_ADDRESS,
  UserComponentStub,
  ZERO_ADDRESS,
  buildExpenseQueryResult,
  buildGroupedExpenseQueryResult,
  buildFallbackExpenseQueryResult,
  buildIncomingTransfersQueryResult,
  buildPaginatedExpenseQueryResult
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
        UCard: UCardStub,
        Card: UCardStub,
        UTable: UTableStub,
        Table: UTableStub,
        USelect: USelectStub,
        Select: USelectStub,
        UBadge: UBadgeStub,
        Badge: UBadgeStub,
        AddressToolTip: AddressToolTipStub,
        CustomDatePicker: CustomDatePickerStub,
        UserComponent: UserComponentStub,
        TransactionTableFooter: TransactionTableFooterStub,
        'u-card': UCardStub,
        'u-table': UTableStub,
        'u-select': USelectStub,
        'u-badge': UBadgeStub,
        'user-component': UserComponentStub,
        'transaction-table-footer': TransactionTableFooterStub
      }
    }
  })

const getTableRows = (wrapper: VueWrapper) => wrapper.findAll('[data-test="table-row"]')

const getRowField = (row: DOMWrapper<Element>, selector: string) => row.find(selector).text()

const findRowByTxHash = (wrapper: VueWrapper, txHash: string) =>
  getTableRows(wrapper).find((row) => getRowField(row, '[data-test="row-tx-hash"]') === txHash)

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

  it('maps query data and passes rows/columns to UTable', () => {
    wrapper = createWrapper()

    const rows = getTableRows(wrapper)
    const rowTypes = rows.map((row) => getRowField(row, '[data-test="row-type"]'))
    const headers = wrapper.findAll('[data-test="table-header"]').map((header) => header.text())

    expect(rows).toHaveLength(3)
    expect(rowTypes).toEqual(expect.arrayContaining(['deposit', 'tokenDeposit', 'transfer']))
    expect(headers[headers.length - 2]).toBe('Value (USD)')
  })

  it('passes loading state to UTable', () => {
    apolloState.incomingTransfersQueryLoading.value = true
    wrapper = createWrapper()

    expect(wrapper.find('[data-test="expense-table"]').attributes('data-loading')).toBe('true')
  })

  it('renders selected type filter control', () => {
    wrapper = createWrapper()
    expect(
      wrapper.find('[data-test="type-filter"]').exists() ||
        wrapper.find('[data-test="expense-transaction-history-type-filter"]').exists()
    ).toBe(true)
  })

  it('groups multiple events sharing the same tx hash as sub-rows', () => {
    apolloState.expenseQueryResult.value = buildGroupedExpenseQueryResult()
    apolloState.incomingTransfersQueryResult.value = undefined
    wrapper = createWrapper()

    const rows = getTableRows(wrapper)
    const groupedRow = findRowByTxHash(wrapper, '0xsharedhash')
    const singleRow = findRowByTxHash(wrapper, '0xsinglehash')

    expect(rows).toHaveLength(2)

    expect(groupedRow).toBeDefined()
    expect(getRowField(groupedRow!, '[data-test="row-grouped-event-count"]')).toBe('2')
    expect(getRowField(groupedRow!, '[data-test="row-sub-row-count"]')).toBe('1')

    expect(singleRow).toBeDefined()
    expect(getRowField(singleRow!, '[data-test="row-grouped-event-count"]')).toBe('1')
    expect(getRowField(singleRow!, '[data-test="row-sub-row-count"]')).toBe('0')
  })

  it('filters displayed rows by date range', async () => {
    wrapper = createWrapper()

    await wrapper.find('[data-test="date-filter-set-2020"]').trigger('click')
    await nextTick()

    expect(getTableRows(wrapper)).toHaveLength(0)
  })

  it('changes page via table footer pagination controls', async () => {
    apolloState.expenseQueryResult.value = buildPaginatedExpenseQueryResult(25)
    apolloState.incomingTransfersQueryResult.value = undefined
    wrapper = createWrapper()

    expect(getTableRows(wrapper)).toHaveLength(20)
    expect(wrapper.find('[data-test="footer-page"]').text()).toBe('1')

    await wrapper.find('[data-test="footer-next-page"]').trigger('click')
    await nextTick()

    expect(wrapper.find('[data-test="footer-page"]').text()).toBe('2')
    expect(getTableRows(wrapper)).toHaveLength(5)
  })

  it('resets page to first page when page size changes', async () => {
    apolloState.expenseQueryResult.value = buildPaginatedExpenseQueryResult(25)
    apolloState.incomingTransfersQueryResult.value = undefined
    wrapper = createWrapper()

    await wrapper.find('[data-test="footer-next-page"]').trigger('click')
    await nextTick()
    expect(wrapper.find('[data-test="footer-page"]').text()).toBe('2')

    await wrapper.find('[data-test="footer-page-size-50"]').trigger('click')
    await nextTick()

    expect(wrapper.find('[data-test="footer-page"]').text()).toBe('1')
    expect(wrapper.find('[data-test="footer-page-size"]').text()).toBe('50')
    expect(getTableRows(wrapper)).toHaveLength(25)
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
    expect(getRowField(nativeRow!, '[data-test="row-amount-local"]')).toBe('3')

    expect(unknownRow).toBeDefined()
    expect(getRowField(unknownRow!, '[data-test="row-amount"]')).toBe('0')
    expect(getRowField(unknownRow!, '[data-test="row-amount-local"]')).toBe('0')
    expect(getRowField(unknownRow!, '[data-test="row-token"]')).toBe('ERC20')
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
