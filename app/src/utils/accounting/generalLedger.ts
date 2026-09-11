/**
 * General ledger + trial balance (issue #2117).
 *
 * Rolls the finalized JournalEntry collection into a trial balance (catalogue
 * §6.4) that must satisfy two identities:
 *
 * - **Gross**: Σ of every journal debit line = Σ of every credit line
 *   (`totalDebit === totalCredit`) — the journal total, 678.10 in the worked example.
 * - **Net**: Σ of the debit-normal account balances = Σ of the credit-normal
 *   balances (`debitBalanceTotal === creditBalanceTotal`) — 253 in the worked example.
 *
 * Accounting assembly finalizes source drafts before this projection. The General
 * Ledger, Trial Balance, Summary, Income Statement, and Balance Sheet all consume
 * that same journal.
 */
import { ACCOUNT_NAMES, type AccountName } from './chartOfAccounts'
import { ZERO_USD_AMOUNT } from './monetaryAmount'
import { creditOf, debitOf } from './journalEntry'
import type { Account, AccountId, GeneralLedger, JournalEntry, UsdAmount } from './types'

type TrialBalanceRow = GeneralLedger['trialBalance'][number]

/** One trial-balance roll-up bucket: one concrete account, never an inferred instance. */
interface AccountBucket {
  account: Account
  debit: UsdAmount
  credit: UsdAmount
  /** Earliest posting time orders display labels but never determines account identity. */
  firstTs: number
}

/**
 * Roll journal lines up by their concrete account identity. The outer family map
 * only controls chart ordering and optional report aggregation; the inner key is
 * always the AccountId that came from the canonical registry.
 */
function accumulateBuckets(journal: readonly JournalEntry[]): Map<AccountName, AccountBucket[]> {
  const byAccount = new Map<AccountName, Map<AccountId, AccountBucket>>()
  for (const entry of journal) {
    for (const line of entry.lines) {
      const familyName = line.account.family.name
      let buckets = byAccount.get(familyName)
      if (!buckets) {
        buckets = new Map()
        byAccount.set(familyName, buckets)
      }
      let bucket = buckets.get(line.account.id)
      if (!bucket) {
        bucket = {
          account: line.account,
          debit: ZERO_USD_AMOUNT,
          credit: ZERO_USD_AMOUNT,
          firstTs: entry.timestamp
        }
        buckets.set(line.account.id, bucket)
      }
      bucket.debit += debitOf(line)
      bucket.credit += creditOf(line)
      if (entry.timestamp < bucket.firstTs) bucket.firstTs = entry.timestamp
    }
  }
  const grouped = new Map<AccountName, AccountBucket[]>()
  for (const [account, buckets] of byAccount) grouped.set(account, [...buckets.values()])
  return grouped
}

/** Label a concrete account for display without using that label as its identity. */
function accountLabel(account: Account, number: number): string {
  if (account.resolution === 'unresolved') return `${account.family.name} (unresolved)`
  return number > 1 ? `${account.family.name} ${number}` : account.family.name
}

/**
 * Build the double-entry general ledger and its trial balance from the validated,
 * assembled journal.
 */
export function buildGeneralLedger(journal: readonly JournalEntry[]): GeneralLedger {
  const groups = accumulateBuckets(journal)

  let totalDebit = ZERO_USD_AMOUNT
  let totalCredit = ZERO_USD_AMOUNT
  let debitBalanceTotal = ZERO_USD_AMOUNT
  let creditBalanceTotal = ZERO_USD_AMOUNT
  const trialBalance: TrialBalanceRow[] = []

  // Iterate the chart in declared order so the trial balance reads top-down. A
  // deployment-specific family emits one row per concrete AccountId. First activity
  // only numbers resolved rows for display; it never decides where an unresolved
  // line belongs.
  for (const account of ACCOUNT_NAMES) {
    const buckets = (groups.get(account) ?? []).sort(
      (a, b) => a.firstTs - b.firstTs || a.account.id.localeCompare(b.account.id)
    )
    const resolved = buckets.filter((bucket) => bucket.account.resolution === 'resolved')
    const split = resolved.length > 1
    let resolvedNumber = 0
    buckets.forEach((bucket) => {
      const debit = bucket.debit
      const credit = bucket.credit
      if (debit === ZERO_USD_AMOUNT && credit === ZERO_USD_AMOUNT) return

      const number =
        bucket.account.resolution === 'resolved' ? (resolvedNumber += 1) : Number.POSITIVE_INFINITY

      totalDebit += debit
      totalCredit += credit
      const debitNormal = bucket.account.family.normalBalance === 'debit'
      const balance = debitNormal ? debit - credit : credit - debit
      if (debitNormal) debitBalanceTotal += balance
      else creditBalanceTotal += balance

      trialBalance.push({
        account: bucket.account,
        accountLabel: accountLabel(bucket.account, number),
        split,
        isPrimaryInstance: bucket.account.resolution === 'resolved' && number === 1,
        totalDebit: debit,
        totalCredit: credit,
        balance
      })
    })
  }

  return {
    entries: journal.slice(),
    trialBalance,
    totalDebit,
    totalCredit,
    debitBalanceTotal,
    creditBalanceTotal,
    balanced: totalDebit === totalCredit && debitBalanceTotal === creditBalanceTotal
  }
}
