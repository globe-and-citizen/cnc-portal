import { mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { vi } from 'vitest'
import InvestorsTransactions from '../InvestorsTransactions.vue'

export const USDC_ADDRESS = '0xa3492d046095affe351cfac15de9b86425e235db'
export const INVESTOR_ADDRESS = '0x1111111111111111111111111111111111111111'
export const SAFE_ROUTER_ADDRESS = '0x2222222222222222222222222222222222222222'
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

export const {
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
  const mockInvestorSymbolData = { value: 'SHER' as unknown }
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

export const buildInvestorResult = () => ({
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

export const buildSafeResult = () => ({
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

export const createWrapper = (): VueWrapper =>
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

export const triggerVModelUpdate = (
  wrapper: VueWrapper,
  selector: string,
  value: unknown
): boolean => {
  const element = wrapper.get(selector).element as HTMLElement & {
    __vueParentComponent?: {
      vnode?: { props?: Record<string, unknown> }
      parent?: unknown
    }
  }

  let component = element.__vueParentComponent as
    | {
        vnode?: { props?: Record<string, unknown> }
        parent?: unknown
      }
    | undefined

  while (component) {
    const handler = component.vnode?.props?.['onUpdate:modelValue']

    if (typeof handler === 'function') {
      ;(handler as (payload: unknown) => void)(value)
      return true
    }

    if (Array.isArray(handler)) {
      handler.forEach((fn) => {
        if (typeof fn === 'function') fn(value)
      })
      return true
    }

    component = component.parent as typeof component
  }

  return false
}

export const setupDefaultState = () => {
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
}
