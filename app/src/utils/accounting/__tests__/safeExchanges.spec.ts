import { describe, expect, it } from 'vitest'
import { USDC_ADDRESS, USDT_ADDRESS } from '@/constant'
import { buildCncJournalEntryDrafts } from '../assemble'
import { finalizeJournalEntryDrafts } from '../journalEntry'
import { journalLedgerRows } from '../journalLedgerPresenter'
import type { JournalEntry } from '../types'
import { usd, ADDR } from './fixtures'

import { drafts, history, transfer, TOKEN, ROUTER, tx } from './safeExchangeFixtures'

const OTHER_TOKEN = '0xdddddddddddddddddddddddddddddddddddddddd'

const otherTokenTransfer = (n: number, index: number, from: string, to: string, value: string) => {
  const row = transfer(n, index, from, to, OTHER_TOKEN, value)
  row.tokenInfo = { ...row.tokenInfo!, name: 'Other asset', symbol: 'OTHR', decimals: 18 }
  return row
}

const accountsOf = (entry: JournalEntry) =>
  new Set(entry.lines.map((line) => line.account.family.name))

const assetLine = (entry: JournalEntry, symbol: string) =>
  entry.lines.find((line) => line.movement?.asset?.symbol === symbol)

describe('Safe asset exchange accounting', () => {
  it('[AC-US-ACCT-002-13] books a stablecoin-to-AWETH purchase at the price paid, with no gain or loss', () => {
    const result = finalizeJournalEntryDrafts(drafts(history().slice(0, 3)))
    expect(result.assetDiagnostics).toEqual([])
    const purchase = result.journal.find((entry) => entry.useCase === 'SAFE-SWAP')!
    expect(accountsOf(purchase)).toEqual(new Set(['Cash — Safe']))
    expect(assetLine(purchase, 'AWETH')?.debit).toBe(usd('20'))
    expect(purchase.lines.find((line) => line.movement?.token === 'usdc')?.credit).toBe(usd('20'))
    const rows = journalLedgerRows(result.journal)
    expect(rows.find((row) => row.currency === 'AWETH')?.quantity).toBe('0.01')
    expect(rows.some((row) => row.category === 'Swap')).toBe(true)
    expect(assetLine(purchase, 'AWETH')?.movement?.rawAmount).toBe(10n ** 16n)
  })
  it('carries the weighted-average cost into each asset received for part of a holding', () => {
    const rows = history().slice(0, 3)
    rows.push(
      transfer(3, 0, ADDR.safe, ROUTER, TOKEN, '4000000000000000'),
      otherTokenTransfer(3, 1, ROUTER, ADDR.safe, '5000000000000000000'),
      transfer(4, 0, ADDR.safe, ROUTER, TOKEN, '6000000000000000'),
      otherTokenTransfer(4, 1, ROUTER, ADDR.safe, '3000000000000000000')
    )
    const result = finalizeJournalEntryDrafts(drafts(rows))
    expect(result.assetDiagnostics).toEqual([])
    const [partial, rest] = result.journal.slice(2)
    expect(assetLine(partial!, 'OTHR')?.debit).toBe(usd('8'))
    expect(assetLine(rest!, 'OTHR')?.debit).toBe(usd('12'))
    expect(accountsOf(partial!)).toEqual(new Set(['Cash — Safe']))
    expect(accountsOf(rest!)).toEqual(new Set(['Cash — Safe']))
    const tokenBalance = result.journal
      .flatMap((entry) => entry.lines)
      .filter((line) => line.movement?.asset?.symbol === 'AWETH')
      .reduce((sum, line) => sum + (line.debit ?? 0n) - (line.credit ?? 0n), 0n)
    expect(tokenBalance).toBe(0n)
  })
  it('books a stablecoin exchange whose face value equals the price paid', () => {
    const tether = transfer(2, 1, ROUTER, ADDR.safe, USDT_ADDRESS, '20000000')
    tether.tokenInfo = { ...tether.tokenInfo!, name: 'Tether', symbol: 'USDT' }
    const result = finalizeJournalEntryDrafts(drafts([...history().slice(0, 2), tether]))
    expect(result.assetDiagnostics).toEqual([])
    const swap = result.journal.find((entry) => entry.useCase === 'SAFE-SWAP')!
    expect(swap.lines.find((line) => line.movement?.token === 'usdt')?.debit).toBe(usd('20'))
    expect(accountsOf(swap)).toEqual(new Set(['Cash — Safe']))
  })
  it('withholds guessed swap classification when settlement counterparties differ', () => {
    const rows = history().slice(0, 3)
    rows[2]!.from = '0xcccccccccccccccccccccccccccccccccccccccc'
    const result = finalizeJournalEntryDrafts(drafts(rows))
    expect(result.journal.some((entry) => entry.useCase === 'SAFE-SWAP')).toBe(false)
    expect(
      result.assetDiagnostics.some((issue) => issue.kind === 'unclassified-asset-movement')
    ).toBe(true)
    expect(
      result.journal[1]!.lines.some((line) => line.account.family.name === 'Service Revenue')
    ).toBe(false)
  })
  it('keeps a swap partial when acquisition history is missing instead of inventing cost basis', () => {
    const result = finalizeJournalEntryDrafts(drafts(history().slice(3)))
    expect(
      result.assetDiagnostics.some((issue) => issue.kind === 'exchange-basis-unavailable')
    ).toBe(true)
    expect(result.journal[0]!.lines.every((line) => (line.debit ?? line.credit) === 0n)).toBe(true)
    expect(result.journal[0]!.lines.some((line) => line.movement?.asset?.symbol === 'AWETH')).toBe(
      true
    )
  })
  it('retains a same-operation mint separately and flags its classification', () => {
    const rows = history()
    rows.push(transfer(3, 2, '0x0000000000000000000000000000000000000000', ADDR.safe, TOKEN, '1'))
    const result = finalizeJournalEntryDrafts(drafts(rows))
    expect(
      result.assetDiagnostics.some((issue) => issue.kind === 'unclassified-asset-movement')
    ).toBe(true)
    expect(
      result.journal
        .at(-1)!
        .lines.some((line) => line.account.family.name === 'Unclassified Receipts')
    ).toBe(true)
  })
  it('uses the actual transfers once even when a direct Safe call is also present', () => {
    const input = {
      safeAddress: ADDR.safe,
      safeAssetTransfers: history(),
      safeOutgoingTransactions: [
        {
          isExecuted: true,
          isSuccessful: true,
          executionDate: '2026-06-02T12:00:00Z',
          transactionHash: tx(2),
          safeTxHash: tx(2),
          to: USDC_ADDRESS,
          value: '0',
          dataDecoded: {
            method: 'transfer',
            parameters: [{ value: ROUTER }, { value: '20000000' }]
          }
        }
      ]
    }
    expect(
      buildCncJournalEntryDrafts(input as Parameters<typeof buildCncJournalEntryDrafts>[0])
    ).toHaveLength(5)
  })
  it('never treats missing ERC-20 metadata as the native currency', () => {
    const row = transfer(1, 0, ADDR.client, ADDR.safe, TOKEN, '12345')
    row.tokenInfo = { ...row.tokenInfo!, decimals: 99 }
    const source = drafts([row])
    expect(source[0]!.token.startsWith('erc20:')).toBe(true)
    const result = finalizeJournalEntryDrafts(source)
    expect(result.assetDiagnostics).toContainEqual({
      kind: 'asset-metadata-unavailable',
      txHash: tx(1)
    })
    expect(journalLedgerRows(result.journal)[0]!.quantity).toBe('Unavailable')
  })
  it('ignores a token sent to the Safe that Safe does not trust', () => {
    const fake = transfer(1, 0, ADDR.client, ADDR.safe, TOKEN, '12345')
    fake.tokenInfo = { ...fake.tokenInfo!, trusted: false }
    const unknown = transfer(2, 0, ADDR.client, ADDR.safe, TOKEN, '12345')
    delete unknown.tokenInfo
    const result = finalizeJournalEntryDrafts(drafts([fake, unknown]))
    expect(result.journal).toEqual([])
    expect(result.assetDiagnostics).toEqual([])
  })
  it('preserves six-decimal assets and does not peg a token merely named USDC', () => {
    const row = transfer(1, 0, ADDR.client, ADDR.safe, TOKEN, '1234567')
    row.tokenInfo = { ...row.tokenInfo!, decimals: 6, symbol: 'USDC' }
    const result = finalizeJournalEntryDrafts(drafts([row], 0))
    expect(journalLedgerRows(result.journal)[0]!.quantity).toBe('1.234567')
    expect(result.journal[0]!.lines[0]!.movement!.rate).toBe(0n)
  })
  it('renders all eighteen decimals of the original AWETH receipt', () => {
    const row = transfer(1, 0, ADDR.client, ADDR.safe, TOKEN, '11371464599721321')
    const result = finalizeJournalEntryDrafts(drafts([row]))
    expect(journalLedgerRows(result.journal)[0]!.quantity).toBe('0.011371464599721321')
  })
  it('carries the price paid on a tiny receipt without an unrepresentable unit rate', () => {
    const rows = history().slice(0, 3)
    rows[2]!.value = '1'
    const result = finalizeJournalEntryDrafts(drafts(rows))
    expect(result.assetDiagnostics).toEqual([])
    expect(assetLine(result.journal[1]!, 'AWETH')?.debit).toBe(usd('20'))
    expect(journalLedgerRows(result.journal).find((row) => row.currency === 'AWETH')?.rate).toBe(
      '$2,000'
    )
  })
  it('requires further basis evidence after a payment depleted the holding at a different valuation', () => {
    const rows = history().slice(0, 3)
    rows.push(
      transfer(3, 0, ADDR.safe, ROUTER, TOKEN, '4000000000000000'),
      transfer(4, 0, ADDR.safe, ROUTER, TOKEN, '6000000000000000'),
      transfer(4, 1, ROUTER, ADDR.safe, USDC_ADDRESS, '18000000')
    )
    const source = buildCncJournalEntryDrafts({
      safeAddress: ADDR.safe,
      safeAssetTransfers: rows,
      rateOfRecord: (_token, at) => (at.getUTCDate() === 2 ? 2000 : 3000)
    })
    const result = finalizeJournalEntryDrafts(source)
    expect(result.assetDiagnostics).toContainEqual({
      kind: 'exchange-basis-unavailable',
      txHash: tx(4)
    })
    expect(result.journal.at(-1)!.lines.every((line) => (line.debit ?? line.credit) === 0n)).toBe(
      true
    )
  })
})
