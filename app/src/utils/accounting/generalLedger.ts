/**
 * General ledger + trial balance (issue #2117).
 *
 * Turns the consolidated {@link RateStampedLedgerEntry} feed into the double-entry journal
 * (catalogue §6.2) and rolls it up into a trial balance (catalogue §6.4) that
 * must satisfy two identities:
 *
 * - **Gross**: Σ of every journal debit line = Σ of every credit line
 *   (`totalDebit === totalCredit`) — the journal total, 678.10 in the worked example.
 * - **Net**: Σ of the debit-normal account balances = Σ of the credit-normal
 *   balances (`debitBalanceTotal === creditBalanceTotal`) — 253 in the worked example.
 *
 * Accounting assembly adapts the consolidated {@link RateStampedLedgerEntry} feed into
 * validated {@link JournalEntry} records once. The General Ledger, Trial Balance,
 * Summary, Income Statement, and Balance Sheet consume that assembled journal.
 */
import { ACCOUNT_NAMES, type AccountName } from './chartOfAccounts'
import {
  buildAccountRegistry,
  type AccountId,
  type AccountRegistry,
  type Account
} from './accountRegistry'
import { sourceOperationIdOf, transactionHashOf, type RateStampedLedgerEntry } from './ledgerEntry'
import { legacyClassificationTargetOf } from './classificationTarget'
import { getTokenDecimals } from '@/utils/tokens/metadata'
import {
  ZERO_USD_AMOUNT,
  usdAmountFromToken,
  usdRateFromNumber,
  type UsdAmount
} from './monetaryAmount'
import {
  createJournalEntry,
  creditOf,
  debitOf,
  isBankFeePosting,
  reconcileJournalEntrySources,
  type JournalEntry,
  type JournalEntryLine
} from './journalEntry'

export type { JournalEntry, JournalEntryLine } from './journalEntry'

/** Convert a current two-leg consolidated posting into journal lines with concrete account identity. */
function linesOf(entry: RateStampedLedgerEntry, accounts: AccountRegistry): JournalEntryLine[] {
  const lines: JournalEntryLine[] = []
  if (typeof entry.rate !== 'number') {
    throw new Error(`Ledger entry "${entry.id}" requires a rate before journal assembly`)
  }
  const rate = usdRateFromNumber(entry.rate)
  const rawAmount = BigInt(entry.rawAmount)
  const amount = usdAmountFromToken(rawAmount, entry.token, rate)
  if (entry.debit) {
    const account = accounts.resolve(entry.debit, entry.debitInstance)
    lines.push({
      id: `${entry.id}:debit`,
      account,
      movement: {
        token: entry.token,
        rawAmount,
        decimals: getTokenDecimals(entry.token),
        rate
      },
      debit: amount
    })
  }
  if (entry.credit) {
    const account = accounts.resolve(entry.credit, entry.creditInstance)
    lines.push({
      id: `${entry.id}:credit`,
      account,
      movement: {
        token: entry.token,
        rawAmount,
        decimals: getTokenDecimals(entry.token),
        rate
      },
      credit: amount
    })
  }
  return lines
}

/** One source operation's monetary lines, coalesced by their concrete account and token movement. */
function mergedLines(
  entries: readonly RateStampedLedgerEntry[],
  accounts: AccountRegistry
): JournalEntryLine[] {
  const debit = entries.flatMap((entry) =>
    linesOf(entry, accounts).filter((line) => line.debit !== undefined)
  )
  const credit = entries.flatMap((entry) =>
    linesOf(entry, accounts).filter((line) => line.credit !== undefined)
  )
  const merge = (lines: readonly JournalEntryLine[]): JournalEntryLine[] => {
    const byMovement = new Map<string, JournalEntryLine>()
    for (const line of lines) {
      const side = line.debit !== undefined ? 'debit' : 'credit'
      const movement = line.movement
      const key = [
        side,
        line.account.id,
        movement?.token ?? '',
        movement ? movement.rate : '',
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
        existing.movement.rawAmount += movement.rawAmount
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
  entries: readonly RateStampedLedgerEntry[],
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
  const withdrawals = ordered.flatMap((entry) => {
    const target = legacyClassificationTargetOf(entry)
    return target ? [target] : []
  })
  const nonFeeSources = ordered.filter((entry) => !isBankFeePosting(entry))
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
    ...(withdrawals.length
      ? {
          legacyClassification: {
            targets: withdrawals,
            editable: withdrawals.length === 1 && nonFeeSources.length === 1
          }
        }
      : {}),
    lines: monetary ? mergedLines(lineEntries, accounts) : []
  })
}

/** Adapt consolidated postings into the validated, ordered double-entry journal. */
export function buildJournal(
  entries: readonly RateStampedLedgerEntry[],
  accounts?: AccountRegistry
): JournalEntry[] {
  const reconciled = reconcileJournalEntrySources(entries)
  const accountRegistry = accounts ?? buildAccountRegistry(reconciled.entries)
  const byOperation = new Map<string, RateStampedLedgerEntry[]>()
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
  totalDebit: UsdAmount
  /** Σ of every credit line posted to this account (gross). */
  totalCredit: UsdAmount
  /** Net balance on the account's normal side (≥ 0 for a clean book). */
  balance: UsdAmount
}

export interface GeneralLedger {
  /** The journal, chronologically ordered. */
  entries: JournalEntry[]
  /** Per-account roll-up; rows with no activity are dropped. */
  trialBalance: TrialBalanceRow[]
  /** Σ of all gross debit lines (the journal total). */
  totalDebit: UsdAmount
  /** Σ of all gross credit lines (the journal total). */
  totalCredit: UsdAmount
  /** Σ of the debit-normal account balances (the trial-balance debit column). */
  debitBalanceTotal: UsdAmount
  /** Σ of the credit-normal account balances (the trial-balance credit column). */
  creditBalanceTotal: UsdAmount
  /** True when both the gross and net identities hold exactly. */
  balanced: boolean
}

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
