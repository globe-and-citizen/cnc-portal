import { describe, it, expect, vi } from 'vitest'
import { ref, toValue } from 'vue'

/**
 * Verifies the migration wiring of `useCNCAccounting` (issue #2456): the on-chain
 * feeds must be handed one scan target per contract generation, each tagged with
 * its deploy block, built from the shared Officer-history endpoint. The feeds are
 * mocked to capture the targets they receive rather than touch the RPC.
 */
const { captured, feed } = vi.hoisted(() => {
  const captured: Record<string, unknown> = {}
  const feed = (key: string) => (arg: unknown) => {
    captured[key] = arg
    return {
      result: { value: null },
      gaps: { value: [] },
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

import { useGetTeamQuery } from '@/queries/team.queries'
import { useGetTeamOfficersQuery } from '@/queries/contract.queries'
import { useCNCAccounting } from '../useCNCAccounting'

const OLD_BANK = '0x1111111111111111111111111111111111111111'
const NEW_BANK = '0x2222222222222222222222222222222222222222'
const SAFE = '0x3333333333333333333333333333333333333333'
const OWNER = '0x0000000000000000000000000000000000000001'

const contract = (address: string, type = 'Bank') => ({
  address,
  type,
  deployer: address,
  admins: []
})

const setTeam = (teamContracts: unknown[]) =>
  vi.mocked(useGetTeamQuery).mockReturnValue({
    data: ref({ id: '1', ownerAddress: OWNER, teamContracts }),
    isLoading: ref(false),
    error: ref(null),
    refetch: vi.fn().mockResolvedValue(undefined)
  } as unknown as ReturnType<typeof useGetTeamQuery>)

const setOfficers = (officers: unknown[]) =>
  vi.mocked(useGetTeamOfficersQuery).mockReturnValue({
    data: ref(officers),
    isPending: ref(false),
    isError: ref(false),
    refetch: vi.fn()
  } as unknown as ReturnType<typeof useGetTeamOfficersQuery>)

describe('useCNCAccounting — contract migration', () => {
  it('scans every Bank generation from its own deploy block', () => {
    setTeam([contract(NEW_BANK), contract(SAFE, 'Safe')])
    setOfficers([
      { deployBlockNumber: '100', contracts: [contract(OLD_BANK)] },
      { deployBlockNumber: '200', contracts: [contract(NEW_BANK)] }
    ])

    useCNCAccounting('1')

    expect(toValue(captured.bank)).toEqual([
      { address: OLD_BANK, fromBlock: 100n },
      { address: NEW_BANK, fromBlock: 200n }
    ])
  })

  it('falls back to the current contracts with no boundary when there is no Officer history', () => {
    setTeam([contract(NEW_BANK)])
    setOfficers([])

    useCNCAccounting('1')

    expect(toValue(captured.bank)).toEqual([{ address: NEW_BANK, fromBlock: undefined }])
  })
})
