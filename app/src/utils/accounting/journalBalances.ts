/**
 * Account balances projected from the canonical JournalEntry lines.
 */
import type { AccountId, Account } from './accountRegistry'
import type { AccountName } from './chartOfAccounts'
import type { JournalEntry } from './journalEntry'

/** The net balance of one concrete Account on its normal side. */
export interface JournalAccountBalance {
  account: Account
  amount: number
}

/**
 * Net balances by concrete Account on each account's normal side, before display
 * rounding. A Balance Sheet preserves these concrete accounts and aggregates
 * only explicit statement totals.
 */
export function journalAccountBalancesUnrounded(
  entries: readonly JournalEntry[]
): Map<AccountId, JournalAccountBalance> {
  const balances = new Map<AccountId, JournalAccountBalance>()
  for (const entry of entries) {
    for (const line of entry.lines) {
      const amount = line.debit ?? line.credit ?? 0
      const debitNormal = line.account.family.normalBalance === 'debit'
      const signed =
        line.debit !== undefined ? (debitNormal ? amount : -amount) : debitNormal ? -amount : amount
      const existing = balances.get(line.account.id)
      if (existing) existing.amount += signed
      else balances.set(line.account.id, { account: line.account, amount: signed })
    }
  }
  return balances
}

/** Concrete-account balances rounded for report-line display. */
export function journalAccountBalances(
  entries: readonly JournalEntry[]
): Map<AccountId, JournalAccountBalance> {
  const balances = journalAccountBalancesUnrounded(entries)
  return new Map(
    [...balances].map(([id, line]) => [
      id,
      { ...line, amount: Math.round(line.amount * 100) / 100 }
    ])
  )
}

/**
 * Net balances by account family on each family's normal side, before display
 * rounding. A debit-normal family grows with debits; a credit-normal family
 * grows with credits.
 */
export function journalFamilyBalancesUnrounded(
  entries: readonly JournalEntry[]
): Map<AccountName, number> {
  const balances = new Map<AccountName, number>()
  for (const line of journalAccountBalancesUnrounded(entries).values()) {
    const family = line.account.family.name
    balances.set(family, (balances.get(family) ?? 0) + line.amount)
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
