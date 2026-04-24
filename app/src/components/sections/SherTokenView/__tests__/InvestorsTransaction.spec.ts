import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import InvestorsTransactions from '../InvestorsTransactions.vue'

const USDC_ADDRESS = '0xa3492d046095affe351cfac15de9b86425e235db'
const INVESTOR_ADDRESS = '0x1111111111111111111111111111111111111111'
const SAFE_ROUTER_ADDRESS = '0x2222222222222222222222222222222222222222'
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

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
  template: '<div data-test="investor-table"></div>'
})

const USelectStub = defineComponent({
  name: 'USelect',
  props: {
    modelValue: { type: String, required: false },
    items: { type: Array, required: false }
  },
  emits: ['update:modelValue'],
  template: '<div data-test="investor-type-filter"></div>'
})

const CustomDatePickerStub = defineComponent({
  name: 'CustomDatePicker',
  props: {
    modelValue: { type: Array, required: false }
  },
  emits: ['update:modelValue'],
  template: '<div data-test="investor-date-filter"></div>'
})

const AddressToolTipStub = defineComponent({
  name: 'AddressToolTip',
  template: '<div />'
})

const UBadgeStub = defineComponent({
  name: 'UBadge',
  template: '<span><slot /></span>'
})

const buildInvestorResult = () => ({
  investorMints: {
    items: [
      {
        id: '0xminttx-0',
        contractAddress: INVESTOR_ADDRESS,
        shareholder: '0x3333333333333333333333333333333333333333',
        amount: '1000000',
        timestamp: 1_700_000_000
      }
    ]
  },
  investorDividendDistributeds: { items: [] },
  investorDividendPaids: { items: [] },
  investorDividendPaymentFaileds: { items: [] }
})

const buildSafeResult = () => ({
  safeDeposits: {
    items: [
      {
        id: '0xsafedeposit-0',
        contractAddress: SAFE_ROUTER_ADDRESS,
        depositor: '0x4444444444444444444444444444444444444444',
        token: USDC_ADDRESS,
        tokenAmount: '5000000',
        sherAmount: '0',
        timestamp: 1_700_000_100
      }
    ]
  },
  safeDepositsEnableds: { items: [] },
  safeDepositsDisableds: { items: [] },
  safeAddressUpdateds: { items: [] },
  safeMultiplierUpdateds: {
    items: [
      {
        id: '0xmultiplier-0',
        contractAddress: SAFE_ROUTER_ADDRESS,
        oldMultiplier: '1000000',
        newMultiplier: '1500000',
        timestamp: 1_700_000_200
      }
    ]
  }
})

const createWrapper = (): VueWrapper =>
  mount(InvestorsTransactions, {
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

describe('InvestorsTransactions', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetContractAddressByType.mockImplementation((type: string) => {
      if (type === 'InvestorV1') return INVESTOR_ADDRESS
      if (type === 'SafeDepositRouter') return SAFE_ROUTER_ADDRESS
      return null
    })

    apolloState.investorResult.value = buildInvestorResult()
    apolloState.investorError.value = null
    apolloState.investorLoading.value = false

    apolloState.safeResult.value = buildSafeResult()
    apolloState.safeError.value = null
    apolloState.safeLoading.value = false

    mockGetTokenPrice.mockReturnValue(1)
    mockInvestorSymbolData.value = 'SHER'

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

    const vm = wrapper.vm as unknown as {
      displayedTransactions: Array<{ type: string; token: string }>
      columns: Array<{ header: string }>
    }

    expect(vm.displayedTransactions).toHaveLength(3)
    expect(vm.displayedTransactions.map((row) => row.type)).toEqual(
      expect.arrayContaining(['mint', 'safeDeposit', 'safeMultiplierUpdated'])
    )
    expect(vm.displayedTransactions.find((row) => row.type === 'mint')?.token).toBe('SHER')
    expect(
      vm.displayedTransactions.find((row) => row.type === 'safeMultiplierUpdated')?.token
    ).toBe('x')
    expect(vm.columns.at(-1)?.header).toBe('Value (USD)')
  })

  it('passes loading from investor query to table', () => {
    apolloState.investorLoading.value = true
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

    vm.selectedType = 'safeDeposit'
    await nextTick()

    expect(vm.displayedTransactions).toHaveLength(1)
    expect(vm.displayedTransactions[0]?.type).toBe('safeDeposit')
  })

  it('filters rows by date range', async () => {
    wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      dateRange: [Date, Date] | null
      displayedTransactions: Array<{ type: string }>
    }

    vm.dateRange = [new Date('2020-01-01T00:00:00Z'), new Date('2020-01-01T23:59:59Z')]
    await nextTick()

    expect(vm.displayedTransactions).toHaveLength(0)
  })

  it('uses fallback defaults when addresses are missing', () => {
    mockGetContractAddressByType.mockReturnValue(null)
    wrapper = createWrapper()

    const [investorCall, safeCall] = mockUseQuery.mock.calls
    const investorVariables = investorCall?.[1] as { contractAddress: { value: string } }
    const investorOptions = investorCall?.[2] as { enabled: { value: boolean } }
    const safeVariables = safeCall?.[1] as { contractAddress: { value: string } }
    const safeOptions = safeCall?.[2] as { enabled: { value: boolean } }

    expect(investorVariables.contractAddress.value).toBe('')
    expect(investorOptions.enabled.value).toBe(false)
    expect(safeVariables.contractAddress.value).toBe('')
    expect(safeOptions.enabled.value).toBe(false)
  })

  it('handles parse failures and usd price fallbacks', () => {
    mockGetTokenPrice.mockReturnValue(0)
    apolloState.safeResult.value = {
      safeDeposits: {
        items: [
          {
            id: '0xusdcdeposit-0',
            contractAddress: SAFE_ROUTER_ADDRESS,
            depositor: '0x4444444444444444444444444444444444444444',
            token: USDC_ADDRESS,
            tokenAmount: '5000000',
            sherAmount: '0',
            timestamp: 1_700_000_300
          },
          {
            id: '0xnativedeposit-0',
            contractAddress: SAFE_ROUTER_ADDRESS,
            depositor: '0x5555555555555555555555555555555555555555',
            token: ZERO_ADDRESS,
            tokenAmount: 'not-a-number',
            sherAmount: '0',
            timestamp: 1_700_000_400
          }
        ]
      },
      safeDepositsEnableds: { items: [] },
      safeDepositsDisableds: { items: [] },
      safeAddressUpdateds: { items: [] },
      safeMultiplierUpdateds: { items: [] }
    }

    wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      displayedTransactions: Array<{ txHash: string; amount: string; amountUSD: number }>
    }

    const usdcRow = vm.displayedTransactions.find((row) => row.txHash === '0xusdcdeposit')
    const nativeRow = vm.displayedTransactions.find((row) => row.txHash === '0xnativedeposit')

    expect(usdcRow?.amountUSD).toBe(5)
    expect(nativeRow?.amount).toBe('0')
    expect(nativeRow?.amountUSD).toBe(0)
  })

  it('falls back to SHER symbol when investor symbol is not a string', () => {
    mockInvestorSymbolData.value = { unexpected: true } as unknown as string
    wrapper = createWrapper()

    const vm = wrapper.vm as unknown as {
      displayedTransactions: Array<{ type: string; token: string }>
    }

    expect(vm.displayedTransactions.find((row) => row.type === 'mint')?.token).toBe('SHER')
  })
})
