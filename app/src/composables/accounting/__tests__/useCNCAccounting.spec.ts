import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'

// The on-chain feeds come from the `use*EventsViaLogs` composables. Mock each
// to an empty, non-loading result — the same
// pattern the *Transactions.vue specs use — so this spec exercises the assembly
// logic without touching the RPC. `refetch` resolves so the refresh test passes.
const emptyLogsFeed = () => ({
  result: ref(null),
  gaps: ref([]),
  loading: ref(false),
  error: ref(null),
  refetch: vi.fn().mockResolvedValue(undefined)
})
vi.mock('@/composables/bank/useBankEventsViaLogs', () => ({
  useBankEventsViaLogs: () => emptyLogsFeed()
}))
vi.mock('@/composables/cashRemuneration/useCashRemunerationEventsViaLogs', () => ({
  useCashRemunerationEventsViaLogs: () => emptyLogsFeed()
}))
vi.mock('@/composables/expense/useExpenseEventsViaLogs', () => ({
  useExpenseEventsViaLogs: () => emptyLogsFeed()
}))
vi.mock('@/composables/fixedReturn/useFixedReturnEventsViaLogs', () => ({
  useFixedReturnEventsViaLogs: () => emptyLogsFeed()
}))
vi.mock('@/composables/investor/useInvestorEventsViaLogs', () => ({
  useInvestorEventsViaLogs: () => emptyLogsFeed()
}))
vi.mock('@/composables/vesting/useVestingEventsViaLogs', () => ({
  useVestingEventsViaLogs: () => emptyLogsFeed()
}))
vi.mock('@/composables/investor/useSafeDepositRouterEventsViaLogs', () => ({
  useSafeDepositRouterEventsViaLogs: () => emptyLogsFeed()
}))

import { useCNCAccounting } from '../useCNCAccounting'

// Relies on the global mocks (tests/setup/composables.setup.ts):
//   • `useGetTeamQuery` → `mockTeamData` (one InvestorV1 pocket, an owner address)
//   • the on-chain feeds → the empty getLogs mocks above (no on-chain events)
//   • the backend query hooks → mock responses (weekly claims may yield accruals)
// So the composable assembles a valid journal for team "1".

describe('useCNCAccounting', () => {
  it('exposes the canonical journal without parallel source or report state', () => {
    const acc = useCNCAccounting('1')

    // Every posting is balanced by construction, so the books balance regardless
    // of whether the mocked feeds produce any entries (e.g. payroll accruals).
    expect(acc).not.toHaveProperty('entries')
    expect(acc).not.toHaveProperty('accountRegistry')
    expect(acc).not.toHaveProperty('reports')
    expect(Array.isArray(acc.journal.value)).toBe(true)
  })

  it('surfaces the team query loading / error state', () => {
    const { status } = useCNCAccounting('1')
    expect(status.isLoading.value).toBe(false)
    expect(status.error.value).toBeNull()
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
