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
 * Each {@link LedgerEntry} is already a balanced posting, so a single entry maps
 * to two journal lines (one debit, one credit). Memo-only Default-D entries
 * (debit === credit === null) carry no lines — they record a share count only.
 */
import {
  ACCOUNT_NAMES,
  classOf,
  isDebitNormal,
  type AccountClass,
  type AccountName
} from './chartOfAccounts'
import type { LedgerEntry, UseCase } from './ledgerEntry'

export interface JournalLine {
  account: AccountName
  debit: number
  credit: number
}

export interface JournalEntry {
  /** Source ledger-entry id. */
  id: string
  /** Event time, Unix seconds. */
  timestamp: number
  useCase: UseCase
  memo: string
  /** True when both legs are CNC-owned pockets (internal move, no IS impact). */
  internal: boolean
  /** Off-chain category, when enriched (e.g. "Payroll", "Operating"). */
  category?: string
  /** Transaction hash, when known. */
  txHash?: string
  /** The balanced journal lines (empty for memo-only entries). */
  lines: JournalLine[]
}

export interface TrialBalanceRow {
  account: AccountName
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
  }
  for (const [account, value] of net) net.set(account, round2(value))
  return net
}

/** Convert one balanced posting into its (up to two) journal lines. */
function linesOf(entry: LedgerEntry): JournalLine[] {
  const lines: JournalLine[] = []
  if (entry.debit) lines.push({ account: entry.debit, debit: entry.amountUsd, credit: 0 })
  if (entry.credit) lines.push({ account: entry.credit, debit: 0, credit: entry.amountUsd })
  return lines
}

/** Build the journal entries (the ordered double-entry log). */
export function buildJournal(entries: readonly LedgerEntry[]): JournalEntry[] {
  return entries
    .map((entry) => ({
      id: entry.id,
      timestamp: entry.timestamp,
      useCase: entry.useCase,
      memo: entry.memo,
      internal: entry.internal,
      ...(entry.category ? { category: entry.category } : {}),
      ...(entry.txHash ? { txHash: entry.txHash } : {}),
      lines: linesOf(entry)
    }))
    .sort((a, b) => a.timestamp - b.timestamp)
}

/**
 * Build the double-entry general ledger and its trial balance from the
 * consolidated feed.
 */
export function buildGeneralLedger(entries: readonly LedgerEntry[]): GeneralLedger {
  const journal = buildJournal(entries)

  const debits = new Map<AccountName, number>()
  const credits = new Map<AccountName, number>()
  for (const entry of journal) {
    for (const line of entry.lines) {
      debits.set(line.account, (debits.get(line.account) ?? 0) + line.debit)
      credits.set(line.account, (credits.get(line.account) ?? 0) + line.credit)
    }
  }

  let totalDebit = 0
  let totalCredit = 0
  let debitBalanceTotal = 0
  let creditBalanceTotal = 0
  const trialBalance: TrialBalanceRow[] = []

  // Iterate the chart in declared order so the trial balance reads top-down.
  for (const account of ACCOUNT_NAMES) {
    const grossDebit = round2(debits.get(account) ?? 0)
    const grossCredit = round2(credits.get(account) ?? 0)
    if (grossDebit === 0 && grossCredit === 0) continue

    totalDebit += grossDebit
    totalCredit += grossCredit
    const balance = round2(
      isDebitNormal(account) ? grossDebit - grossCredit : grossCredit - grossDebit
    )
    if (isDebitNormal(account)) debitBalanceTotal += balance
    else creditBalanceTotal += balance

    trialBalance.push({
      account,
      accountClass: classOf(account),
      totalDebit: grossDebit,
      totalCredit: grossCredit,
      balance
    })
  }

  totalDebit = round2(totalDebit)
  totalCredit = round2(totalCredit)
  debitBalanceTotal = round2(debitBalanceTotal)
  creditBalanceTotal = round2(creditBalanceTotal)

  return {
    entries: journal,
    trialBalance,
    totalDebit,
    totalCredit,
    debitBalanceTotal,
    creditBalanceTotal,
    balanced:
      Math.abs(totalDebit - totalCredit) < CENT &&
      Math.abs(debitBalanceTotal - creditBalanceTotal) < CENT
  }
}
