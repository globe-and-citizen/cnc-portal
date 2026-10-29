import { describe, expect, it } from 'vitest'
import { USDC_ADDRESS, USDT_ADDRESS } from '@/constant'
import type { CowOrder } from '@/types/cow'
import { buildCncJournalEntryDrafts } from '../assemble'
import { finalizeJournalEntryDrafts } from '../journalEntry'
import { journalLedgerRows } from '../journalLedgerPresenter'
import { presentIncome, presentTrial } from '../presenter'
import type { JournalEntry } from '../types'
import { usd, ADDR } from './fixtures'
import { drafts, history, ROUTER, TOKEN, transfer, tx } from './safeExchangeFixtures'

const lineOf = (entry: JournalEntry, account: string) =>
  entry.lines.find((line) => line.account.family.name === account)

const swapAt = (hash: string, journal: readonly JournalEntry[]) =>
  journal.find((entry) => entry.txHash === hash)!

const isBalanced = (entry: JournalEntry) =>
  entry.lines.reduce((sum, line) => sum + (line.debit ?? 0n) - (line.credit ?? 0n), 0n) === 0n

/** 20 USDC swapped for 19.5 USDT: 0.50 lost to slippage. */
const stablecoinSwap = () => {
  const tether = transfer(2, 1, ROUTER, ADDR.safe, USDT_ADDRESS, '19500000')
  tether.tokenInfo = { ...tether.tokenInfo!, name: 'Tether', symbol: 'USDT' }
  return finalizeJournalEntryDrafts(drafts([...history().slice(0, 2), tether]))
}

describe('Safe Swap P&L', () => {
  it('[AC-US-ACCT-002-15] credits Swap P&L with the gain of a sale into a USD stablecoin', () => {
    const result = finalizeJournalEntryDrafts(drafts())
    expect(result.assetDiagnostics).toEqual([])
    const sale = swapAt(tx(3), result.journal)
    expect(lineOf(sale, 'Swap P&L')?.credit).toBe(usd('10.658984'))
    expect(sale.lines.find((line) => line.movement?.token === 'usdc')?.debit).toBe(usd('30.658984'))
    expect(sale.lines.find((line) => line.movement?.asset?.symbol === 'AWETH')?.credit).toBe(
      usd('20')
    )
    expect(isBalanced(sale)).toBe(true)
  })

  it('debits Swap P&L with the amount lost between two USD stablecoins', () => {
    const result = stablecoinSwap()
    expect(result.assetDiagnostics).toEqual([])
    const swap = swapAt(tx(2), result.journal)
    expect(swap.lines.find((line) => line.movement?.token === 'usdt')?.debit).toBe(usd('19.5'))
    expect(lineOf(swap, 'Swap P&L')?.debit).toBe(usd('0.5'))
    expect(isBalanced(swap)).toBe(true)
  })

  it('keeps the reported CoW fee out of Swap P&L', () => {
    const feeInAsset: CowOrder = {
      owner: ADDR.safe,
      status: 'fulfilled',
      sellToken: TOKEN,
      buyToken: USDC_ADDRESS,
      executedFee: '100000000000000',
      executedFeeToken: TOKEN
    }
    const { journal } = finalizeJournalEntryDrafts(
      buildCncJournalEntryDrafts({
        safeAddress: ADDR.safe,
        safeAssetTransfers: history(),
        safeSwapOrders: [{ txHash: tx(3), data: [feeInAsset] }],
        rateOfRecord: () => 2000
      })
    )
    const sale = swapAt(tx(3), journal)
    expect(lineOf(sale, 'Transaction Fee Expense')?.debit).toBe(usd('0.2'))
    expect(lineOf(sale, 'Swap P&L')?.credit).toBe(usd('10.858984'))
    expect(isBalanced(sale)).toBe(true)
  })

  it('books no Swap P&L when the asset received carries the price paid', () => {
    const { journal } = finalizeJournalEntryDrafts(drafts())
    expect(lineOf(swapAt(tx(2), journal), 'Swap P&L')).toBeUndefined()
  })

  it('shows Swap P&L on the income statement, the trial balance and the general ledger', () => {
    const { journal } = finalizeJournalEntryDrafts(drafts())
    expect(presentIncome(journal).revenueLines).toContainEqual({
      label: 'Swap P&L',
      value: '$10.66',
      account: 'Swap P&L',
      negative: false
    })
    expect(presentTrial(journal).rows.find((row) => row.label === 'Swap P&L')?.cr).toBe('$10.66')
    expect(journalLedgerRows(journal).find((row) => row.account === 'Swap P&L')?.cr).toBe('$10.66')
  })

  it('marks a Swap P&L loss as a negative revenue line', () => {
    expect(presentIncome(stablecoinSwap().journal).revenueLines).toContainEqual({
      label: 'Swap P&L',
      value: '-$0.50',
      account: 'Swap P&L',
      negative: true
    })
  })
})
