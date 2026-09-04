/**
 * General ledger + trial balance (issue #2117).
 *
 * Turns the consolidated {@link LedgerEntry} feed into the double-entry journal
 * (catalogue §6.2) and rolls it up into a trial balance (catalogue §6.4) that
 * must satisfy two identities:
 *
 * - **Gross**: Σ of every journal debit line = Σ of every credit line
 *   (`totalDebit === totalCredit`) — the journal total, 678.10 in the worked example.
 * - **Net**: Σ of the debit-normal account balances = Σ of the credit-normal
 *   balances (`debitBalanceTotal === creditBalanceTotal`) — 253 in the worked example.
 *
 * Accounting assembly adapts the consolidated {@link LedgerEntry} feed into
 * validated {@link JournalEntry} records once. A later migration will make those
 * records the input to every report; the General Ledger and Trial Balance already
 * consume only that assembled journal.
 */
import { ACCOUNT_NAMES, isDebitNormal, type AccountName } from './chartOfAccounts'
import {
  buildAccountRegistry,
  type AccountId,
  type AccountRegistry,
  type Account
} from './accountRegistry'
import { sourceOperationIdOf, transactionHashOf, type LedgerEntry } from './ledgerEntry'
import {
  createJournalEntry,
  creditOf,
  debitOf,
  isBankFeePosting,
  reconcileJournalEntrySources,
  type JournalEntry,
  type JournalEntryLine
} from './journalEntry'

export { createJournalEntry, isBalanced } from './journalEntry'
export type { JournalEntry, JournalEntryLine } from './journalEntry'

/** Convert a current two-leg consolidated posting into journal lines with concrete account identity. */
function linesOf(entry: LedgerEntry, accounts: AccountRegistry): JournalEntryLine[] {
  const lines: JournalEntryLine[] = []
  if (entry.debit) {
    const account = accounts.resolve(entry.debit, entry.debitInstance)
    lines.push({
      id: `${entry.id}:debit`,
      account,
      movement: {
        token: entry.token,
        rawAmount: entry.rawAmount,
        ...(entry.rate != null ? { rate: entry.rate } : {})
      },
      debit: entry.amountUsd
    })
  }
  if (entry.credit) {
    const account = accounts.resolve(entry.credit, entry.creditInstance)
    lines.push({
      id: `${entry.id}:credit`,
      account,
      movement: {
        token: entry.token,
        rawAmount: entry.rawAmount,
        ...(entry.rate != null ? { rate: entry.rate } : {})
      },
      credit: entry.amountUsd
    })
  }
  return lines
}

/** One source operation's monetary lines, coalesced by their concrete account and token movement. */
function mergedLines(
  entries: readonly LedgerEntry[],
  accounts: AccountRegistry
): JournalEntryLine[] {
  const debit = entries.flatMap((entry) => linesOf(entry, accounts).filter((line) => line.debit))
  const credit = entries.flatMap((entry) => linesOf(entry, accounts).filter((line) => line.credit))
  const merge = (lines: readonly JournalEntryLine[]): JournalEntryLine[] => {
    const byMovement = new Map<string, JournalEntryLine>()
    for (const line of lines) {
      const side = line.debit !== undefined ? 'debit' : 'credit'
      const movement = line.movement
      const key = [
        side,
        line.account.id,
        movement?.token ?? '',
        movement?.rate ?? '',
        movement ? 'movement' : 'none'
      ].join('|')
      const existing = byMovement.get(key)
      if (!existing) {
        byMovement.set(key, { ...line, ...(movement ? { movement: { ...movement } } : {}) })
        continue
      }

      if (existing.debit !== undefined && line.debit !== undefined) existing.debit += line.debit
      if (existing.credit !== undefined && line.credit !== undefined) existing.credit += line.credit
      if (existing.movement && movement) {
        try {
          existing.movement.rawAmount = (
            BigInt(existing.movement.rawAmount) + BigInt(movement.rawAmount)
          ).toString()
        } catch {
          // A malformed token amount remains visible on its first source line;
          // reporting amounts still come from the validated USD debit/credit.
        }
      }
    }
    return [...byMovement.values()]
  }
  // Conventional journal order puts every debit before every credit. This makes a
  // transfer plus fee read Dr destination · Dr fee · Cr Bank gross.
  return [...merge(debit), ...merge(credit)]
}

/** Adapt one source operation's consolidated postings at the validated journal boundary. */
function journalEntryFromLedgerEntries(
  entries: readonly LedgerEntry[],
  accounts: AccountRegistry,
  operationId: string
): JournalEntry {
  const ordered = entries
    .slice()
    .sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id))
  const primary = ordered.find((entry) => !isBankFeePosting(entry)) ?? ordered[0]!
  const lineEntries = [primary, ...ordered.filter((entry) => entry !== primary)]
  const monetary = ordered.some((entry) => entry.debit !== null || entry.credit !== null)
  const counterparties = new Set(
    ordered.flatMap((entry) => (entry.counterparty ? [entry.counterparty.toLowerCase()] : []))
  )
  const source = counterparties.size > 1 ? { ...primary, counterparty: undefined } : primary
  const txHash = ordered.find((entry) => entry.txHash)?.txHash ?? transactionHashOf(operationId)
  return createJournalEntry({
    id: operationId,
    sourceOperationId: operationId,
    timestamp: ordered[0]!.timestamp,
    useCase: primary.useCase,
    memo: primary.memo,
    internal: ordered.every((entry) => entry.internal),
    kind: monetary ? 'monetary' : 'memo',
    ...(primary.category ? { category: primary.category } : {}),
    ...(txHash ? { txHash } : {}),
    source,
    lines: monetary ? mergedLines(lineEntries, accounts) : []
  })
}

/** Adapt consolidated postings into the validated, ordered double-entry journal. */
export function buildJournal(
  entries: readonly LedgerEntry[],
  accounts?: AccountRegistry
): JournalEntry[] {
  const reconciled = reconcileJournalEntrySources(entries)
  const accountRegistry = accounts ?? buildAccountRegistry(reconciled.entries)
  const byOperation = new Map<string, LedgerEntry[]>()
  for (const entry of reconciled.entries) {
    const operationId = sourceOperationIdOf(entry.txHash ?? entry.sourceOperationId ?? entry.id)
    const group = byOperation.get(operationId)
    if (group) group.push(entry)
    else byOperation.set(operationId, [entry])
  }
  return [...byOperation.entries()]
    .map(([operationId, group]) =>
      journalEntryFromLedgerEntries(group, accountRegistry, operationId)
    )
    .sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id))
}

export interface TrialBalanceRow {
  /** Canonical concrete account; use it for report selection and reconciliation. */
  account: Account
  /**
   * Display name for the row — the account itself for the original deployment, then
   * numbered ` 2` / ` 3` for each later deployment (a redeploy), so each shows as its
   * own line. It is derived separately from the concrete account, so an un-redeployed
   * book reads exactly as before.
   */
  accountLabel: string
  /** True when this account is split across several instances (a redeploy) — drives the redeploy hint. */
  split: boolean
  /** True on the earliest resolved deployment row, used only for display. */
  isPrimaryInstance: boolean
  /** Σ of every debit line posted to this account (gross). */
  totalDebit: number
  /** Σ of every credit line posted to this account (gross). */
  totalCredit: number
  /** Net balance on the account's normal side (≥ 0 for a clean book). */
  balance: number
}

export interface GeneralLedger {
  /** The journal, chronologically ordered. */
  entries: JournalEntry[]
  /** Per-account roll-up; rows with no activity are dropped. */
  trialBalance: TrialBalanceRow[]
  /** Σ of all gross debit lines (the journal total). */
  totalDebit: number
  /** Σ of all gross credit lines (the journal total). */
  totalCredit: number
  /** Σ of the debit-normal account balances (the trial-balance debit column). */
  debitBalanceTotal: number
  /** Σ of the credit-normal account balances (the trial-balance credit column). */
  creditBalanceTotal: number
  /** True when both the gross and net identities hold to the cent. */
  balanced: boolean
}

const CENT = 0.01

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Net balance of every touched account, signed on its **normal** side
 * (debit-normal → debit − credit; credit-normal → credit − debit), so a clean
 * book yields non-negative balances. Shared by the income statement and balance
 * sheet so all three statements roll up the exact same numbers.
 */
export function netBalanceByAccount(entries: readonly LedgerEntry[]): Map<AccountName, number> {
  const net = netBalanceByAccountUnrounded(entries)
  for (const [account, value] of net) net.set(account, round2(value))
  return net
}

/**
 * Same roll-up as {@link netBalanceByAccount} but **without** the per-account
 * cent rounding — used for the balance-sheet identity check, which must run on
 * full precision (rounding each account then summing can drift a cent and flag a
 * balanced book "out of balance").
 */
export function netBalanceByAccountUnrounded(
  entries: readonly LedgerEntry[]
): Map<AccountName, number> {
  const net = new Map<AccountName, number>()
  const add = (account: AccountName, signed: number): void => {
    net.set(account, (net.get(account) ?? 0) + signed)
  }
  for (const entry of entries) {
    if (entry.debit)
      add(entry.debit, isDebitNormal(entry.debit) ? entry.amountUsd : -entry.amountUsd)
    if (entry.credit) {
      add(entry.credit, isDebitNormal(entry.credit) ? -entry.amountUsd : entry.amountUsd)
    }
    // A folded Bank fee ({@link ./mergeBankFees}) drops its standalone posting and
    // rides on the transfer as `mergedBankFee`. Re-book its two legs here so a
    // merged feed nets exactly like the canonical one it stands in for — a no-op
    // on the canonical feed, which never carries `mergedBankFee`.
    const fee = entry.mergedBankFee
    if (fee) {
      add('Transaction Fee Expense', fee.amountUsd)
      add('Cash — Bank', -fee.amountUsd)
    }
  }
  return net
}

/** One trial-balance roll-up bucket: one concrete account, never an inferred instance. */
interface AccountBucket {
  account: Account
  debit: number
  credit: number
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
          debit: 0,
          credit: 0,
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

  // Totals + the balanced check run on the **raw** (full-precision) sums: every
  // posting is internally balanced, so the raw debit/credit totals are exactly
  // equal. Rounding each account to the cent first and *then* summing lets those
  // per-account roundings drift a cent apart (e.g. SHER values like 7.165 / 7.465
  // each rounding up), which would otherwise flag a balanced book "out of balance".
  // We round only for display.
  let rawTotalDebit = 0
  let rawTotalCredit = 0
  let rawDebitBalance = 0
  let rawCreditBalance = 0
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
      const rawDebit = bucket.debit
      const rawCredit = bucket.credit
      if (rawDebit === 0 && rawCredit === 0) return

      const number =
        bucket.account.resolution === 'resolved' ? (resolvedNumber += 1) : Number.POSITIVE_INFINITY

      rawTotalDebit += rawDebit
      rawTotalCredit += rawCredit
      const debitNormal = bucket.account.family.normalBalance === 'debit'
      const rawBalance = debitNormal ? rawDebit - rawCredit : rawCredit - rawDebit
      if (debitNormal) rawDebitBalance += rawBalance
      else rawCreditBalance += rawBalance

      const grossDebit = round2(rawDebit)
      const grossCredit = round2(rawCredit)
      if (grossDebit === 0 && grossCredit === 0) return // sub-cent residual: not shown

      trialBalance.push({
        account: bucket.account,
        accountLabel: accountLabel(bucket.account, number),
        split,
        isPrimaryInstance: bucket.account.resolution === 'resolved' && number === 1,
        totalDebit: grossDebit,
        totalCredit: grossCredit,
        balance: round2(rawBalance)
      })
    })
  }

  return {
    entries: journal.slice(),
    trialBalance,
    totalDebit: round2(rawTotalDebit),
    totalCredit: round2(rawTotalCredit),
    debitBalanceTotal: round2(rawDebitBalance),
    creditBalanceTotal: round2(rawCreditBalance),
    balanced:
      Math.abs(rawTotalDebit - rawTotalCredit) < CENT &&
      Math.abs(rawDebitBalance - rawCreditBalance) < CENT
  }
}
