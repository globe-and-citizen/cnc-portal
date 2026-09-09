import { beforeEach, describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { useGetTeamQuery } from '@/queries/team.queries'
import { mockTeamData } from '@/tests/mocks'

// The on-chain feeds come from the `use*EventsViaLogs` composables. Mock each
// to an empty, non-loading result — the same
// pattern the *Transactions.vue specs use — so this spec exercises the assembly
// logic without touching the RPC. `refetch` resolves so the refresh test passes.
const { feeds } = vi.hoisted(() => {
  const feed = () => ({
    result: { value: null },
    gaps: { value: [] as Array<{ address: string; error: unknown }> },
    timestampGaps: {
      value: [] as Array<{
        transactionHash: string | null
        blockNumber: bigint | null
        reason: 'missing-block-number' | 'block-unavailable'
      }>
    },
    loading: { value: false },
    error: { value: null as unknown },
    refetch: vi.fn().mockResolvedValue(undefined)
  })
  return {
    feeds: {
      bank: feed(),
      payroll: feed(),
      expense: feed(),
      credit: feed(),
      investor: feed(),
      vesting: feed(),
      router: feed()
    }
  }
})
vi.mock('@/composables/bank/useBankEventsViaLogs', () => ({
  useBankEventsViaLogs: () => feeds.bank
}))
vi.mock('@/composables/cashRemuneration/useCashRemunerationEventsViaLogs', () => ({
  useCashRemunerationEventsViaLogs: () => feeds.payroll
}))
vi.mock('@/composables/expense/useExpenseEventsViaLogs', () => ({
  useExpenseEventsViaLogs: () => feeds.expense
}))
vi.mock('@/composables/fixedReturn/useFixedReturnEventsViaLogs', () => ({
  useFixedReturnEventsViaLogs: () => feeds.credit
}))
vi.mock('@/composables/investor/useInvestorEventsViaLogs', () => ({
  useInvestorEventsViaLogs: () => feeds.investor
}))
vi.mock('@/composables/vesting/useVestingEventsViaLogs', () => ({
  useVestingEventsViaLogs: () => feeds.vesting
}))
vi.mock('@/composables/investor/useSafeDepositRouterEventsViaLogs', () => ({
  useSafeDepositRouterEventsViaLogs: () => feeds.router
}))

import { useCNCAccounting } from '../useCNCAccounting'

// Relies on the global mocks (tests/setup/composables.setup.ts):
//   • `useGetTeamQuery` → `mockTeamData` (one InvestorV1 pocket, an owner address)
//   • the on-chain feeds → the empty getLogs mocks above (no on-chain events)
//   • the backend query hooks → mock responses (weekly claims may yield accruals)
// So the composable assembles a valid journal for team "1".

describe('useCNCAccounting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.values(feeds).forEach((feed) => {
      feed.result.value = null
      feed.gaps.value = []
      feed.timestampGaps.value = []
      feed.loading.value = false
      feed.error.value = null
    })
    vi.mocked(useGetTeamQuery).mockReturnValue({
      data: ref(mockTeamData),
      isLoading: ref(false),
      isPending: ref(false),
      error: ref(null),
      refetch: vi.fn().mockResolvedValue(undefined)
    } as unknown as ReturnType<typeof useGetTeamQuery>)
  })

  it('exposes the canonical journal without parallel source or report state', () => {
    const acc = useCNCAccounting('1')

    // Every posting is balanced by construction, so the books balance regardless
    // of whether the mocked feeds produce any entries (e.g. payroll accruals).
    expect(acc).not.toHaveProperty('entries')
    expect(acc).not.toHaveProperty('accountRegistry')
    expect(acc).not.toHaveProperty('reports')
    expect(Array.isArray(acc.journal.value)).toBe(true)
  })

  it('reports ready books when every applicable source is available', () => {
    const { status } = useCNCAccounting('1')
    expect(status.isLoading.value).toBe(false)
    expect(status.state.value).toBe('ready')
    expect(status.diagnostics.value).toEqual([])
  })

  it('marks the journal partial when a contract generation scan fails', () => {
    vi.mocked(useGetTeamQuery).mockReturnValue({
      data: ref({
        ...mockTeamData,
        teamContracts: [
          {
            address: '0x1111111111111111111111111111111111111111',
            type: 'Bank',
            deployer: '0x1111111111111111111111111111111111111111',
            admins: []
          }
        ]
      }),
      isLoading: ref(false),
      isPending: ref(false),
      error: ref(null),
      refetch: vi.fn()
    } as unknown as ReturnType<typeof useGetTeamQuery>)
    feeds.bank.gaps.value = [
      { address: '0x1111111111111111111111111111111111111111', error: new Error('RPC') }
    ]

    const { status } = useCNCAccounting('1')

    expect(status.state.value).toBe('partial')
    expect(status.diagnostics.value).toContainEqual({
      kind: 'source-scan-failed',
      source: 'bank-events',
      address: '0x1111111111111111111111111111111111111111'
    })
  })

  it('withholds an unresolved block timestamp as a typed partial-history diagnostic', () => {
    vi.mocked(useGetTeamQuery).mockReturnValue({
      data: ref({
        ...mockTeamData,
        teamContracts: [
          {
            address: '0x1111111111111111111111111111111111111111',
            type: 'Bank',
            deployer: '0x1111111111111111111111111111111111111111',
            admins: []
          }
        ]
      }),
      isLoading: ref(false),
      isPending: ref(false),
      error: ref(null),
      refetch: vi.fn()
    } as unknown as ReturnType<typeof useGetTeamQuery>)
    feeds.bank.timestampGaps.value = [
      {
        transactionHash: `0x${'a'.repeat(64)}`,
        blockNumber: 42n,
        reason: 'block-unavailable'
      }
    ]

    const { status } = useCNCAccounting('1')

    expect(status.state.value).toBe('partial')
    expect(status.diagnostics.value).toContainEqual({
      kind: 'block-timestamp-unavailable',
      source: 'bank-events',
      txHash: `0x${'a'.repeat(64)}`,
      blockNumber: '42'
    })
  })

  it('keeps reports loading while an applicable source is pending', () => {
    vi.mocked(useGetTeamQuery).mockReturnValue({
      data: ref({
        ...mockTeamData,
        teamContracts: [
          {
            address: '0x1111111111111111111111111111111111111111',
            type: 'Bank',
            deployer: '0x1111111111111111111111111111111111111111',
            admins: []
          }
        ]
      }),
      isLoading: ref(false),
      isPending: ref(false),
      error: ref(null),
      refetch: vi.fn()
    } as unknown as ReturnType<typeof useGetTeamQuery>)
    feeds.bank.loading.value = true

    const { status } = useCNCAccounting('1')

    expect(status.state.value).toBe('loading')
    expect(status.isLoading.value).toBe(true)
  })

  it('marks a company query failure as fatal', () => {
    vi.mocked(useGetTeamQuery).mockReturnValue({
      data: ref(undefined),
      isLoading: ref(false),
      isPending: ref(false),
      error: ref(new Error('company unavailable')),
      refetch: vi.fn()
    } as unknown as ReturnType<typeof useGetTeamQuery>)

    const { status } = useCNCAccounting('1')

    expect(status.state.value).toBe('failed')
    expect(status.diagnostics.value).toContainEqual({
      kind: 'source-unavailable',
      source: 'company'
    })
  })

  it('refetches every underlying query without throwing', async () => {
    const { refetch } = useCNCAccounting('1')
    await expect(refetch()).resolves.toBeDefined()
  })

  it('degrades gracefully when the team id is null (no contracts)', () => {
    const acc = useCNCAccounting(null)
    expect(Array.isArray(acc.journal.value)).toBe(true)
  })
})
