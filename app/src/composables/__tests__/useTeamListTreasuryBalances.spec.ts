import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive, ref, toValue, type Ref } from 'vue'
import type { Address } from 'viem'
import { SUPPORTED_TOKENS } from '@/constant'
import { useQueriesFn, useQueryFn } from '@/tests/mocks/composables.mock'
import { mockWagmiCore } from '@/tests/mocks/wagmi.vue.mock'
import type { RawTokenBalances } from '@/lib/balances/tokenBalances'
import type { Team } from '@/types'
import type { SafeClientBalances } from '@/types/safe'
import { useCurrencyStore } from '@/stores'

vi.unmock('@/composables/useTeamListTreasuryBalances')

import { useTeamListTreasuryBalances } from '@/composables/useTeamListTreasuryBalances'

const BANK = '0x1111111111111111111111111111111111111111' as Address
const SAFE = '0x2222222222222222222222222222222222222222' as Address

type CapturedConfig = {
  queryKey: Ref<readonly unknown[]>
  enabled: Ref<boolean>
  queryFn: () => Promise<Record<string, RawTokenBalances>>
}

const makeTeam = (id: string, addresses: Address[]): Team =>
  ({
    id,
    name: `Company ${id}`,
    slug: `company-${id}`,
    description: '',
    isHidden: false,
    isArchived: false,
    members: [],
    ownerAddress: BANK,
    teamContracts: addresses.map((address, index) => ({
      type: index === 0 ? 'Bank' : 'Safe',
      address
    }))
  }) as Team

describe('useTeamListTreasuryBalances', () => {
  let captured: CapturedConfig
  let queryData: Ref<Record<string, RawTokenBalances> | undefined>
  let queryIsLoading: Ref<boolean>
  let safeResults: Ref<{ data?: SafeClientBalances; isLoading: boolean }[]>
  const currency = reactive({ code: 'USD' })

  beforeEach(() => {
    vi.clearAllMocks()
    queryData = ref<Record<string, RawTokenBalances> | undefined>(undefined)
    queryIsLoading = ref(false)
    currency.code = 'USD'
    safeResults = ref([{ data: undefined, isLoading: false }])
    useQueriesFn.mockReturnValue(safeResults as never)
    vi.mocked(useCurrencyStore).mockReturnValue({
      localCurrency: currency,
      getTokenInfo: () => ({
        prices: [
          {
            id: 'local',
            price: currency.code === 'EUR' ? 0.8 : 1,
            code: currency.code,
            symbol: '$'
          },
          { id: 'usd', price: 1, code: 'USD', symbol: '$' }
        ]
      })
    } as never)
    useQueryFn.mockImplementation((config: unknown) => {
      captured = config as CapturedConfig
      return {
        data: queryData,
        isLoading: queryIsLoading
      }
    })
  })

  it('uses one query for the unique treasury addresses on the visible list', async () => {
    useTeamListTreasuryBalances(ref([makeTeam('1', [BANK, SAFE]), makeTeam('2', [BANK])]))

    expect(useQueryFn).toHaveBeenCalledTimes(1)
    expect(captured.enabled.value).toBe(true)
    expect(captured.queryKey.value).toEqual([
      'balance',
      'team-list',
      { addresses: [BANK], chainId: 1 }
    ])

    mockWagmiCore.getBalance.mockResolvedValue({ value: 0n })
    mockWagmiCore.readContract.mockResolvedValue(0n)
    await captured.queryFn()

    expect(mockWagmiCore.getBalance).toHaveBeenCalledTimes(1)
    expect(mockWagmiCore.readContract).toHaveBeenCalledTimes(
      SUPPORTED_TOKENS.filter((token) => token.id !== 'native').length
    )
  })

  it('[AC-US-COMPANIES-003-11] keeps loading, unavailable, and read-zero states distinct for each card', () => {
    const { treasuryByTeamId } = useTeamListTreasuryBalances(ref([makeTeam('1', [BANK])]))

    expect(treasuryByTeamId.value['1']?.state).toBe('unavailable')

    queryIsLoading.value = true
    expect(treasuryByTeamId.value['1']?.state).toBe('loading')

    queryIsLoading.value = false
    queryData.value = { [BANK.toLowerCase()]: {} }

    expect(treasuryByTeamId.value['1']).toMatchObject({
      state: 'ready',
      formattedTotal: '$0.00',
      accountShares: []
    })
  })

  it('[AC-US-COMPANIES-003-12] keeps a failed account out without discarding successful peers', async () => {
    useTeamListTreasuryBalances(ref([makeTeam('1', [BANK, SAFE])]))
    mockWagmiCore.getBalance.mockImplementation(async (_, { address }) => {
      if (address === SAFE) throw new Error('read failed')
      return { value: 0n }
    })
    mockWagmiCore.readContract.mockResolvedValue(0n)

    const result = await captured.queryFn()

    expect(result).toHaveProperty(BANK.toLowerCase())
    expect(result).not.toHaveProperty(SAFE.toLowerCase())
  })

  it('includes all Safe-valued tokens and shares the fiat-aware Gateway cache', () => {
    const { treasuryByTeamId } = useTeamListTreasuryBalances(
      ref([makeTeam('1', [BANK, SAFE]), makeTeam('2', [BANK, SAFE])])
    )
    queryData.value = { [BANK]: { usdc: 500000n } }
    safeResults.value = [{ data: { fiatTotal: '1.3203', items: [] }, isLoading: false }]

    expect(treasuryByTeamId.value['1']?.formattedTotal).toBe('$1.82')
    expect(treasuryByTeamId.value['2']?.formattedTotal).toBe('$1.82')
    expect(treasuryByTeamId.value['1']?.accountShares.map((share) => share.percentLabel)).toEqual([
      '27%',
      '73%'
    ])
    const queries = toValue(useQueriesFn.mock.calls[0]![0].queries)
    expect(queries).toHaveLength(1)
    expect(queries[0].queryKey).toContain('safe-client')
    expect(queries[0].queryKey.at(-1)).toBe('USD')
    expect(queries[0].refetchInterval).toBe(60000)

    currency.code = 'EUR'
    safeResults.value[0]!.data = { fiatTotal: '1.05624', items: [] }
    expect(toValue(useQueriesFn.mock.calls[0]![0].queries)[0].queryKey.at(-1)).toBe('EUR')
    expect(treasuryByTeamId.value['1']?.formattedTotal).toBe('€1.46')
  })

  it('loads only the card whose Safe is pending and keeps successful Bank reads on Safe failure', () => {
    const { treasuryByTeamId } = useTeamListTreasuryBalances(
      ref([makeTeam('1', [BANK, SAFE]), makeTeam('2', [BANK])])
    )
    queryData.value = { [BANK]: { usdc: 500000n } }
    safeResults.value[0]!.isLoading = true
    expect(treasuryByTeamId.value['1']?.state).toBe('loading')
    expect(treasuryByTeamId.value['2']?.formattedTotal).toBe('$0.50')

    safeResults.value[0]!.isLoading = false
    expect(treasuryByTeamId.value['1']?.formattedTotal).toBe('$0.50')
    expect(treasuryByTeamId.value['1']?.accountShares.map((share) => share.label)).toEqual(['Bank'])
  })
})
