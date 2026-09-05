import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { log } from '@/lib/logging'
import { useTeamStore } from '@/stores'
import { useCurrencyStore } from '@/stores/currencyStore'
import { mockInvestorReads } from '@/tests/mocks'

// Auto-imported @nuxt/ui components bypass `config.global.stubs` because the
// Nuxt UI Vite plugin resolves them through their file path. Mocking the
// module ensures our stub is actually rendered so we can inspect props
// instead of reaching into `wrapper.vm`.
vi.mock('@nuxt/ui/components/Table.vue', () => ({
  default: {
    name: 'UTable',
    props: ['data', 'columns', 'loading'],
    template: '<div data-test="investor-table"></div>'
  }
}))

import {
  buildInvestorResult,
  buildSafeResult,
  createWrapper,
  INVESTOR_ADDRESS,
  SAFE_ROUTER_ADDRESS,
  USDC_ADDRESS,
  ZERO_ADDRESS
} from './InvestorsTransaction.fixture'

type AdvancedRow = {
  txHash: string
  amount: string
  amountUSD: number
  type: string
  token: string
}

const tableData = (wrapper: VueWrapper) =>
  wrapper.findComponent({ name: 'UTable' }).props('data') as AdvancedRow[]

const {
  eventFeedState,
  capture,
  mockGetTokenPrice,
  mockInvestorSymbolData,
  mockGetContractAddressByType
} = vi.hoisted(() => {
  const eventFeedState = {
    investorResult: null as unknown as { value: unknown },
    investorError: null as unknown as { value: Error | null },
    investorLoading: null as unknown as { value: boolean },
    safeResult: null as unknown as { value: unknown },
    safeError: null as unknown as { value: Error | null },
    safeLoading: null as unknown as { value: boolean }
  }
  // Records the address ref passed to each getLogs composable.
  const capture = {
    investor: null as unknown as { value: string },
    safe: null as unknown as { value: string }
  }
  const mockGetTokenPrice = vi.fn(() => 1)
  const mockInvestorSymbolData = { value: 'SHER' }
  const mockGetContractAddressByType = vi.fn((type: string) => {
    if (type === 'InvestorV1') return INVESTOR_ADDRESS
    if (type === 'SafeDepositRouter') return SAFE_ROUTER_ADDRESS
    return null
  })
  return {
    eventFeedState,
    capture,
    mockGetTokenPrice,
    mockInvestorSymbolData,
    mockGetContractAddressByType
  }
})

vi.mock('@/composables/investor/useInvestorEventsViaLogs', async () => {
  const { ref } = await import('vue')
  eventFeedState.investorResult = ref()
  eventFeedState.investorError = ref<Error | null>(null)
  eventFeedState.investorLoading = ref(false)
  return {
    useInvestorEventsViaLogs: (addr: { value: string }) => {
      capture.investor = addr
      return {
        result: eventFeedState.investorResult,
        error: eventFeedState.investorError,
        loading: eventFeedState.investorLoading
      }
    }
  }
})

vi.mock('@/composables/investor/useSafeDepositRouterEventsViaLogs', async () => {
  const { ref } = await import('vue')
  eventFeedState.safeResult = ref()
  eventFeedState.safeError = ref<Error | null>(null)
  eventFeedState.safeLoading = ref(false)
  return {
    useSafeDepositRouterEventsViaLogs: (addr: { value: string }) => {
      capture.safe = addr
      return {
        result: eventFeedState.safeResult,
        error: eventFeedState.safeError,
        loading: eventFeedState.safeLoading
      }
    }
  }
})

describe('InvestorsTransactions advanced', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    vi.clearAllMocks()
    eventFeedState.investorResult.value = buildInvestorResult()
    eventFeedState.investorError.value = null
    eventFeedState.investorLoading.value = false
    eventFeedState.safeResult.value = buildSafeResult()
    eventFeedState.safeError.value = null
    eventFeedState.safeLoading.value = false
    mockGetTokenPrice.mockReturnValue(1)
    mockInvestorSymbolData.value = 'SHER'
    mockInvestorReads.symbol.data.value = 'SHER'
    mockGetContractAddressByType.mockImplementation((type: string) => {
      if (type === 'InvestorV1') return INVESTOR_ADDRESS
      if (type === 'SafeDepositRouter') return SAFE_ROUTER_ADDRESS
      return null
    })
    vi.mocked(useTeamStore).mockReturnValue({
      getContractAddressByType: mockGetContractAddressByType,
      getInvestorAddress: () =>
        mockGetContractAddressByType('Investor') || mockGetContractAddressByType('InvestorV1')
    } as never)
    vi.mocked(useCurrencyStore).mockReturnValue({
      localCurrency: { code: 'USD' },
      supportedTokens: [{ id: 'usdc', symbol: 'USDC', address: USDC_ADDRESS }],
      getTokenPrice: mockGetTokenPrice
    } as never)
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })

  it('uses fallback defaults when addresses are missing', () => {
    mockGetContractAddressByType.mockReturnValue(null)
    wrapper = createWrapper()
    // The getLogs composables receive the address computeds, which fall back to
    // '' when no contract is deployed (the composable then stays disabled).
    expect(capture.investor.value).toBe('')
    expect(capture.safe.value).toBe('')
  })

  it('handles parse failures and usd price fallbacks', () => {
    mockGetTokenPrice.mockReturnValue(0)
    eventFeedState.safeResult.value = {
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
    const data = tableData(wrapper)
    const usdcRow = data.find((row) => row.txHash === '0xusdcdeposit')
    const nativeRow = data.find((row) => row.txHash === '0xnativedeposit')
    expect(usdcRow?.amountUSD).toBe(5)
    expect(nativeRow?.amount).toBe('0')
    expect(nativeRow?.amountUSD).toBe(0)
  })

  it('falls back to SHER symbol when investor symbol is not a string', () => {
    mockInvestorSymbolData.value = { unexpected: true } as unknown as string
    wrapper = createWrapper()
    expect(tableData(wrapper).find((row) => row.type === 'mint')?.token).toBe('SHER')
  })

  it('logs investor and safe router query errors once per unique message', async () => {
    const logErrorSpy = vi.spyOn(log, 'error')
    wrapper = createWrapper()
    const investorQueryError = new Error('investor query failed')
    eventFeedState.investorError.value = investorQueryError
    await nextTick()
    expect(logErrorSpy).toHaveBeenCalledWith(
      'RPC log investor transaction query error:',
      investorQueryError
    )

    const safeQueryError = new Error('safe router query failed')
    eventFeedState.safeError.value = safeQueryError
    await nextTick()
    expect(logErrorSpy).toHaveBeenCalledWith(
      'RPC log safe deposit router transaction query error:',
      safeQueryError
    )

    eventFeedState.investorError.value = null
    eventFeedState.safeError.value = null
    await nextTick()
    eventFeedState.investorError.value = new Error('investor query failed')
    eventFeedState.safeError.value = new Error('safe router query failed')
    await nextTick()
    expect(
      logErrorSpy.mock.calls.filter(
        ([message]) => message === 'RPC log investor transaction query error:'
      )
    ).toHaveLength(3)
    expect(
      logErrorSpy.mock.calls.filter(
        ([message]) => message === 'RPC log safe deposit router transaction query error:'
      )
    ).toHaveLength(2)
  })
})
