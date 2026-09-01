import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, type Ref } from 'vue'
import type { Address } from 'viem'
import { SUPPORTED_TOKENS } from '@/constant'
import { useQueryFn } from '@/tests/mocks/composables.mock'
import { mockWagmiCore } from '@/tests/mocks/wagmi.vue.mock'
import type { RawTokenBalances } from '@/lib/balances/tokenBalances'
import type { Team } from '@/types'

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

  beforeEach(() => {
    vi.clearAllMocks()
    queryData = ref<Record<string, RawTokenBalances> | undefined>(undefined)
    queryIsLoading = ref(false)
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
      { addresses: [BANK, SAFE], chainId: 1 }
    ])

    mockWagmiCore.getBalance.mockResolvedValue({ value: 0n })
    mockWagmiCore.readContract.mockResolvedValue(0n)
    await captured.queryFn()

    expect(mockWagmiCore.getBalance).toHaveBeenCalledTimes(2)
    expect(mockWagmiCore.readContract).toHaveBeenCalledTimes(
      2 * SUPPORTED_TOKENS.filter((token) => token.id !== 'native').length
    )
  })

  it('keeps loading, unavailable, and read-zero states distinct for each card', () => {
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

  it('keeps a failed account out of the grouped result without discarding successful peers', async () => {
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
})
