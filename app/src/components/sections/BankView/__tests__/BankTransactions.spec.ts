import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import type { Address } from 'viem'
import * as utils from '@/utils'
import BankTransactions from '../BankTransactions.vue'

const { apolloState, mockUseQuery, mockCurrencyStore, mockGetTokenPrice } = vi.hoisted(() => {
  const apolloState = {
    queryResult: null as unknown as { value: unknown },
    queryError: null as unknown as { value: Error | null },
    queryLoading: null as unknown as { value: boolean }
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

  return {
    apolloState,
    mockUseQuery,
    mockCurrencyStore,
    mockGetTokenPrice
  }
})

vi.mock('@vue/apollo-composable', async () => {
  const { ref } = await import('vue')
  apolloState.queryResult = ref()
  apolloState.queryError = ref<Error | null>(null)
  apolloState.queryLoading = ref(false)
  mockUseQuery.mockImplementation(() => ({
    result: apolloState.queryResult,
    error: apolloState.queryError,
    loading: apolloState.queryLoading
  }))
  return { useQuery: mockUseQuery }
})

vi.mock('@/stores/currencyStore', () => ({
  useCurrencyStore: () => mockCurrencyStore
}))

const UCardStub = defineComponent({
  name: 'UCard',
  template: '<div><slot name="header" /><slot /></div>'
})

const UTableStub = defineComponent({
  name: 'UTable',
  props: {
    data: { type: Array, required: false },
    columns: { type: Array, required: false },
    loading: { type: Boolean, required: false }
  },
  template: '<div data-test="bank-table"></div>'
})

const USelectStub = defineComponent({
  name: 'USelect',
  props: {
    modelValue: { type: String, required: false },
    items: { type: Array, required: false }
  },
  emits: ['update:modelValue'],
  template: '<div data-test="type-filter"></div>'
})

const CustomDatePickerStub = defineComponent({
  name: 'CustomDatePicker',
  props: {
    modelValue: { type: Array, required: false }
  },
  emits: ['update:modelValue'],
  template: '<div data-test="date-filter"></div>'
})

const AddressToolTipStub = defineComponent({
  name: 'AddressToolTip',
  template: '<div />'
})

const UBadgeStub = defineComponent({
  name: 'UBadge',
  template: '<span><slot /></span>'
})

const BANK_ADDRESS = '0x1111111111111111111111111111111111111111' as Address

const buildBankQueryResult = () => ({
  bankDeposits: {
    items: [
      {
        id: '0xdeposithash-0',
        contractAddress: BANK_ADDRESS,
        depositor: '0x2222222222222222222222222222222222222222',
        amount: '1000000000000000000',
        timestamp: 1_700_000_000
      }
    ]
  },
  bankTokenDeposits: {
    items: []
  },
  bankTransfers: {
    items: [
      {
        id: '0xtransferhash-0',
        sender: '0x3333333333333333333333333333333333333333',
        to: '0x4444444444444444444444444444444444444444',
        amount: '5000000',
        timestamp: 1_700_000_100
      }
    ]
  },
  bankTokenTransfers: {
    items: []
  },
  bankDividendDistributionTriggereds: {
    items: []
  },
  bankFeePaids: {
    items: []
  },
  bankOwnershipTransferreds: {
    items: []
  },
  rawContractTokenTransfers: {
    items: []
  }
})

const createWrapper = (): VueWrapper =>
  mount(BankTransactions, {
    props: {
      bankAddress: BANK_ADDRESS
    },
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

describe('BankTransactions', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    vi.clearAllMocks()
    apolloState.queryResult.value = buildBankQueryResult()
    apolloState.queryError.value = null
    apolloState.queryLoading.value = false
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

    expect(vm.displayedTransactions).toHaveLength(2)
    expect(vm.displayedTransactions.map((row) => row.type)).toEqual(
      expect.arrayContaining(['deposit', 'transfer'])
    )
    expect(vm.columns.at(-1)?.header).toBe('Value (USD)')
  })

  it('passes loading state to UTable', () => {
    apolloState.queryLoading.value = true

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

  it('logs query errors', async () => {
    const logErrorSpy = vi.spyOn(utils.log, 'error')
    wrapper = createWrapper()

    const error = new Error('bank query failed')
    apolloState.queryError.value = error
    await nextTick()

    expect(logErrorSpy).toHaveBeenCalledWith('Ponder bank transaction query error:', error)
  })
})
