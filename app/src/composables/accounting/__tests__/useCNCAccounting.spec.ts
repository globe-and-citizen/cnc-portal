import { describe, it, expect } from 'vitest'
import { useCNCAccounting } from '../useCNCAccounting'

// Relies on the global mocks (tests/setup/composables.setup.ts):
//   • `useGetTeamQuery` → `mockTeamData` (one InvestorV1 pocket, an owner address)
//   • Apollo `useQuery`  → an empty result ref (no on-chain events)
//   • the backend query hooks → mock responses (weekly claims may yield accruals)
// So the composable assembles a valid, always-balanced set of books for team "1".

describe('useCNCAccounting', () => {
  it('exposes the ledger, the three statements and query state', () => {
    const acc = useCNCAccounting('1')

    // Every posting is balanced by construction, so the books balance regardless
    // of whether the mocked feeds produce any entries (e.g. payroll accruals).
    expect(Array.isArray(acc.entries.value)).toBe(true)
    expect(acc.summary.value).toHaveProperty('cash')
    expect(typeof acc.nameOf.value).toBe('function')
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
