/**
 * Family-level balances projected from the canonical JournalEntry lines.
 *
 * Statement views retain their current family-level display contract (for
 * example, one Cash — Bank line across deployments), while JournalEntryLine
 * remains the concrete-account source of every amount.
 */
import type { AccountName } from './chartOfAccounts'
import type { JournalEntry } from './journalEntry'

/**
 * Net balances by account family on each family's normal side, before display
 * rounding. A debit-normal family grows with debits; a credit-normal family
 * grows with credits.
 */
export function journalFamilyBalancesUnrounded(
  entries: readonly JournalEntry[]
): Map<AccountName, number> {
  const balances = new Map<AccountName, number>()
  for (const entry of entries) {
    for (const line of entry.lines) {
      const amount = line.debit ?? line.credit ?? 0
      const debitNormal = line.account.family.normalBalance === 'debit'
      const signed =
        line.debit !== undefined ? (debitNormal ? amount : -amount) : debitNormal ? -amount : amount
      const account = line.account.family.name
      balances.set(account, (balances.get(account) ?? 0) + signed)
    }
  }
  return balances
}

/** Family-level balances rounded for report line display. */
export function journalFamilyBalances(entries: readonly JournalEntry[]): Map<AccountName, number> {
  const balances = journalFamilyBalancesUnrounded(entries)
  for (const [account, amount] of balances) {
    balances.set(account, Math.round(amount * 100) / 100)
  }
  return balances
}
