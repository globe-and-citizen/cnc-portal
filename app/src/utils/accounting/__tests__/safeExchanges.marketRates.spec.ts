import { describe, expect, it } from 'vitest'
import { assetId } from '@/utils/tokens/assets'
import { finalizeJournalEntryDrafts } from '../journalEntry'
import { journalLedgerRows } from '../journalLedgerPresenter'
import { applyHistoricalRates, historicalRateTargets } from '../toUsd'
import { buildAccountingSummary } from '../accountingSummary'
import { usd } from './fixtures'
import { drafts, history, TOKEN, tx } from './safeExchangeFixtures'

describe('Safe swap historical market valuation', () => {
  it('requests and applies the acquired asset historical price instead of inferring it from consideration', () => {
    const source = drafts(history(), 0)
    const acquired = source.find(
      (entry) =>
        entry.token === assetId(TOKEN, entry.asset?.chainId ?? 0) && entry.debit === 'Cash — Safe'
    )!
    expect(acquired.rate).toBe(0)
    expect(historicalRateTargets(source)).toContainEqual({
      token: acquired.token,
      date: '2026-06-02'
    })
    const valued = applyHistoricalRates(source, () => 1800)
    expect(valued.find((entry) => entry.id === acquired.id)?.rate).toBe(1800)
    const result = finalizeJournalEntryDrafts(valued)
    const purchase = result.journal.find((entry) => entry.txHash === tx(2))!
    expect(purchase.lines.find((line) => line.movement?.asset?.symbol === 'AWETH')?.debit).toBe(
      usd('18')
    )
    expect(
      purchase.lines.find((line) => line.account.family.name === 'Asset Exchange Loss')?.debit
    ).toBe(usd('2'))
    expect(journalLedgerRows([purchase]).find((row) => row.currency === 'AWETH')?.rate).toBe(
      '$1,800'
    )
    expect(acquired.rate).toBe(0)
  })
  it('balances the exact fractional DAI receipt using its own historical rate', () => {
    const rows = history().slice(0, 3)
    rows[0]!.value = '100000000'
    rows[1]!.value = '300000'
    rows[2]!.value = '286595379927822735'
    rows[2]!.tokenInfo = { ...rows[2]!.tokenInfo!, symbol: 'DAI', name: 'Dai' }
    const result = finalizeJournalEntryDrafts(drafts(rows, 0.999819))
    expect(result.assetDiagnostics).toEqual([])
    const swap = result.journal.find((entry) => entry.useCase === 'SAFE-SWAP')!
    const received = 286543506164055799084965n
    expect(swap.lines.find((line) => line.movement?.asset?.symbol === 'DAI')?.debit).toBe(received)
    expect(swap.lines.find((line) => line.movement?.token === 'usdc')?.credit).toBe(usd('0.3'))
    expect(
      swap.lines.find((line) => line.account.family.name === 'Asset Exchange Loss')?.debit
    ).toBe(usd('0.3') - received)
    expect(
      swap.lines.reduce((sum, line) => sum + (line.debit ?? 0n) - (line.credit ?? 0n), 0n)
    ).toBe(0n)
    expect(journalLedgerRows([swap]).find((row) => row.currency === 'DAI')).toMatchObject({
      quantity: '0.286595379927822735',
      rate: '$0.999819',
      dr: '$0.29'
    })
    const safeBalance = result.journal
      .flatMap((entry) => entry.lines)
      .filter((line) => line.account.family.name === 'Cash — Safe')
      .reduce((sum, line) => sum + (line.debit ?? 0n) - (line.credit ?? 0n), 0n)
    expect(safeBalance).toBe(usd('99.7') + received)
    expect(buildAccountingSummary(result.journal)).toMatchObject({
      cash: usd('99.7') + received,
      expense: usd('0.3') - received,
      transactionFees: 0n
    })
  })
  it('shows 98 dollars received and a two-dollar loss when swapping a 100-dollar Safe deposit', () => {
    const rows = history().slice(0, 3)
    rows[0]!.value = '100000000'
    rows[1]!.value = '100000000'
    rows[2]!.value = '98000000000000000000'
    const result = finalizeJournalEntryDrafts(drafts(rows, 1))
    expect(result.assetDiagnostics).toEqual([])
    const swap = result.journal.find((entry) => entry.useCase === 'SAFE-SWAP')!
    expect(swap.lines.find((line) => line.movement?.asset?.symbol === 'AWETH')?.debit).toBe(
      usd('98')
    )
    expect(swap.lines.find((line) => line.movement?.token === 'usdc')?.credit).toBe(usd('100'))
    expect(
      swap.lines.find((line) => line.account.family.name === 'Asset Exchange Loss')?.debit
    ).toBe(usd('2'))
    expect(journalLedgerRows([swap]).find((row) => row.currency === 'AWETH')?.rate).toBe('$1')
    expect(
      swap.lines.reduce((sum, line) => sum + (line.debit ?? 0n) - (line.credit ?? 0n), 0n)
    ).toBe(0n)
    expect(buildAccountingSummary(result.journal)).toMatchObject({
      cash: usd('98'),
      expense: usd('2')
    })
  })
  it('keeps an unpriced acquisition partial and never substitutes the stablecoin spent', () => {
    const source = drafts(history().slice(0, 3), 0)
    const result = finalizeJournalEntryDrafts(source)
    expect(result.assetDiagnostics).toContainEqual({
      kind: 'exchange-basis-unavailable',
      txHash: tx(2)
    })
    expect(
      result.journal
        .find((entry) => entry.useCase === 'SAFE-SWAP')!
        .lines.every((line) => (line.debit ?? line.credit) === 0n)
    ).toBe(true)
    expect(journalLedgerRows(result.journal).find((row) => row.currency === 'AWETH')?.rate).toBe(
      'Unavailable'
    )
    expect(historicalRateTargets(source).some((target) => target.date === '2026-06-02')).toBe(true)
  })
})
