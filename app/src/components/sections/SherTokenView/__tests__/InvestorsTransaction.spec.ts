import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import {
  buildInvestorResult,
  buildSafeResult,
  createWrapper,
  INVESTOR_ADDRESS,
  SAFE_ROUTER_ADDRESS,
  USDC_ADDRESS
} from './InvestorsTransaction.fixture'

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

const emitModelUpdateThroughVNode = (
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
    component = component.parent as typeof component
  }

  return false
}

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
    mockGetContractAddressByType.mockImplementation((type: string) => {
      if (type === 'InvestorV1') return INVESTOR_ADDRESS
      if (type === 'SafeDepositRouter') return SAFE_ROUTER_ADDRESS
      return null
    })
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
      displayedTransactions: Array<{ type: string }>
    }
    expect(emitModelUpdateThroughVNode(wrapper, 'select[aria-hidden="true"]', 'safeDeposit')).toBe(
      true
    )
    await nextTick()
    expect(vm.displayedTransactions).toHaveLength(1)
    expect(vm.displayedTransactions[0]?.type).toBe('safeDeposit')
  })

  it('filters rows by date range', async () => {
    wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      displayedTransactions: Array<{ type: string }>
    }
    wrapper
      .getComponent('[data-test="investor-date-filter"]')
      .vm.$emit('update:modelValue', [
        new Date('2020-01-01T00:00:00Z'),
        new Date('2020-01-01T23:59:59Z')
      ])
    await nextTick()
    expect(vm.displayedTransactions).toHaveLength(0)
  })
})
