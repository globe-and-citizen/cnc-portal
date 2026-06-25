import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import type { Address } from 'viem'
import * as utils from '@/utils'
import { useQuery } from '@vue/apollo-composable'
import { useCurrencyStore } from '@/stores/currencyStore'
import {
  createMockApolloQueryState,
  makeCurrencyStoreMock,
  mockApolloUseQueryByVariableKey,
  resetMockApolloQueryState
} from '@/tests/mocks'
import ExpenseTransactions from '../ExpenseTransactions.vue'
import {
  AddressToolTipStub,
  CustomDatePickerStub,
  EXPENSE_ADDRESS,
  TablePaginationStub,
  UBadgeStub,
  UCardStub,
  USelectStub,
  UTableStub,
  USDC_ADDRESS,
  UserComponentStub,
  ZERO_ADDRESS,
  buildExpenseQueryResult,
  buildGroupedExpenseQueryResult,
  buildGroupedZeroChildExpenseQueryResult,
  buildFallbackExpenseQueryResult,
  buildIncomingTransfersQueryResult,
  buildPaginatedExpenseQueryResult
} from './ExpenseTransactions.test-utils'

const expenseQuery = createMockApolloQueryState()
const incomingTransfersQuery = createMockApolloQueryState()
const mockCurrencyStore = makeCurrencyStoreMock()
const mockGetTokenPrice = mockCurrencyStore.getTokenPrice

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
        TablePagination: TablePaginationStub,
        'u-card': UCardStub,
        'u-table': UTableStub,
        'u-select': USelectStub,
        'u-badge': UBadgeStub,
        'user-component': UserComponentStub,
        'table-pagination': TablePaginationStub
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
    mockApolloUseQueryByVariableKey(vi.mocked(useQuery), expenseQuery, {
      toAddress: incomingTransfersQuery
    })
    vi.mocked(useCurrencyStore).mockReturnValue(
      mockCurrencyStore as unknown as ReturnType<typeof useCurrencyStore>
    )
    resetMockApolloQueryState(expenseQuery, buildExpenseQueryResult())
    resetMockApolloQueryState(incomingTransfersQuery, buildIncomingTransfersQueryResult())
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
    incomingTransfersQuery.loading.value = true
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
    expenseQuery.result.value = buildGroupedExpenseQueryResult()
    incomingTransfersQuery.result.value = undefined
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

  it('renders grouped zero-value child events with value fallback', () => {
    expenseQuery.result.value = buildGroupedZeroChildExpenseQueryResult()
    incomingTransfersQuery.result.value = undefined
    wrapper = createWrapper()

    const childRow = wrapper.find('[data-test="table-child-row"]')

    expect(childRow.exists()).toBe(true)
    expect(childRow.text()).toContain('—')
  })

  it('filters displayed rows by date range', async () => {
    wrapper = createWrapper()

    await wrapper.find('[data-test="date-filter-set-2020"]').trigger('click')
    await nextTick()

    expect(getTableRows(wrapper)).toHaveLength(0)
  })

  it('changes page via table footer pagination controls', async () => {
    expenseQuery.result.value = buildPaginatedExpenseQueryResult(25)
    incomingTransfersQuery.result.value = undefined
    wrapper = createWrapper()

    expect(getTableRows(wrapper)).toHaveLength(20)
    expect(wrapper.find('[data-test="footer-page"]').text()).toBe('1')

    await wrapper.find('[data-test="footer-next-page"]').trigger('click')
    await nextTick()

    expect(wrapper.find('[data-test="footer-page"]').text()).toBe('2')
    expect(getTableRows(wrapper)).toHaveLength(5)
  })

  it('anchors the current first row when page size changes', async () => {
    expenseQuery.result.value = buildPaginatedExpenseQueryResult(25)
    incomingTransfersQuery.result.value = undefined
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
    const expenseQueryVariables = vi.mocked(useQuery).mock.calls[0]?.[1] as {
      contractAddress: { value: string }
    }
    const expenseQueryOptions = vi.mocked(useQuery).mock.calls[0]?.[2] as {
      enabled: { value: boolean }
    }
    const incomingTransfersVariables = vi.mocked(useQuery).mock.calls[1]?.[1] as {
      toAddress: { value: string }
    }
    const incomingTransfersOptions = vi.mocked(useQuery).mock.calls[1]?.[2] as {
      enabled: { value: boolean }
    }

    expect(expenseQueryVariables.contractAddress.value).toBe('')
    expect(expenseQueryOptions.enabled.value).toBe(false)
    expect(incomingTransfersVariables.toAddress.value).toBe('')
    expect(incomingTransfersOptions.enabled.value).toBe(false)
  })

  it('maps ownership transfer events with a — value', () => {
    expenseQuery.result.value = {
      ...buildExpenseQueryResult(),
      expenseOwnershipTransferreds: {
        items: [
          {
            id: '0xownershiphash-0',
            contractAddress: EXPENSE_ADDRESS,
            previousOwner: '0x5555555555555555555555555555555555555555',
            newOwner: '0x6666666666666666666666666666666666666666',
            timestamp: 1_700_000_200
          }
        ]
      }
    }
    incomingTransfersQuery.result.value = undefined
    wrapper = createWrapper()

    const row = findRowByTxHash(wrapper, '0xownershiphash')

    expect(row).toBeDefined()
    expect(getRowField(row!, '[data-test="row-type"]')).toBe('ownershipTransferred')
    expect(getRowField(row!, '[data-test="row-amount"]')).toBe('0')
    expect(getRowField(row!, '[data-test="row-value-slot"]')).toContain('—')
    expect(getRowField(row!, '[data-test="row-type-slot"]')).toContain('→')
  })

  it('handles token resolution fallback and invalid amounts', () => {
    mockCurrencyStore.supportedTokens = []
    mockGetTokenPrice.mockImplementation((tokenId: string) => (tokenId === 'native' ? 3 : 0))
    expenseQuery.result.value = buildFallbackExpenseQueryResult()

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
    expenseQuery.error.value = error
    await nextTick()
    expect(logErrorSpy).toHaveBeenCalledWith('Ponder expense transaction query error:', error)

    expenseQuery.error.value = null
    incomingTransfersQuery.error.value = error
    await nextTick()
    expect(logErrorSpy).toHaveBeenCalledTimes(2)
  })

  it('shows an empty state when there are no transactions', () => {
    expenseQuery.result.value = undefined
    incomingTransfersQuery.result.value = undefined
    wrapper = createWrapper()
    expect(wrapper.find('[data-test="expense-transactions-empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="expense-transactions-error"]').exists()).toBe(false)
  })

  it('shows an error state when a transactions query fails', () => {
    expenseQuery.result.value = undefined
    incomingTransfersQuery.result.value = undefined
    expenseQuery.error.value = new Error('expense query failed')
    wrapper = createWrapper()
    expect(wrapper.find('[data-test="expense-transactions-error"]').exists()).toBe(true)
  })
})
