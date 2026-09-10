/**
 * Account balances projected from the canonical JournalEntry lines.
 */
import type { AccountName } from './chartOfAccounts'
import { ZERO_USD_AMOUNT } from './monetaryAmount'
import type { Account, AccountId, JournalEntry, UsdAmount } from './types'

/** The net balance of one concrete Account on its normal side. */
interface JournalAccountBalance {
  account: Account
  amount: UsdAmount
}

/**
 * Net balances by concrete Account on each account's normal side, before display
 * rounding. A Balance Sheet preserves these concrete accounts and aggregates
 * only explicit statement totals.
 */
export function journalAccountBalances(
  entries: readonly JournalEntry[]
): Map<AccountId, JournalAccountBalance> {
  const balances = new Map<AccountId, JournalAccountBalance>()
  for (const entry of entries) {
    for (const line of entry.lines) {
      const amount = line.debit ?? line.credit ?? ZERO_USD_AMOUNT
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

/**
 * Net balances by account family on each family's normal side, before display
 * rounding. A debit-normal family grows with debits; a credit-normal family
 * grows with credits.
 */
export function journalFamilyBalances(
  entries: readonly JournalEntry[]
): Map<AccountName, UsdAmount> {
  const balances = new Map<AccountName, UsdAmount>()
  for (const line of journalAccountBalances(entries).values()) {
    const family = line.account.family.name
    balances.set(family, (balances.get(family) ?? ZERO_USD_AMOUNT) + line.amount)
  }
  return balances
}
