import { describe, expect, it } from 'vitest'
import { USDC_ADDRESS, USDT_ADDRESS } from '@/constant'
import { finalizeJournalEntryDrafts } from '../journalEntry'
import { journalLedgerRows } from '../journalLedgerPresenter'
import { applyHistoricalRates, historicalRateTargets } from '../toUsd'
import { buildAccountingSummary } from '../accountingSummary'
import { usd, ADDR } from './fixtures'
import { drafts, history, TOKEN, tx, transfer, ROUTER } from './safeExchangeFixtures'

describe('Safe swap executed consideration valuation', () => {
  it('[AC-US-ACCT-002-14] keeps execution quantities distinct from the market rate of record', () => {
    const purchase = finalizeJournalEntryDrafts(drafts(history().slice(0, 3), 1800)).journal.find(
      (entry) => entry.txHash === tx(2)
    )!
    const rows = journalLedgerRows([purchase])
    const reference = rows.find((row) => row.currency === 'AWETH')!
    expect(reference.rate).toBe('$2,000')
  })
  it('replays same-block movements in mined log order, never transaction-hash order', () => {
    const rows = history().slice(0, 3)
    for (const row of rows) row.executionDate = rows[1]!.executionDate
    const ids = (deposit: number, swap: number) => {
      rows[0]!.transferId = `e${tx(1).slice(2)}${deposit}`
      rows[1]!.transferId = `e${tx(2).slice(2)}${swap}`
      rows[2]!.transferId = `e${tx(2).slice(2)}${swap + 1}`
      return drafts(rows, 2000)
    }
    const swapFirst = finalizeJournalEntryDrafts(ids(9, 3))
    expect(swapFirst.assetDiagnostics).toContainEqual({
      kind: 'exchange-basis-unavailable',
      txHash: tx(2)
    })
    expect(swapFirst.journal.map((entry) => entry.txHash)).toEqual([tx(2), tx(1)])
    const depositFirst = finalizeJournalEntryDrafts(ids(1, 3))
    expect(depositFirst.assetDiagnostics).toEqual([])
    expect(depositFirst.journal.map((entry) => entry.txHash)).toEqual([tx(1), tx(2)])
  })
  it('uses executed stablecoin consideration without requesting an acquired asset market reference', () => {
    const source = drafts(history(), 0)
    const acquired = source.find(
      (entry) => entry.asset?.address === TOKEN && entry.debit === 'Cash — Safe'
    )!
    expect(acquired.rate).toBe(0)
    expect(historicalRateTargets(source)).toEqual([])
    const valued = applyHistoricalRates(source, () => 1800)
    expect(valued.find((entry) => entry.id === acquired.id)?.rate).toBe(0)
    const result = finalizeJournalEntryDrafts(valued)
    const purchase = result.journal.find((entry) => entry.txHash === tx(2))!
    expect(purchase.lines.find((line) => line.movement?.asset?.symbol === 'AWETH')?.debit).toBe(
      usd('20')
    )
    expect(
      purchase.lines.find((line) => line.account.family.name === 'Asset Exchange Loss')?.debit
    ).toBeUndefined()
    expect(journalLedgerRows([purchase]).find((row) => row.currency === 'AWETH')?.rate).toBe(
      '$2,000'
    )
    expect(acquired.rate).toBe(0)
  })
  it('assigns the executed cost to a fractional DAI receipt without manufacturing a market loss', () => {
    const rows = history().slice(0, 3)
    rows[0]!.value = '100000000'
    rows[1]!.value = '300000'
    rows[2]!.value = '286595379927822735'
    rows[2]!.tokenInfo = { ...rows[2]!.tokenInfo!, symbol: 'DAI', name: 'Dai' }
    const result = finalizeJournalEntryDrafts(drafts(rows, 0.999819))
    expect(result.assetDiagnostics).toEqual([])
    const swap = result.journal.find((entry) => entry.useCase === 'SAFE-SWAP')!
    const received = usd('0.3')
    expect(swap.lines.find((line) => line.movement?.asset?.symbol === 'DAI')?.debit).toBe(received)
    expect(swap.lines.find((line) => line.movement?.token === 'usdc')?.credit).toBe(usd('0.3'))
    expect(
      swap.lines.find((line) => line.account.family.name === 'Asset Exchange Loss')?.debit
    ).toBeUndefined()
    expect(
      swap.lines.reduce((sum, line) => sum + (line.debit ?? 0n) - (line.credit ?? 0n), 0n)
    ).toBe(0n)
    expect(journalLedgerRows([swap]).find((row) => row.currency === 'DAI')).toMatchObject({
      quantity: '0.286595379927822735',
      dr: '$0.30'
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
  it('records the 100-dollar cost of 98 net tokens with embedded swap fees included once', () => {
    const rows = history().slice(0, 3)
    rows[0]!.value = '100000000'
    rows[1]!.value = '100000000'
    rows[2]!.value = '98000000000000000000'
    const result = finalizeJournalEntryDrafts(drafts(rows, 1))
    expect(result.assetDiagnostics).toEqual([])
    const swap = result.journal.find((entry) => entry.useCase === 'SAFE-SWAP')!
    expect(swap.lines.find((line) => line.movement?.asset?.symbol === 'AWETH')?.debit).toBe(
      usd('100')
    )
    expect(swap.lines.find((line) => line.movement?.token === 'usdc')?.credit).toBe(usd('100'))
    expect(
      swap.lines.find((line) => line.account.family.name === 'Asset Exchange Loss')?.debit
    ).toBeUndefined()
    expect(
      swap.lines.reduce((sum, line) => sum + (line.debit ?? 0n) - (line.credit ?? 0n), 0n)
    ).toBe(0n)
    expect(buildAccountingSummary(result.journal)).toMatchObject({
      cash: usd('100'),
      expense: 0n
    })
  })
  it('accepts an acquisition without a market quote when executed USD consideration is known', () => {
    const source = drafts(history().slice(0, 3), 0)
    const result = finalizeJournalEntryDrafts(source)
    expect(result.assetDiagnostics).toEqual([])
    expect(
      result.journal
        .find((entry) => entry.useCase === 'SAFE-SWAP')!
        .lines.every((line) => (line.debit ?? line.credit) === usd('20'))
    ).toBe(true)
    expect(journalLedgerRows(result.journal).find((row) => row.currency === 'AWETH')?.rate).toBe(
      '$2,000'
    )
    expect(historicalRateTargets(source)).toEqual([])
  })

  it('preserves the actual loss when two recognized USD stablecoins settle for different amounts', () => {
    const rows = history().slice(0, 3)
    rows[2] = transfer(2, 1, ROUTER, ADDR.safe, USDT_ADDRESS, '19000000')
    rows[2].tokenInfo = { ...rows[2].tokenInfo!, symbol: 'USDT' }
    const source = drafts(rows, 0)
    expect(historicalRateTargets(source)).toEqual([])
    const result = finalizeJournalEntryDrafts(source)
    expect(result.assetDiagnostics).toEqual([])
    const swap = result.journal.find((entry) => entry.useCase === 'SAFE-SWAP')!
    expect(swap.lines.find((line) => line.movement?.token === 'usdt')?.debit).toBe(usd('19'))
    expect(swap.lines.find((line) => line.movement?.token === 'usdc')?.credit).toBe(usd('20'))
    expect(
      swap.lines.find((line) => line.account.family.name === 'Asset Exchange Loss')?.debit
    ).toBe(usd('1'))
  })

  it('realizes crypto disposal gains from one recorded consideration reference and preserves the new asset cost', () => {
    const other = '0xcccccccccccccccccccccccccccccccccccccccc'
    const rows = [
      transfer(1, 0, ADDR.client, ADDR.safe, USDC_ADDRESS, '100000000'),
      transfer(2, 0, ADDR.safe, ROUTER, USDC_ADDRESS, '100000000'),
      transfer(2, 1, ROUTER, ADDR.safe, TOKEN, '1000000000000000000'),
      transfer(3, 0, ADDR.safe, ROUTER, TOKEN, '1000000000000000000'),
      transfer(3, 1, ROUTER, ADDR.safe, other, '2000000000000000000'),
      transfer(4, 0, ADDR.safe, ROUTER, other, '2000000000000000000'),
      transfer(4, 1, ROUTER, ADDR.safe, USDC_ADDRESS, '160000000')
    ]
    for (const row of rows.filter((row) => row.tokenAddress === other)) {
      row.tokenInfo = { ...row.tokenInfo!, decimals: 18, symbol: 'OTHER' }
    }
    const source = drafts(rows, 0)
    const targets = historicalRateTargets(source)
    expect(targets).toHaveLength(1)
    expect(targets[0]!.date).toBe('2026-06-03')
    const result = finalizeJournalEntryDrafts(applyHistoricalRates(source, () => 150))
    expect(result.assetDiagnostics).toEqual([])
    const exchange = result.journal.find((entry) => entry.txHash === tx(3))!
    expect(exchange.lines.find((line) => line.movement?.asset?.symbol === 'OTHER')?.debit).toBe(
      usd(150)
    )
    expect(
      exchange.lines.find((line) => line.account.family.name === 'Asset Exchange Gain')?.credit
    ).toBe(usd(50))
    expect(
      result.journal
        .find((entry) => entry.txHash === tx(4))!
        .lines.find((line) => line.account.family.name === 'Asset Exchange Gain')?.credit
    ).toBe(usd(10))
    expect(finalizeJournalEntryDrafts(source).assetDiagnostics).toContainEqual({
      kind: 'exchange-basis-unavailable',
      txHash: tx(3)
    })
  })

  it('allocates exact acquisition consideration across split receipts without losing a rounding remainder', () => {
    const rows = history().slice(0, 3)
    rows[2]!.value = '3'
    rows.push(transfer(2, 2, ROUTER, ADDR.safe, TOKEN, '4'))
    const swap = finalizeJournalEntryDrafts(drafts(rows, 0)).journal.find(
      (entry) => entry.useCase === 'SAFE-SWAP'
    )!
    expect(
      swap.lines
        .filter((line) => line.debit !== undefined)
        .reduce((sum, line) => sum + line.debit!, 0n)
    ).toBe(usd(20))
    expect(swap.lines.some((line) => line.account.family.name === 'Asset Exchange Loss')).toBe(
      false
    )
  })
})
