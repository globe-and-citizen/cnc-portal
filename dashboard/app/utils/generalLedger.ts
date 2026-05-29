import type { LedgerEntry } from '~/utils/accounting'
import type { RealizedTrade } from '~/utils/incomeStatement'

/**
 * Double-entry General Ledger for Polymarket activity — issue #1884.
 *
 * Every transaction is booked as a balanced set of journal lines (Σ debit =
 * Σ credit) against six accounts. Cash movements, contract acquisitions and
 * rewards come from the classified `LedgerEntry` feed; disposals (with cost
 * basis and realized P&L) come from `computeRealizedTrades`, so the two
 * sources are disjoint and never double-count.
 *
 * Booking rules
 *  - Deposit            Dr Cash            Cr Owner Capital
 *  - Withdrawal         Dr Owner Capital   Cr Cash
 *  - Buy / Split        Dr Open Contracts  Cr Cash
 *  - Reward             Dr Cash            Cr Rewards Income
 *  - Sell / Redeem      Dr Cash (proceeds) Cr Open Contracts (cost)
 *                       + Cr Trading Gains  or  Dr Trading Losses
 *  - Loss at resolution Dr Trading Losses  Cr Open Contracts
 */

export type AccountName
  = | 'Cash'
    | 'Open Contracts'
    | 'Owner Capital'
    | 'Trading Gains'
    | 'Trading Losses'
    | 'Rewards Income'

export type AccountClass = 'ASSET' | 'EQUITY' | 'INCOME' | 'EXPENSE'

/** Accounting class of each account — drives the natural (normal) balance side. */
export const ACCOUNT_CLASS: Record<AccountName, AccountClass> = {
  'Cash': 'ASSET',
  'Open Contracts': 'ASSET',
  'Owner Capital': 'EQUITY',
  'Trading Gains': 'INCOME',
  'Trading Losses': 'EXPENSE',
  'Rewards Income': 'INCOME'
}

/** ASSET and EXPENSE accounts are debit-normal; EQUITY and INCOME are credit-normal. */
function isDebitNormal(account: AccountName): boolean {
  const cls = ACCOUNT_CLASS[account]
  return cls === 'ASSET' || cls === 'EXPENSE'
}

export interface JournalLine {
  account: AccountName
  debit: number
  credit: number
}

export interface JournalEntry {
  id: string
  /** Unix seconds. */
  timestamp: number
  description: string
  market?: string
  outcome?: string
  /** Transaction hash, when known. */
  reference?: string
  lines: JournalLine[]
}

export interface TrialBalanceRow {
  account: AccountName
  accountClass: AccountClass
  totalDebit: number
  totalCredit: number
  /** Balance in the account's normal direction (always ≥ 0 for clean books). */
  balance: number
}

export interface GeneralLedger {
  entries: JournalEntry[]
  trialBalance: TrialBalanceRow[]
  totalDebit: number
  totalCredit: number
  /** True when total debits equal total credits (to the cent). */
  balanced: boolean
}

export interface BuildGeneralLedgerInput {
  ledgerEntries: LedgerEntry[]
  realizedTrades: RealizedTrade[]
  /** Inclusive lower bound (unix seconds); omit for all-time. */
  periodStart?: number
  /** Inclusive upper bound (unix seconds); omit for all-time. */
  asOf?: number
}

/** Rounds to 6 decimals (USDC precision) to keep journal lines free of float dust. */
function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6
}

function debit(account: AccountName, amount: number): JournalLine {
  return { account, debit: round6(amount), credit: 0 }
}

function credit(account: AccountName, amount: number): JournalLine {
  return { account, debit: 0, credit: round6(amount) }
}

const DISPOSAL_LABEL: Record<RealizedTrade['kind'], string> = {
  SELL: 'Sell',
  REDEEM: 'Redeem',
  MERGE: 'Merge',
  RESOLUTION_LOSS: 'Loss at resolution'
}

/**
 * Builds just the journal entries (no trial balance). Exported so the merged
 * Activity Ledger can attach journal lines to its activity rows without
 * recomputing the trial balance on every render.
 */
function inPeriod(timestamp: number, periodStart?: number, asOf?: number): boolean {
  if (periodStart != null && timestamp < periodStart) {
    return false
  }
  const end = asOf ?? Number.POSITIVE_INFINITY
  return timestamp <= end
}

export function buildJournalEntries(input: BuildGeneralLedgerInput): JournalEntry[] {
  const entries: JournalEntry[] = []

  // Cash movements, acquisitions and rewards — from the classified ledger feed.
  for (const e of input.ledgerEntries) {
    if (!inPeriod(e.timestamp, input.periodStart, input.asOf)) {
      continue
    }
    let lines: JournalLine[] | null = null
    switch (e.category) {
      case 'DEPOSIT':
        lines = [debit('Cash', e.amount), credit('Owner Capital', e.amount)]
        break
      case 'WITHDRAWAL':
        lines = [debit('Owner Capital', e.amount), credit('Cash', e.amount)]
        break
      case 'TRADE_BUY':
      case 'SPLIT':
        lines = [debit('Open Contracts', e.amount), credit('Cash', e.amount)]
        break
      case 'REWARD':
      case 'MAKER_REBATE':
      case 'REFERRAL_REWARD':
        lines = [debit('Cash', e.amount), credit('Rewards Income', e.amount)]
        break
      default:
        // SELL / REDEEM / MERGE are booked from realizedTrades; CONVERSION/OTHER skipped.
        lines = null
    }
    if (lines) {
      entries.push({
        id: `gl-${e.id}`,
        timestamp: e.timestamp,
        description: e.description,
        market: e.source === 'polymarket' ? e.description : undefined,
        outcome: e.outcome,
        reference: e.txHash,
        lines
      })
    }
  }

  // Disposals — proceeds, cost basis and realized P&L from lot accounting.
  for (const t of input.realizedTrades) {
    if (!inPeriod(t.timestamp, input.periodStart, input.asOf)) {
      continue
    }
    const lines: JournalLine[] = []
    if (t.kind === 'RESOLUTION_LOSS') {
      lines.push(debit('Trading Losses', t.costBasis))
      lines.push(credit('Open Contracts', t.costBasis))
    } else {
      if (t.proceeds > 0) {
        lines.push(debit('Cash', t.proceeds))
      }
      if (t.realizedPnl < 0) {
        lines.push(debit('Trading Losses', -t.realizedPnl))
      }
      lines.push(credit('Open Contracts', t.costBasis))
      if (t.realizedPnl > 0) {
        lines.push(credit('Trading Gains', t.realizedPnl))
      }
    }
    entries.push({
      id: `gl-rt-${t.asset ?? 'na'}-${t.timestamp}-${t.kind}`,
      timestamp: t.timestamp,
      description: `${DISPOSAL_LABEL[t.kind]} — ${t.market}`,
      market: t.market,
      outcome: t.outcome,
      lines
    })
  }

  return entries
}

/** Builds the double-entry general ledger and its trial balance. */
export function buildGeneralLedger(input: BuildGeneralLedgerInput): GeneralLedger {
  const entries = buildJournalEntries(input)

  // A ledger is read chronologically.
  entries.sort((a, b) => a.timestamp - b.timestamp)

  // --- Trial balance ---
  const accounts = Object.keys(ACCOUNT_CLASS) as AccountName[]
  const debits = new Map<AccountName, number>()
  const credits = new Map<AccountName, number>()
  for (const account of accounts) {
    debits.set(account, 0)
    credits.set(account, 0)
  }
  for (const entry of entries) {
    for (const line of entry.lines) {
      debits.set(line.account, (debits.get(line.account) ?? 0) + line.debit)
      credits.set(line.account, (credits.get(line.account) ?? 0) + line.credit)
    }
  }

  let totalDebit = 0
  let totalCredit = 0
  const trialBalance: TrialBalanceRow[] = accounts.map((account) => {
    const totalDebitAcc = round6(debits.get(account) ?? 0)
    const totalCreditAcc = round6(credits.get(account) ?? 0)
    totalDebit += totalDebitAcc
    totalCredit += totalCreditAcc
    const balance = isDebitNormal(account)
      ? totalDebitAcc - totalCreditAcc
      : totalCreditAcc - totalDebitAcc
    return {
      account,
      accountClass: ACCOUNT_CLASS[account],
      totalDebit: totalDebitAcc,
      totalCredit: totalCreditAcc,
      balance: round6(balance)
    }
  })

  return {
    entries,
    trialBalance,
    totalDebit: round6(totalDebit),
    totalCredit: round6(totalCredit),
    balanced: Math.abs(totalDebit - totalCredit) < 0.01
  }
}
