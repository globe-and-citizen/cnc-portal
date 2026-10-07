import { describe, expect, it } from 'vitest'
import { USDC_ADDRESS } from '@/constant'
import { buildCncJournalEntryDrafts } from '../assemble'
import { finalizeJournalEntryDrafts } from '../journalEntry'
import { journalLedgerRows } from '../journalLedgerPresenter'
import { usd, ADDR } from './fixtures'

import { drafts, history, transfer, TOKEN, ROUTER, tx } from './safeExchangeFixtures'

describe('Safe asset exchange accounting', () => {
  it('[AC-US-ACCT-002-13] replays a stablecoin-to-AWETH round trip with exact cash and realized gain', () => {
    const result = finalizeJournalEntryDrafts(drafts())
    expect(result.assetDiagnostics).toEqual([])
    const swaps = result.journal.filter((entry) => entry.useCase === 'SAFE-SWAP')
    expect(swaps).toHaveLength(2)
    expect(
      swaps
        .flatMap((entry) => entry.lines)
        .some((line) => line.account.family.name === 'Service Revenue')
    ).toBe(false)
    const cash = result.journal
      .flatMap((entry) => entry.lines)
      .filter((line) => line.account.family.name === 'Cash — Safe')
      .reduce((sum, line) => sum + (line.debit ?? 0n) - (line.credit ?? 0n), 0n)
    expect(cash).toBe(usd('30.658984'))
    expect(
      swaps[1]!.lines.find((line) => line.account.family.name === 'Asset Exchange Gain')?.credit
    ).toBe(usd('10.658984'))
    const rows = journalLedgerRows(result.journal)
    expect(rows.find((row) => row.currency === 'AWETH')?.quantity).toBe('0.01')
    expect(rows.some((row) => row.category === 'Swap')).toBe(true)
    expect(
      swaps[0]!.lines.find((line) => line.movement?.token.startsWith('erc20:'))?.movement?.rawAmount
    ).toBe(10n ** 16n)
  })
  it('retains the weighted-average basis after a partial sale and realizes the final loss', () => {
    const rows = history().slice(0, 3)
    rows.push(
      transfer(3, 0, ADDR.safe, ROUTER, TOKEN, '4000000000000000'),
      transfer(3, 1, ROUTER, ADDR.safe, USDC_ADDRESS, '12000000'),
      transfer(4, 0, ADDR.safe, ROUTER, TOKEN, '6000000000000000'),
      transfer(4, 1, ROUTER, ADDR.safe, USDC_ADDRESS, '6000000')
    )
    const result = finalizeJournalEntryDrafts(drafts(rows))
    expect(result.assetDiagnostics).toEqual([])
    const sales = result.journal.slice(2)
    expect(
      sales[0]!.lines.find((line) => line.account.family.name === 'Asset Exchange Gain')?.credit
    ).toBe(usd('4'))
    expect(
      sales[1]!.lines.find((line) => line.account.family.name === 'Asset Exchange Loss')?.debit
    ).toBe(usd('6'))
    const tokenBalance = result.journal
      .flatMap((entry) => entry.lines)
      .filter((line) => line.movement?.token.startsWith('erc20:'))
      .reduce((sum, line) => sum + (line.debit ?? 0n) - (line.credit ?? 0n), 0n)
    expect(tokenBalance).toBe(0n)
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
    delete row.tokenInfo
    const source = drafts([row])
    expect(source[0]!.token.startsWith('erc20:')).toBe(true)
    const result = finalizeJournalEntryDrafts(source)
    expect(result.assetDiagnostics).toContainEqual({
      kind: 'asset-metadata-unavailable',
      txHash: tx(1)
    })
    expect(journalLedgerRows(result.journal)[0]!.quantity).toBe('Unavailable')
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
  it('values a tiny receipt without inventing an unrepresentable consideration-based unit rate', () => {
    const rows = history().slice(0, 3)
    rows[2]!.value = '1'
    const result = finalizeJournalEntryDrafts(drafts(rows))
    expect(result.assetDiagnostics).toEqual([])
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
    expect(
      result.journal
        .at(-1)!
        .lines.some((line) => line.account.family.name === 'Asset Exchange Gain')
    ).toBe(false)
  })
})
