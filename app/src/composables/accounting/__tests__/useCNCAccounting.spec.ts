import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'

// The on-chain feeds now come from the `use*EventsViaLogs` composables (getLogs
// instead of Ponder). Mock each to an empty, non-loading result — the same
// pattern the *Transactions.vue specs use — so this spec exercises the assembly
// logic without touching the RPC. `refetch` resolves so the refresh test passes.
const emptyLogsFeed = () => ({
  result: ref(null),
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
vi.mock('@/composables/investor/useInvestorEventsViaLogs', () => ({
  useInvestorEventsViaLogs: () => emptyLogsFeed()
}))
vi.mock('@/composables/investor/useSafeDepositRouterEventsViaLogs', () => ({
  useSafeDepositRouterEventsViaLogs: () => emptyLogsFeed()
}))

import { useCNCAccounting } from '../useCNCAccounting'

// Relies on the global mocks (tests/setup/composables.setup.ts):
//   • `useGetTeamQuery` → `mockTeamData` (one InvestorV1 pocket, an owner address)
//   • the on-chain feeds → the empty getLogs mocks above (no on-chain events)
//   • the backend query hooks → mock responses (weekly claims may yield accruals)
// So the composable assembles a valid, always-balanced set of books for team "1".

describe('useCNCAccounting', () => {
  it('exposes the ledger, the three statements and query state', () => {
    const acc = useCNCAccounting('1')

    // Every posting is balanced by construction, so the books balance regardless
    // of whether the mocked feeds produce any entries (e.g. payroll accruals).
    expect(Array.isArray(acc.entries.value)).toBe(true)
    expect(acc.summary.value).toHaveProperty('cash')
    expect(acc.generalLedger.value.balanced).toBe(true)
    expect(typeof acc.incomeStatement.value.netIncome).toBe('number')
    expect(acc.balanceSheet.value.balanced).toBe(true)
  })

  it('surfaces the team query loading / error state', () => {
    const { isLoading, error } = useCNCAccounting('1')
    expect(isLoading.value).toBe(false)
    expect(error.value).toBeNull()
  })

  it('refetches every underlying query without throwing', async () => {
    const { refetch } = useCNCAccounting('1')
    await expect(refetch()).resolves.toBeDefined()
  })

  it('degrades gracefully when the team id is null (no contracts)', () => {
    const acc = useCNCAccounting(null)
    expect(Array.isArray(acc.entries.value)).toBe(true)
    expect(acc.balanceSheet.value.balanced).toBe(true)
  })
})
