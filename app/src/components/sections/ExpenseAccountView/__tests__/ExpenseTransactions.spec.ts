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
  UBadgeStub,
  UCardStub,
  USelectStub,
  UTableStub,
  USDC_ADDRESS,
  ZERO_ADDRESS,
  buildExpenseQueryResult,
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
        UCard: UCardStub,
        UTable: UTableStub,
        USelect: USelectStub,
        UBadge: UBadgeStub,
        AddressToolTip: AddressToolTipStub,
        CustomDatePicker: CustomDatePickerStub
      }
    }
  })

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
    const vm = wrapper.vm as unknown as {
      displayedTransactions: Array<{ type: string }>
      columns: Array<{ header: string }>
    }

    expect(vm.displayedTransactions).toHaveLength(3)
    expect(vm.displayedTransactions.map((row) => row.type)).toEqual(
      expect.arrayContaining(['deposit', 'tokenDeposit', 'transfer'])
    )
    expect(vm.columns.at(-1)?.header).toBe('Value (USD)')
  })

  it('passes loading state to UTable', () => {
    apolloState.incomingTransfersQueryLoading.value = true
    wrapper = createWrapper()
    const vm = wrapper.vm as unknown as { loading: boolean }
    expect(vm.loading).toBe(true)
  })

  it('filters displayed rows by selected type', async () => {
    wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      selectedType: string
      displayedTransactions: Array<{ type: string }>
    }

    vm.selectedType = 'deposit'
    await nextTick()

    expect(vm.displayedTransactions).toHaveLength(1)
    expect(vm.displayedTransactions[0]?.type).toBe('deposit')
  })

  it('filters displayed rows by date range', async () => {
    wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      dateRange: [Date, Date] | null
      displayedTransactions: Array<{ type: string }>
    }

    vm.dateRange = [new Date('2020-01-01T00:00:00Z'), new Date('2020-01-01T23:59:59Z')]
    await nextTick()

    expect(vm.displayedTransactions).toHaveLength(0)
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
    const vm = wrapper.vm as unknown as {
      displayedTransactions: Array<{
        txHash: string
        amount: string | number
        amountLocal: number
        token: string
      }>
    }

    const nativeRow = vm.displayedTransactions.find((row) => row.txHash === '0xnativedeposit')
    const unknownRow = vm.displayedTransactions.find((row) => row.txHash === '0xunknowntx')

    expect(nativeRow?.amountLocal).toBe(3)
    expect(unknownRow?.amount).toBe('0')
    expect(unknownRow?.amountLocal).toBe(0)
    expect(unknownRow?.token).toBe('ERC20')
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
})
