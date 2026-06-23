import { describe, it, expect } from 'vitest'
import { useCNCAccounting } from '../useCNCAccounting'

// Relies on the global mocks (tests/setup/composables.setup.ts):
//   • `useGetTeamQuery` → `mockTeamData` (one InvestorV1 pocket, an owner address)
//   • Apollo `useQuery`  → an empty result ref (no on-chain events)
//   • the backend query hooks → empty mock responses
// So the composable assembles an empty-but-valid set of books for team "1".

describe('useCNCAccounting', () => {
  it('exposes the ledger, the three statements and query state', () => {
    const acc = useCNCAccounting('1')

    expect(acc.entries.value).toEqual([])
    expect(acc.summary.value).toMatchObject({ cash: 0, income: 0, expense: 0, netIncome: 0 })
    expect(acc.generalLedger.value.balanced).toBe(true)
    expect(acc.incomeStatement.value.netIncome).toBe(0)
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
    expect(acc.entries.value).toEqual([])
    expect(acc.balanceSheet.value.balanced).toBe(true)
  })
})
