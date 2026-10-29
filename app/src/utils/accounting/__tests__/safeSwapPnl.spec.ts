import { describe, expect, it } from 'vitest'
import { finalizeJournalEntryDrafts } from '../journalEntry'
import { journalLedgerRows } from '../journalLedgerPresenter'
import { presentBalance, presentIncome, presentTrial } from '../presenter'
import { withSafeSwapPnl } from '../safeSwapPnl'
import type { JournalEntry } from '../types'
import { usd } from './fixtures'
import { drafts, history, tx } from './safeExchangeFixtures'

const booksWith = (swaps: { txHash: string; pnlUsd: number }[], rows = history()) =>
  finalizeJournalEntryDrafts(withSafeSwapPnl(drafts(rows), swaps)).journal

const swapAt = (journal: readonly JournalEntry[], hash: string) =>
  journal.find((entry) => entry.txHash === hash)!

const lineOf = (entry: JournalEntry, account: string) =>
  entry.lines.find((line) => line.account.family.name === account)

const isBalanced = (entry: JournalEntry) =>
  entry.lines.reduce((sum, line) => sum + (line.debit ?? 0n) - (line.credit ?? 0n), 0n) === 0n

describe('Safe swap P&L in the books', () => {
  it('[AC-US-ACCT-002-16] keeps the purchase at the price paid and books the Safe P&L in the same posting', () => {
    const journal = booksWith([{ txHash: tx(2), pnlUsd: -70.91 }], history().slice(0, 3))
    const purchase = swapAt(journal, tx(2))
    expect(purchase.lines.find((line) => line.movement?.asset?.symbol === 'AWETH')?.debit).toBe(
      usd('20')
    )
    expect(lineOf(purchase, 'Swap P&L')?.debit).toBe(usd('70.91'))
    expect(lineOf(purchase, 'Safe Market Value Adjustment')?.credit).toBe(usd('70.91'))
    expect(isBalanced(purchase)).toBe(true)
  })

  it('debits the adjustment for a gain and shows the swap as a single ledger posting', () => {
    const journal = booksWith([{ txHash: tx(2), pnlUsd: 4 }], history().slice(0, 3))
    const purchase = swapAt(journal, tx(2))
    expect(lineOf(purchase, 'Safe Market Value Adjustment')?.debit).toBe(usd('4'))
    expect(lineOf(purchase, 'Swap P&L')?.credit).toBe(usd('4'))
    expect(journal.filter((entry) => entry.useCase === 'SAFE-SWAP')).toHaveLength(1)
    expect(journalLedgerRows(journal).find((row) => row.label === 'Asset exchange')?.category).toBe(
      'Swap'
    )
  })

  it('lists the adjustment right above Swap P&L in the ledger', () => {
    for (const pnlUsd of [4, -70.91]) {
      const journal = booksWith([{ txHash: tx(2), pnlUsd }], history().slice(0, 3))
      const accounts = journalLedgerRows([swapAt(journal, tx(2))]).map((row) => row.account)
      const pnlRow = accounts.indexOf('Swap P&L')
      expect(accounts[pnlRow - 1]).toBe('Safe Market Value Adjustment')
    }
  })

  it('books the Safe figure on one Swap P&L line and adjusts only what a sale did not realize', () => {
    const swap = swapAt(booksWith([{ txHash: tx(3), pnlUsd: 12 }]), tx(3))
    expect(lineOf(swap, 'Swap P&L')?.credit).toBe(usd('12'))
    expect(lineOf(swap, 'Safe Market Value Adjustment')?.debit).toBe(usd('1.341016'))
    expect(isBalanced(swap)).toBe(true)
  })

  it('books no adjustment for a swap the overview does not value', () => {
    const swap = swapAt(booksWith([]), tx(3))
    expect(lineOf(swap, 'Swap P&L')?.credit).toBe(usd('10.658984'))
    expect(lineOf(swap, 'Safe Market Value Adjustment')).toBeUndefined()
  })

  it('keeps Cash — Safe at the price paid while every report totals the Safe overview P&L', () => {
    const journal = booksWith([{ txHash: tx(2), pnlUsd: 4 }], history().slice(0, 3))
    expect(presentIncome(journal).revenueLines).toContainEqual(
      expect.objectContaining({ label: 'Swap P&L', value: '$4.00' })
    )
    const trial = presentTrial(journal)
    expect(trial.balanced).toBe(true)
    expect(trial.rows.find((row) => row.label === 'Cash — Safe')).toMatchObject({ dr: '$20.00' })
    expect(trial.rows.find((row) => row.label === 'Safe Market Value Adjustment')).toMatchObject({
      dr: '$4.00'
    })
    expect(presentBalance(journal).totalAssets).toBe('$24.00')
  })
})
