import { describe, it, expect, vi } from 'vitest'
import { ref, toValue } from 'vue'

/**
 * Verifies the migration wiring of `useCNCAccounting` (issue #2456): the on-chain
 * feeds must be handed one scan target per contract generation, each tagged with
 * its deploy block, so pre-migration transactions survive a redeploy. The feeds
 * are mocked to capture the targets they receive rather than touch the RPC.
 */
const { captured, feed } = vi.hoisted(() => {
  const captured: Record<string, unknown> = {}
  const feed = (key: string) => (arg: unknown) => {
    captured[key] = arg
    return {
      result: { value: null },
      loading: { value: false },
      error: { value: null },
      refetch: () => Promise.resolve()
    }
  }
  return { captured, feed }
})

vi.mock('@/composables/bank/useBankEventsViaLogs', () => ({ useBankEventsViaLogs: feed('bank') }))
vi.mock('@/composables/cashRemuneration/useCashRemunerationEventsViaLogs', () => ({
  useCashRemunerationEventsViaLogs: feed('cashRem')
}))
vi.mock('@/composables/expense/useExpenseEventsViaLogs', () => ({
  useExpenseEventsViaLogs: feed('expense')
}))
vi.mock('@/composables/fixedReturn/useFixedReturnEventsViaLogs', () => ({
  useFixedReturnEventsViaLogs: feed('fixedReturn')
}))
vi.mock('@/composables/investor/useInvestorEventsViaLogs', () => ({
  useInvestorEventsViaLogs: feed('investor')
}))
vi.mock('@/composables/investor/useSafeDepositRouterEventsViaLogs', () => ({
  useSafeDepositRouterEventsViaLogs: feed('router')
}))

import { useGetTeamWithHistoryQuery } from '@/queries/team.queries'
import { useCNCAccounting } from '../useCNCAccounting'

const OLD_BANK = '0x1111111111111111111111111111111111111111'
const NEW_BANK = '0x2222222222222222222222222222222222222222'
const OWNER = '0x0000000000000000000000000000000000000001'

const bankContract = (address: string) => ({ address, type: 'Bank', deployer: address, admins: [] })

const setTeam = (team: Record<string, unknown>) =>
  vi.mocked(useGetTeamWithHistoryQuery).mockReturnValue({
    data: ref(team),
    isLoading: ref(false),
    error: ref(null),
    refetch: vi.fn().mockResolvedValue(undefined),
    isFetched: ref(true),
    isPending: ref(false),
    isSuccess: ref(true)
  } as unknown as ReturnType<typeof useGetTeamWithHistoryQuery>)

describe('useCNCAccounting — contract migration', () => {
  it('scans every Bank generation from its own deploy block', () => {
    setTeam({
      id: '1',
      ownerAddress: OWNER,
      teamContracts: [bankContract(NEW_BANK)],
      contractHistory: [
        {
          officerAddress: '0x0a',
          deployBlockNumber: '100',
          deployedAt: null,
          contracts: [bankContract(OLD_BANK)]
        },
        {
          officerAddress: '0x0b',
          deployBlockNumber: '200',
          deployedAt: null,
          contracts: [bankContract(NEW_BANK)]
        }
      ]
    })

    useCNCAccounting('1')

    expect(toValue(captured.bank)).toEqual([
      { address: OLD_BANK, fromBlock: 100n },
      { address: NEW_BANK, fromBlock: 200n }
    ])
  })

  it('falls back to the current contracts with no boundary when history is absent', () => {
    setTeam({
      id: '1',
      ownerAddress: OWNER,
      teamContracts: [bankContract(NEW_BANK)]
    })

    useCNCAccounting('1')

    expect(toValue(captured.bank)).toEqual([{ address: NEW_BANK, fromBlock: undefined }])
  })
})
