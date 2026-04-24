import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import * as utils from '@/utils'
import InvestorsTransactions from '../InvestorsTransactions.vue'

const USDC_ADDRESS = '0xa3492d046095affe351cfac15de9b86425e235db'
const INVESTOR_ADDRESS = '0x1111111111111111111111111111111111111111'
const SAFE_ROUTER_ADDRESS = '0x2222222222222222222222222222222222222222'

const { apolloState, mockUseQuery, mockGetTokenPrice, mockInvestorSymbolData } = vi.hoisted(() => {
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

  return {
    apolloState,
    mockUseQuery,
    mockGetTokenPrice,
    mockInvestorSymbolData
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
    getContractAddressByType: vi.fn((type: string) => {
      if (type === 'InvestorV1') return INVESTOR_ADDRESS
      if (type === 'SafeDepositRouter') return SAFE_ROUTER_ADDRESS
      return null
    })
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

  it('logs investor and safe router query errors', async () => {
    const logErrorSpy = vi.spyOn(utils.log, 'error')
    wrapper = createWrapper()

    const investorQueryError = new Error('investor query failed')
    apolloState.investorError.value = investorQueryError
    await nextTick()
    expect(logErrorSpy).toHaveBeenCalledWith(
      'Ponder investor transaction query error:',
      investorQueryError
    )

    const safeQueryError = new Error('safe router query failed')
    apolloState.safeError.value = safeQueryError
    await nextTick()
    expect(logErrorSpy).toHaveBeenCalledWith(
      'Ponder safe deposit router transaction query error:',
      safeQueryError
    )
  })
})
