/**
 * Transaction-first read model — cross-report reconciliation (issue #2678).
 *
 * Proves the shared invariant the whole accounting read model rests on: every
 * source maps into balanced journal transactions before any report-specific
 * projection runs, and every report — the general ledger, the trial balance, the
 * statements' roll-up, account drill-downs, and the exports — derives from those
 * same lines. No report reconstructs an alternative debit or credit leg.
 *
 * The exports are not re-tested here directly: the PDF and Excel builders render
 * the ledger through the exact functions asserted below — `presentLedger`
 * (`lib/accounting/pdf.ts`, `spreadsheet.ts`) and `presentAccountLedger` for a
 * drill-down — so proving those projections reconcile is proving the exports do.
 *
 * Fixtures cover the scenarios the ticket enumerates: ordinary transfers,
 * transfers with fees, standalone fees, classified cash movements, multi-line
 * transactions, date boundaries, and multi-currency reporting.
 */
import { describe, it, expect } from 'vitest'
import { buildJournal, buildGeneralLedger } from '@/utils/accounting/generalLedger'
import {
  presentLedger,
  filterLedgerEntries,
  ledgerTotal,
  ledgerCurrencies,
  FEE_ACCOUNT,
  FEE_FILTER
} from '@/utils/accounting/ledgerPresenter'
import { presentAccountLedger, entriesForAccount } from '@/utils/accounting/accountLedger'
import { money } from '@/utils/accounting/presenter'
import type { LedgerEntry } from '@/utils/accounting/ledgerEntry'

/** A 64-hex transaction hash, so a fee and its transfer pair by shared tx. */
const TX = (n: number): string => `0x${String(n).padStart(64, '0')}`

const DAY = 86_400
const day = (n: number): number => 1_700_000_000 + n * DAY

// A protocol fee skimmed from Bank in its own transaction — no transfer in view,
// so it stays a standalone posting (Dr Transaction Fee Expense · Cr Cash — Bank).
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

// A transfer that skimmed a fee in the SAME transaction — a standalone fee whose
// hash matches the transfer's, so `presentLedger` folds the two into one
// three-line posting (Dr net · Dr fee · Cr gross). Both stay separate in the
// canonical feed the trial balance rolls up.
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
    const view = presentLedger(book, 'All')
    // Ordinary transfer → 2 lines, classified revenue → 2, native transfer → 2,
    // standalone fee → 2, and the fee transfer folds to 3 (Dr net · Dr fee · Cr gross).
    expect(view.entryCount).toBe(5) // six postings, two folded into one
    expect(view.rows).toHaveLength(2 + 2 + 2 + 2 + 3)
    const feeRows = view.rows.filter((r) => r.account === FEE_ACCOUNT)
    expect(feeRows).toHaveLength(2) // the standalone fee and the folded fee leg
  })

  it('keeps a classified cash movement whole, with both its legs', () => {
    const view = presentLedger([classifiedRevenue], 'All')
    expect(view.rows.map((r) => r.account)).toEqual(['Cash — Bank', 'Service Revenue'])
    expect(view.rows.map((r) => r.dr || r.cr)).toEqual(['$100.00', '$100.00'])
  })
})

describe('transaction-first read model — the fee filter preserves whole transactions', () => {
  it('selects only fee-bearing transactions and renders each of them whole', () => {
    const view = presentLedger(book, FEE_FILTER)
    // The standalone fee (2 lines) and the fee transfer (3 lines) — nothing else.
    expect(view.entryCount).toBe(2)
    expect(view.rows).toHaveLength(2 + 3)
    expect(view.rows.some((r) => r.isFee && r.account === FEE_ACCOUNT)).toBe(true)
  })

  it('shows a fee transaction identically in the fee filter and the general ledger', () => {
    const feeView = presentLedger([feeTransferOut, feeTransferFee], FEE_FILTER)
    const allView = presentLedger([feeTransferOut, feeTransferFee], 'All')
    expect(feeView.rows).toEqual(allView.rows)
    expect(feeView.total).toBe(allView.total)
  })

  it('preserves each transaction total — no fee-only sum', () => {
    const view = presentLedger(book, FEE_FILTER)
    // The total is the ordinary "Total movements" figure over the whole selected
    // transactions (net legs + folded fees), taken over the same selection
    // `presentLedger` renders — never a fee-only sum ($0.55 here).
    const selected = filterLedgerEntries(book, FEE_FILTER)
    expect(view.total).toBe(ledgerTotal(selected))
    expect(view.total).not.toBe(money(0.55))
  })
})

describe('transaction-first read model — the trial balance aggregates the same lines', () => {
  it('stays balanced gross and net over the whole book', () => {
    const gl = buildGeneralLedger(book)
    expect(gl.balanced).toBe(true)
    expect(gl.totalDebit).toBeCloseTo(gl.totalCredit, 2)
    expect(gl.debitBalanceTotal).toBeCloseTo(gl.creditBalanceTotal, 2)
  })

  it('remains balanced for a narrowed reporting boundary', () => {
    // Only the postings up to and including day 2 — a point-in-time boundary.
    const asOfDay2 = book.filter((e) => e.timestamp <= day(2))
    const gl = buildGeneralLedger(asOfDay2)
    expect(asOfDay2.length).toBeGreaterThan(0)
    expect(gl.balanced).toBe(true)
    expect(gl.totalDebit).toBeCloseTo(gl.totalCredit, 2)
    // The day-3 fee transfer and day-4 native sweep are excluded from the boundary.
    expect(gl.trialBalance.some((r) => r.account === 'Cash — Safe')).toBe(false)
  })

  it('rolls the folded and standalone fee legs into one Transaction Fee Expense balance', () => {
    const gl = buildGeneralLedger(book)
    const feeRow = gl.trialBalance.find((r) => r.account === FEE_ACCOUNT)
    // 0.5 standalone + 0.05 on the transfer.
    expect(feeRow?.balance).toBeCloseTo(0.55, 2)
  })
})

describe('transaction-first read model — drill-downs reconcile with the general ledger', () => {
  it('renders a transaction with the same lines and values as the general ledger', () => {
    // Drill into Bank: the fee transfer touches Bank, so its folded three-line
    // posting must read exactly as it does in the "All" ledger.
    const drill = presentAccountLedger([feeTransferOut, feeTransferFee], 'Cash — Bank')
    const all = presentLedger([feeTransferOut, feeTransferFee], 'All')
    const accounts = (rows: typeof all.rows): string[] => rows.map((r) => r.account)
    expect(accounts(drill.rows)).toEqual(accounts(all.rows))
    expect(drill.rows.map((r) => r.dr)).toEqual(all.rows.map((r) => r.dr))
    expect(drill.rows.map((r) => r.cr)).toEqual(all.rows.map((r) => r.cr))
  })

  it('selects transactions touching the account and keeps their whole context', () => {
    const scoped = entriesForAccount(book, 'Cash — Bank')
    // Every posting that credits or debits Bank is kept whole (both legs present).
    expect(scoped).toContain(classifiedRevenue)
    expect(scoped).toContain(ordinaryTransfer)
    expect(scoped).toContain(feeTransferOut)
    for (const entry of scoped) expect(buildJournal([entry])).toHaveLength(1)
  })
})

describe('transaction-first read model — date boundaries', () => {
  it('includes a transaction exactly on the window edges and excludes those outside', () => {
    const from = new Date(day(2) * 1000)
    const to = new Date(day(3) * 1000)
    const view = presentLedger(book, 'All', from, to)
    // day 1 (standalone fee) and day 4 (native transfer) fall outside.
    expect(view.rows.some((r) => r.account === 'Cash — Safe')).toBe(false)
    // day 2 and day 3 postings are in — including the fee transfer's fee leg.
    expect(view.rows.some((r) => r.account === 'Service Revenue')).toBe(true)
    expect(view.rows.some((r) => r.isFee && r.account === FEE_ACCOUNT)).toBe(true)
  })
})

describe('transaction-first read model — multi-currency reporting', () => {
  it('reports every currency present and keeps whole transactions when filtered', () => {
    const currencies = ledgerCurrencies(book)
    expect(currencies).toContain('USDC')
    expect(currencies.length).toBeGreaterThanOrEqual(2) // USDC and the native symbol
    const nativeSymbol = currencies.find((c) => c !== 'USDC')!
    const view = presentLedger(book, 'All', null, null, [nativeSymbol])
    // Only the native transfer survives — and it survives whole (both legs).
    expect(view.entryCount).toBe(1)
    expect(view.rows.map((r) => r.account)).toEqual(['Cash — Safe', 'Cash — Bank'])
  })

  it('keeps the trial balance balanced across currencies', () => {
    const gl = buildGeneralLedger(book)
    expect(gl.balanced).toBe(true)
  })
})
