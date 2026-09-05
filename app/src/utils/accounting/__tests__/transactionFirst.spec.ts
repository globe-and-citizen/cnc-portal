/**
 * Transaction-first read model — cross-report reconciliation (issue #2678).
 *
 * Proves the shared invariant the whole accounting read model rests on: every
 * source maps into balanced journal transactions before any report-specific
 * projection runs, and every report — the general ledger, the trial balance, the
 * statements' roll-up, account drill-downs, and the exports — derives from those
 * same lines. No report reconstructs an alternative debit or credit leg.
 *
 * PDF and spreadsheet builders reuse these journal projections and have their
 * own export regression suites.
 *
 * Fixtures cover the scenarios the ticket enumerates: ordinary transfers,
 * transfers with fees, standalone fees, classified cash movements, multi-line
 * transactions, date boundaries, and multi-currency reporting.
 */
import { describe, it, expect } from 'vitest'
import { buildJournal, buildGeneralLedger } from '@/utils/accounting/generalLedger'
import { accountFor } from '@/utils/accounting/accountRegistry'
const FEE_ACCOUNT = 'Transaction Fee Expense'
const FEE_ACCOUNT_ID = accountFor(FEE_ACCOUNT).id
import { entriesForAccount } from '@/utils/accounting/accountLedger'
import { journalLedgerRows, presentJournalLedger } from '@/utils/accounting/journalLedgerPresenter'
import { money } from '@/utils/accounting/presenter'
import type { LedgerEntry } from '@/utils/accounting/ledgerEntry'

/** A 64-hex transaction hash, so a fee and its transfer pair by shared tx. */
const TX = (n: number): string => `0x${String(n).padStart(64, '0')}`

const DAY = 86_400
const day = (n: number): number => 1_700_000_000 + n * DAY

// Orphan fee source evidence: withheld from the journal until its Bank outflow is available.
const standaloneFee: LedgerEntry = {
  id: `${TX(1)}-1`,
  timestamp: day(1),
  useCase: 'FEE',
  debit: FEE_ACCOUNT,
  credit: 'Cash — Bank',
  amountUsd: 0.5,
  token: 'usdc',
  rawAmount: '500000',
  internal: false,
  memo: 'Transaction fee skimmed from Bank',
  enrichment: 'not-applicable'
}

// A client payment an owner manually classified as Service Revenue.
const classifiedRevenue: LedgerEntry = {
  id: `${TX(2)}-0`,
  timestamp: day(2),
  useCase: 'CASH-IN',
  debit: 'Cash — Bank',
  credit: 'Service Revenue',
  amountUsd: 100,
  token: 'usdc',
  rawAmount: '100000000',
  internal: false,
  classified: 'REVENUE',
  memo: 'Client payment',
  enrichment: 'not-applicable'
}

// An ordinary internal transfer, no fee — Bank funds the Payroll pocket.
const ordinaryTransfer: LedgerEntry = {
  id: `${TX(3)}-0`,
  timestamp: day(2),
  useCase: 'UC-BANK-03',
  debit: 'Cash — Payroll',
  credit: 'Cash — Bank',
  amountUsd: 30,
  token: 'usdc',
  rawAmount: '30000000',
  internal: true,
  memo: 'Fund payroll',
  enrichment: 'not-applicable'
}

// A transfer and its fee share a transaction and become one three-line JournalEntry.
const feeTransferOut: LedgerEntry = {
  id: `${TX(4)}-0`,
  timestamp: day(3),
  useCase: 'UC-BANK-03',
  debit: 'Cash — Expense',
  credit: 'Cash — Bank',
  amountUsd: 10,
  token: 'usdc',
  rawAmount: '10000000',
  internal: true,
  memo: 'Fund expenses (net of fee)',
  enrichment: 'not-applicable'
}
const feeTransferFee: LedgerEntry = {
  id: `${TX(4)}-1`,
  timestamp: day(3),
  useCase: 'FEE',
  debit: FEE_ACCOUNT,
  credit: 'Cash — Bank',
  amountUsd: 0.05,
  token: 'usdc',
  rawAmount: '50000',
  internal: false,
  memo: 'Transaction fee on the funding transfer',
  enrichment: 'not-applicable'
}

// A native-token internal transfer — the multi-currency case (POL, not USDC).
const nativeTransfer: LedgerEntry = {
  id: `${TX(5)}-0`,
  timestamp: day(4),
  useCase: 'UC-BANK-03',
  debit: 'Cash — Safe',
  credit: 'Cash — Bank',
  amountUsd: 8,
  token: 'native',
  rawAmount: '100000000000000000000',
  rate: 0.08,
  internal: true,
  memo: 'Sweep to Safe',
  enrichment: 'not-applicable'
}

/** The whole book, canonical feed (fee and its transfer are separate postings). */
const book: LedgerEntry[] = [
  standaloneFee,
  classifiedRevenue,
  ordinaryTransfer,
  feeTransferOut,
  feeTransferFee,
  nativeTransfer
]

describe('transaction-first read model — the general ledger shows complete transactions', () => {
  it('renders each selected transaction with all of its balanced lines', () => {
    const view = presentJournalLedger(buildJournal(book))
    // Ordinary transfer → 2 lines, classified revenue → 2, native transfer → 2,
    // fee transfer → 3; the orphan fee is withheld.
    expect(view.entryCount).toBe(4) // six source postings, one orphan withheld and one shared transaction
    expect(view.rows).toHaveLength(2 + 2 + 2 + 3)
    const feeRows = view.rows.filter((r) => r.account === FEE_ACCOUNT)
    expect(feeRows).toHaveLength(1) // only the fee attached to a Bank outflow
  })

  it('keeps a classified cash movement whole, with both its legs', () => {
    const view = presentJournalLedger(buildJournal([classifiedRevenue]))
    expect(view.rows.map((r) => r.account)).toEqual(['Cash — Bank', 'Service Revenue'])
    expect(view.rows.map((r) => r.dr || r.cr)).toEqual(['$100.00', '$100.00'])
  })
})

describe('transaction-first read model — the fee account filter preserves whole transactions', () => {
  it('selects only fee-bearing transactions and renders each of them whole', () => {
    const view = presentJournalLedger(buildJournal(book), null, null, null, [FEE_ACCOUNT_ID])
    // The fee-bearing transfer stays whole; orphan fee evidence stays withheld.
    expect(view.entryCount).toBe(1)
    expect(view.rows).toHaveLength(3)
    expect(view.rows.some((r) => r.account === FEE_ACCOUNT)).toBe(true)
  })

  it('shows a fee transaction identically in the fee account filter and the general ledger', () => {
    const feeView = presentJournalLedger(
      buildJournal([feeTransferOut, feeTransferFee]),
      null,
      null,
      null,
      [FEE_ACCOUNT_ID]
    )
    const allView = presentJournalLedger(buildJournal([feeTransferOut, feeTransferFee]))
    expect(feeView.rows).toEqual(allView.rows)
    expect(feeView.total).toBe(allView.total)
  })

  it('preserves each transaction total — no fee-only sum', () => {
    const view = presentJournalLedger(buildJournal(book), null, null, null, [FEE_ACCOUNT_ID])
    // The total is the ordinary "Total movements" figure over the whole selected
    // transactions (net legs + folded fees), taken over the same selection
    // `presentJournalLedger` renders — never a fee-only sum ($0.05 here).
    expect(view.total).toBe('$10.05')
    expect(view.total).not.toBe(money(0.05))
  })
})

describe('transaction-first read model — the trial balance aggregates the same lines', () => {
  it('stays balanced gross and net over the whole book', () => {
    const gl = buildGeneralLedger(buildJournal(book))
    expect(gl.balanced).toBe(true)
    expect(gl.totalDebit).toBeCloseTo(gl.totalCredit, 2)
    expect(gl.debitBalanceTotal).toBeCloseTo(gl.creditBalanceTotal, 2)
  })

  it('remains balanced for a narrowed reporting boundary', () => {
    // Only the postings up to and including day 2 — a point-in-time boundary.
    const asOfDay2 = book.filter((e) => e.timestamp <= day(2))
    const gl = buildGeneralLedger(buildJournal(asOfDay2))
    expect(asOfDay2.length).toBeGreaterThan(0)
    expect(gl.balanced).toBe(true)
    expect(gl.totalDebit).toBeCloseTo(gl.totalCredit, 2)
    // The day-3 fee transfer and day-4 native sweep are excluded from the boundary.
    expect(gl.trialBalance.some((r) => r.account.family.name === 'Cash — Safe')).toBe(false)
  })

  it('excludes an orphan fee from the canonical JournalEntry balance', () => {
    const gl = buildGeneralLedger(buildJournal(book))
    const feeRow = gl.trialBalance.find((r) => r.account.family.name === FEE_ACCOUNT)
    expect(feeRow?.balance).toBeCloseTo(0.05, 2)
  })
})

describe('transaction-first read model — drill-downs reconcile with the general ledger', () => {
  it('renders a transaction with the same lines and values as the general ledger', () => {
    // Drill into Bank: the fee transfer touches Bank, so its folded three-line
    // posting must read exactly as it does in the "All" ledger.
    const journal = buildJournal([feeTransferOut, feeTransferFee])
    const drill = journalLedgerRows(entriesForAccount(journal, 'Cash — Bank'), journal)
    const all = presentJournalLedger(journal)
    const accounts = (rows: typeof all.rows): string[] => rows.map((r) => r.account)
    expect(accounts(drill)).toEqual(accounts(all.rows))
    expect(drill.map((r) => r.dr)).toEqual(all.rows.map((r) => r.dr))
    expect(drill.map((r) => r.cr)).toEqual(all.rows.map((r) => r.cr))
  })

  it('selects transactions touching the account and keeps their whole context', () => {
    const scoped = entriesForAccount(buildJournal(book), 'Cash — Bank')
    // Every matching operation stays whole through its complete journal lines.
    expect(scoped.some((entry) => entry.sourceOperationId === TX(2))).toBe(true)
    expect(scoped.some((entry) => entry.sourceOperationId === TX(3))).toBe(true)
    expect(scoped.some((entry) => entry.sourceOperationId === TX(4))).toBe(true)
    expect(scoped.some((entry) => entry.sourceOperationId === TX(1))).toBe(false)
  })
})

describe('transaction-first read model — date boundaries', () => {
  it('includes a transaction exactly on the window edges and excludes those outside', () => {
    const from = new Date(day(2) * 1000)
    const to = new Date(day(3) * 1000)
    const view = presentJournalLedger(buildJournal(book), from, to)
    // day 1 (standalone fee) and day 4 (native transfer) fall outside.
    expect(view.rows.some((r) => r.account === 'Cash — Safe')).toBe(false)
    // day 2 and day 3 postings are in — including the fee transfer's fee leg.
    expect(view.rows.some((r) => r.account === 'Service Revenue')).toBe(true)
    expect(view.rows.some((r) => r.account === FEE_ACCOUNT)).toBe(true)
  })
})

describe('transaction-first read model — multi-currency reporting', () => {
  it('reports every currency present and keeps whole transactions when filtered', () => {
    const currencies = [
      ...new Set(
        presentJournalLedger(buildJournal(book))
          .rows.map((row) => row.currency)
          .filter(Boolean)
      )
    ]
    expect(currencies).toContain('USDC')
    expect(currencies.length).toBeGreaterThanOrEqual(2) // USDC and the native symbol
    const nativeSymbol = currencies.find((c) => c !== 'USDC')!
    const view = presentJournalLedger(buildJournal(book), null, null, [nativeSymbol])
    // Only the native transfer survives — and it survives whole (both legs).
    expect(view.entryCount).toBe(1)
    expect(view.rows.map((r) => r.account)).toEqual(['Cash — Safe', 'Cash — Bank'])
  })

  it('keeps the trial balance balanced across currencies', () => {
    const gl = buildGeneralLedger(buildJournal(book))
    expect(gl.balanced).toBe(true)
  })
})
