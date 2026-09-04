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
import {
  ACCOUNT_NAMES,
  classOf,
  isDebitNormal,
  isInstancedPocket,
  type AccountClass,
  type AccountName
} from './chartOfAccounts'
import { buildJournalPocketInstances } from './pocketInstances'
import type { Address } from 'viem'
import type { LedgerEntry, UseCase } from './ledgerEntry'

/** One ordered debit or credit line belonging to a {@link JournalEntry}. */
export type JournalEntryLine =
  | {
      /** Stable within-entry line identity. */
      id: string
      account: AccountName
      /** The pocket contract instance holding this leg's cash, when known. */
      instance?: Address
      debit: number
      credit?: never
    }
  | {
      /** Stable within-entry line identity. */
      id: string
      account: AccountName
      /** The pocket contract instance holding this leg's cash, when known. */
      instance?: Address
      debit?: never
      credit: number
    }

export interface JournalEntry {
  /** Stable journal-entry identity. One source operation can produce several entries. */
  id: string
  /** Stable identity of the source accounting operation behind this entry. */
  sourceOperationId: string
  /** Event time, Unix seconds. */
  timestamp: number
  /** The journal template the source operation realised. */
  useCase: UseCase
  /** Human-readable narration. */
  memo: string
  /** True when both legs are CNC-owned pockets (internal move, no IS impact). */
  internal: boolean
  /** Whether this entry carries monetary lines or only memo metadata. */
  kind: 'monetary' | 'memo'
  /** Off-chain category, when enriched (e.g. "Payroll", "Operating"). */
  category?: string
  /** Transaction hash, when known. */
  txHash?: string
  /** Ordered and validated journal lines; empty only when {@link kind} is `memo`. */
  lines: JournalEntryLine[]
}

/** One line's debit amount, or zero when it is a credit line. */
function debitOf(line: JournalEntryLine): number {
  return line.debit ?? 0
}

/** One line's credit amount, or zero when it is a debit line. */
function creditOf(line: JournalEntryLine): number {
  return line.credit ?? 0
}

const BALANCE_TOLERANCE = 1e-9

/** The domain error raised before a projection can consume an invalid entry. */
class InvalidJournalEntryError extends Error {
  constructor(entryId: string, reasons: readonly string[]) {
    super(`Invalid journal entry "${entryId}": ${reasons.join('; ')}`)
    this.name = 'InvalidJournalEntryError'
  }
}

/** Whether a journal entry's debit and credit line totals match in reporting currency. */
export function isBalanced(entry: JournalEntry): boolean {
  if (entry.kind === 'memo') return entry.lines.length === 0

  let debit = 0
  let credit = 0
  for (const line of entry.lines) {
    debit += debitOf(line)
    credit += creditOf(line)
  }
  return Math.abs(debit - credit) < BALANCE_TOLERANCE
}

/** Validate the shape and balance invariant of one journal entry. */
function journalEntryValidationErrors(entry: JournalEntry): string[] {
  const errors: string[] = []
  if (!entry.id.trim()) errors.push('entry id is required')
  if (!entry.sourceOperationId.trim()) errors.push('source operation id is required')
  if (!Number.isFinite(entry.timestamp)) errors.push('timestamp must be finite')
  if (entry.kind !== 'monetary' && entry.kind !== 'memo') errors.push('entry kind is invalid')

  if (entry.kind === 'memo') {
    if (entry.lines.length !== 0) errors.push('memo entries cannot contain monetary lines')
    return errors
  }

  if (entry.lines.length === 0) errors.push('monetary entries require journal lines')
  const lineIds = new Set<string>()
  let debitLines = 0
  let creditLines = 0

  for (const line of entry.lines) {
    if (!line.id.trim()) errors.push('line id is required')
    else if (lineIds.has(line.id)) errors.push(`duplicate line id "${line.id}"`)
    else lineIds.add(line.id)
    if (!line.account.trim()) errors.push(`line "${line.id}" account is required`)

    const hasDebit = line.debit !== undefined
    const hasCredit = line.credit !== undefined
    if (hasDebit === hasCredit) {
      errors.push(`line "${line.id}" must carry exactly one debit or credit amount`)
      continue
    }

    const amount = line.debit ?? line.credit
    if (amount === undefined || !Number.isFinite(amount) || amount < 0)
      errors.push(`line "${line.id}" amount must be finite and non-negative`)
    if (hasDebit) debitLines += 1
    else creditLines += 1
  }

  if (debitLines === 0 || creditLines === 0)
    errors.push('monetary entries require at least one debit and one credit line')
  if (!isBalanced(entry)) errors.push('debit and credit totals must balance')
  return errors
}

/**
 * Construct a journal entry only when its structural and balance invariants hold.
 * The returned copy owns its ordered lines, so callers cannot mutate a validated
 * entry through the input array after construction.
 */
export function createJournalEntry(entry: JournalEntry): JournalEntry {
  const validated: JournalEntry = {
    ...entry,
    lines: entry.lines.map((line) => ({ ...line }) as JournalEntryLine)
  }
  const errors = journalEntryValidationErrors(validated)
  if (errors.length) throw new InvalidJournalEntryError(validated.id, errors)
  return validated
}

/** Convert a current two-leg consolidated posting into its journal lines. */
function linesOf(entry: LedgerEntry): JournalEntryLine[] {
  const lines: JournalEntryLine[] = []
  if (entry.debit)
    lines.push({
      id: `${entry.id}:debit`,
      account: entry.debit,
      ...(entry.debitInstance ? { instance: entry.debitInstance } : {}),
      debit: entry.amountUsd
    })
  if (entry.credit)
    lines.push({
      id: `${entry.id}:credit`,
      account: entry.credit,
      ...(entry.creditInstance ? { instance: entry.creditInstance } : {}),
      credit: entry.amountUsd
    })
  return lines
}

/** Adapt the current consolidated posting model at the validated journal boundary. */
function journalEntryFromLedgerEntry(entry: LedgerEntry): JournalEntry {
  return createJournalEntry({
    id: entry.id,
    sourceOperationId: entry.sourceOperationId ?? entry.id,
    timestamp: entry.timestamp,
    useCase: entry.useCase,
    memo: entry.memo,
    internal: entry.internal,
    kind: entry.debit === null && entry.credit === null ? 'memo' : 'monetary',
    ...(entry.category ? { category: entry.category } : {}),
    ...(entry.txHash ? { txHash: entry.txHash } : {}),
    lines: linesOf(entry)
  })
}

/** Adapt consolidated postings into the validated, ordered double-entry journal. */
export function buildJournal(entries: readonly LedgerEntry[]): JournalEntry[] {
  return entries
    .map(journalEntryFromLedgerEntry)
    .sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id))
}

export interface TrialBalanceRow {
  account: AccountName
  /**
   * Display name for the row — the account itself for the original deployment, then
   * numbered ` 2` / ` 3` for each later deployment (a redeploy), so each shows as its
   * own line. Equals {@link account} for a single instance, so an un-redeployed book
   * reads exactly as before.
   */
  accountLabel: string
  /** The pocket contract instance this row rolls up, when the account is split across redeploys. */
  instance?: Address
  /** True when this account is split across several instances (a redeploy) — drives the redeploy hint. */
  split: boolean
  /** True on the primary (earliest) instance row — the one that also carries the pocket's un-instanced legs. */
  isPrimaryInstance: boolean
  accountClass: AccountClass
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

/** One trial-balance roll-up bucket: an account, optionally scoped to a pocket instance. */
interface AccountBucket {
  instance?: Address
  debit: number
  credit: number
  /** Earliest posting time in the bucket — orders the instances of a split pocket. */
  firstTs: number
}

/**
 * Roll the journal lines up into per-account buckets, splitting an instanced cash
 * pocket ({@link isInstancedPocket}) into one bucket per contract instance and
 * folding every other account (and any un-instanced pocket leg) into a single
 * bucket. Returns the buckets grouped by base account, so the trial balance can
 * emit them in chart order.
 */
function accumulateBuckets(journal: readonly JournalEntry[]): Map<AccountName, AccountBucket[]> {
  const byAccount = new Map<AccountName, Map<string, AccountBucket>>()
  for (const entry of journal) {
    for (const line of entry.lines) {
      const instance = isInstancedPocket(line.account) ? line.instance : undefined
      const key = instance ? instance.toLowerCase() : ''
      let buckets = byAccount.get(line.account)
      if (!buckets) {
        buckets = new Map()
        byAccount.set(line.account, buckets)
      }
      let bucket = buckets.get(key)
      if (!bucket) {
        bucket = {
          ...(instance ? { instance } : {}),
          debit: 0,
          credit: 0,
          firstTs: entry.timestamp
        }
        buckets.set(key, bucket)
      }
      bucket.debit += debitOf(line)
      bucket.credit += creditOf(line)
      if (entry.timestamp < bucket.firstTs) bucket.firstTs = entry.timestamp
    }
  }
  const grouped = new Map<AccountName, AccountBucket[]>()
  for (const [account, buckets] of byAccount) grouped.set(account, foldBlankBucket(buckets))
  return grouped
}

/**
 * Fold the un-instanced (`''`) bucket into the pocket's earliest concrete instance,
 * so a leg that carries no contract address (a FixedReturn sweep straight to Bank, an
 * owner treasury sweep) lands on the deployment already on the books rather than
 * spawning a phantom extra row. With no concrete instance at all (a normal, single
 * account) the lone bucket is kept as-is — the un-redeployed book reads as before.
 */
function foldBlankBucket(buckets: Map<string, AccountBucket>): AccountBucket[] {
  const blank = buckets.get('')
  const concrete = [...buckets.values()].filter((bucket) => bucket.instance)
  if (!blank || concrete.length === 0) return [...buckets.values()]
  const primary = concrete.reduce((a, b) => (b.firstTs < a.firstTs ? b : a))
  primary.debit += blank.debit
  primary.credit += blank.credit
  primary.firstTs = Math.min(primary.firstTs, blank.firstTs)
  return concrete
}

/**
 * Build the double-entry general ledger and its trial balance from the validated,
 * assembled journal.
 */
export function buildGeneralLedger(journal: readonly JournalEntry[]): GeneralLedger {
  const groups = accumulateBuckets(journal)
  // Deployment numbering is shared with the general-ledger view (see
  // {@link ./pocketInstances}), so `Cash — Bank 2` names the same contract in both.
  const instances = buildJournalPocketInstances(journal)

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

  // Iterate the chart in declared order so the trial balance reads top-down. A cash
  // pocket that spans several contract instances (a redeploy) emits one row per
  // instance, ordered by first activity: the original deployment keeps the plain
  // account name, each later one is numbered ` 2` / ` 3`. A single-instance account
  // emits one row named exactly as before.
  for (const account of ACCOUNT_NAMES) {
    const buckets = (groups.get(account) ?? []).sort(
      (a, b) => a.firstTs - b.firstTs || (a.instance ?? '').localeCompare(b.instance ?? '')
    )
    const split = buckets.length > 1
    buckets.forEach((bucket, index) => {
      const rawDebit = bucket.debit
      const rawCredit = bucket.credit
      if (rawDebit === 0 && rawCredit === 0) return

      rawTotalDebit += rawDebit
      rawTotalCredit += rawCredit
      const rawBalance = isDebitNormal(account) ? rawDebit - rawCredit : rawCredit - rawDebit
      if (isDebitNormal(account)) rawDebitBalance += rawBalance
      else rawCreditBalance += rawBalance

      const grossDebit = round2(rawDebit)
      const grossCredit = round2(rawCredit)
      if (grossDebit === 0 && grossCredit === 0) return // sub-cent residual: not shown

      trialBalance.push({
        account,
        accountLabel: instances.labelOf(account, bucket.instance),
        ...(bucket.instance ? { instance: bucket.instance } : {}),
        split,
        isPrimaryInstance: index === 0,
        accountClass: classOf(account),
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
