import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import type { Address } from 'viem'
import CashRemunerationTransactions from '../CashRemunerationTransactions.vue'

const { apolloState, mockUseQuery, mockCurrencyStore, mockGetTokenPrice } = vi.hoisted(() => {
  const apolloState = {
    cashRemunerationQueryResult: null as unknown as { value: unknown },
    cashRemunerationQueryError: null as unknown as { value: Error | null },
    cashRemunerationQueryLoading: null as unknown as { value: boolean },
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

  return {
    apolloState,
    mockUseQuery,
    mockCurrencyStore,
    mockGetTokenPrice
  }
})

vi.mock('@vue/apollo-composable', async () => {
  const { ref } = await import('vue')
  apolloState.cashRemunerationQueryResult = ref()
  apolloState.cashRemunerationQueryError = ref<Error | null>(null)
  apolloState.cashRemunerationQueryLoading = ref(false)
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
      result: apolloState.cashRemunerationQueryResult,
      error: apolloState.cashRemunerationQueryError,
      loading: apolloState.cashRemunerationQueryLoading
    }
  })
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
  template: '<div data-test="cash-remuneration-table"></div>'
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

const CONTRACT_ADDRESS = '0x1111111111111111111111111111111111111111' as Address
const USDC_ADDRESS = '0xa3492d046095affe351cfac15de9b86425e235db'
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

const buildCashRemunerationQueryResult = () => ({
  cashRemunerationDeposits: {
    items: [
      {
        id: '0xdeposithash-0',
        contractAddress: CONTRACT_ADDRESS,
        depositor: '0x2222222222222222222222222222222222222222',
        amount: '1000000000000000000',
        timestamp: 1_700_000_000
      }
    ]
  },
  cashRemunerationWithdraws: {
    items: [
      {
        id: '0xwithdrawhash-0',
        contractAddress: CONTRACT_ADDRESS,
        withdrawer: '0x3333333333333333333333333333333333333333',
        amount: '2000000000000000000',
        timestamp: 1_700_000_100
      }
    ]
  },
  cashRemunerationWithdrawTokens: {
    items: []
  },
  cashRemunerationWageClaims: {
    items: []
  },
  cashRemunerationOwnerTreasuryWithdrawNatives: {
    items: []
  },
  cashRemunerationOwnerTreasuryWithdrawTokens: {
    items: []
  },
  cashRemunerationOfficerUpdateds: {
    items: []
  },
  cashRemunerationTokenSupportAddeds: {
    items: []
  },
  cashRemunerationTokenSupportRemoveds: {
    items: []
  }
})

const buildIncomingTransfersQueryResult = () => ({
  bankTokenTransfers: {
    items: [
      {
        id: '0xbankfundinghash-0',
        contractAddress: '0x9999999999999999999999999999999999999999',
        sender: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        to: CONTRACT_ADDRESS,
        token: USDC_ADDRESS,
        amount: '1000000',
        timestamp: 1_700_000_050
      }
    ]
  }
})

const createWrapper = (cashRemunerationAddress: Address = CONTRACT_ADDRESS): VueWrapper =>
  mount(CashRemunerationTransactions, {
    props: {
      cashRemunerationAddress
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

describe('CashRemunerationTransactions', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    vi.clearAllMocks()
    apolloState.cashRemunerationQueryResult.value = buildCashRemunerationQueryResult()
    apolloState.cashRemunerationQueryError.value = null
    apolloState.cashRemunerationQueryLoading.value = false
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
      expect.arrayContaining(['deposit', 'tokenDeposit', 'withdraw'])
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

  it('uses disabled query option when contract address is empty', () => {
    wrapper = createWrapper('' as Address)

    const cashQueryVariables = mockUseQuery.mock.calls[0]?.[1] as {
      contractAddress: { value: string }
    }

    const incomingQueryVariables = mockUseQuery.mock.calls[1]?.[1] as {
      toAddress: { value: string }
    }
    const incomingQueryOptions = mockUseQuery.mock.calls[1]?.[2] as { enabled: { value: boolean } }

    expect(cashQueryVariables.contractAddress.value).toBe('')

    expect(incomingQueryVariables.toAddress.value).toBe('')
    expect(incomingQueryOptions.enabled.value).toBe(false)
  })

  it('handles token resolution fallback and invalid amounts', () => {
    mockCurrencyStore.supportedTokens = []
    mockGetTokenPrice.mockImplementation((tokenId: string) => (tokenId === 'native' ? 3 : 0))
    apolloState.cashRemunerationQueryResult.value = {
      cashRemunerationDeposits: {
        items: [
          {
            id: '0xnativedeposit-0',
            contractAddress: CONTRACT_ADDRESS,
            depositor: '0x2222222222222222222222222222222222222222',
            amount: '1000000000000000000',
            timestamp: 1_700_000_500
          }
        ]
      },
      cashRemunerationWithdraws: { items: [] },
      cashRemunerationWithdrawTokens: {
        items: [
          {
            id: '0xunknowntx-0',
            contractAddress: CONTRACT_ADDRESS,
            withdrawer: '0x4444444444444444444444444444444444444444',
            tokenAddress: '0x9999999999999999999999999999999999999999',
            amount: 'not-a-number',
            timestamp: 1_700_000_600
          }
        ]
      },
      cashRemunerationWageClaims: { items: [] },
      cashRemunerationOwnerTreasuryWithdrawNatives: { items: [] },
      cashRemunerationOwnerTreasuryWithdrawTokens: { items: [] },
      cashRemunerationOfficerUpdateds: { items: [] },
      cashRemunerationTokenSupportAddeds: { items: [] },
      cashRemunerationTokenSupportRemoveds: { items: [] }
    }

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
})
