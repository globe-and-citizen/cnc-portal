import { describe, expect, it } from 'vitest'
import { finalizeJournalEntryDrafts } from '../journalEntry'
import { journalLedgerRows } from '../journalLedgerPresenter'
import { historicalRateTargets } from '../toUsd'
import { buildAccountingSummary } from '../accountingSummary'
import { usd } from './fixtures'
import { drafts, history } from './safeExchangeFixtures'

const purchaseOf = (rows = history().slice(0, 3), marketRate = 2000) =>
  finalizeJournalEntryDrafts(drafts(rows, marketRate))

const swapOf = (result: ReturnType<typeof purchaseOf>) =>
  result.journal.find((entry) => entry.useCase === 'SAFE-SWAP')!

describe('Safe swap price paid', () => {
  it('values the acquired asset at the price paid instead of its historical market price', () => {
    const result = purchaseOf(history().slice(0, 3), 1800)
    const swap = swapOf(result)
    expect(swap.lines.find((line) => line.movement?.asset?.symbol === 'AWETH')?.debit).toBe(
      usd('20')
    )
    expect(journalLedgerRows([swap]).find((row) => row.currency === 'AWETH')?.rate).toBe('$2,000')
  })
  it('books an unpriced acquisition completely and requests no market price for it', () => {
    const rows = history().slice(0, 3)
    const result = purchaseOf(rows, 0)
    expect(result.assetDiagnostics).toEqual([])
    expect(
      swapOf(result).lines.find((line) => line.movement?.asset?.symbol === 'AWETH')?.debit
    ).toBe(usd('20'))
    expect(historicalRateTargets(drafts(rows, 0))).toEqual([])
  })
  it('keeps a fractional receipt at the exact price paid', () => {
    const rows = history().slice(0, 3)
    rows[0]!.value = '100000000'
    rows[1]!.value = '300000'
    rows[2]!.value = '286595379927822735'
    rows[2]!.tokenInfo = { ...rows[2]!.tokenInfo!, symbol: 'DAI', name: 'Dai' }
    const result = purchaseOf(rows, 0.999819)
    expect(result.assetDiagnostics).toEqual([])
    const swap = swapOf(result)
    expect(swap.lines.find((line) => line.movement?.asset?.symbol === 'DAI')?.debit).toBe(
      usd('0.3')
    )
    expect(
      swap.lines.reduce((sum, line) => sum + (line.debit ?? 0n) - (line.credit ?? 0n), 0n)
    ).toBe(0n)
    expect(journalLedgerRows([swap]).find((row) => row.currency === 'DAI')?.quantity).toBe(
      '0.286595379927822735'
    )
    expect(buildAccountingSummary(result.journal)).toMatchObject({ cash: usd('100'), expense: 0n })
  })
  it('carries a whole 100-dollar deposit into 98 tokens instead of booking a loss', () => {
    const rows = history().slice(0, 3)
    rows[0]!.value = '100000000'
    rows[1]!.value = '100000000'
    rows[2]!.value = '98000000000000000000'
    const result = purchaseOf(rows, 1)
    expect(result.assetDiagnostics).toEqual([])
    expect(
      swapOf(result).lines.find((line) => line.movement?.asset?.symbol === 'AWETH')?.debit
    ).toBe(usd('100'))
    expect(buildAccountingSummary(result.journal)).toMatchObject({
      cash: usd('100'),
      expense: 0n
    })
  })
})
