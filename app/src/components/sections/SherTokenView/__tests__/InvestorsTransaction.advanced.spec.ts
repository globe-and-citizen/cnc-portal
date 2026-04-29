import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import * as utils from '@/utils'
import {
  buildInvestorResult,
  buildSafeResult,
  createWrapper,
  INVESTOR_ADDRESS,
  SAFE_ROUTER_ADDRESS,
  USDC_ADDRESS,
  ZERO_ADDRESS
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

describe('InvestorsTransactions advanced', () => {
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

  it('logs investor and safe router query errors once per unique message', async () => {
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

    apolloState.investorError.value = null
    apolloState.safeError.value = null
    await nextTick()
    apolloState.investorError.value = new Error('investor query failed')
    apolloState.safeError.value = new Error('safe router query failed')
    await nextTick()
    expect(
      logErrorSpy.mock.calls.filter(
        ([message]) => message === 'Ponder investor transaction query error:'
      )
    ).toHaveLength(1)
    expect(
      logErrorSpy.mock.calls.filter(
        ([message]) => message === 'Ponder safe deposit router transaction query error:'
      )
    ).toHaveLength(1)
  })
})
