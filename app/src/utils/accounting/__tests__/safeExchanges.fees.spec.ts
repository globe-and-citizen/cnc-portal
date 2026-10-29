import { describe, expect, it } from 'vitest'
import { USDC_ADDRESS } from '@/constant'
import type { CowOrder } from '@/types/cow'
import type { SafeIncomingTransfer } from '@/types/safe'
import { safeSwapTransfers } from '@/utils/safe/swapValuation'
import { buildCncJournalEntryDrafts } from '../assemble'
import { finalizeJournalEntryDrafts } from '../journalEntry'
import { toSafeSwapFeeRows } from '../safeTransfers'
import type { JournalEntry } from '../types'
import { usd, ADDR } from './fixtures'
import { history, ROUTER, TOKEN, transfer, tx } from './safeExchangeFixtures'

const OTHER_TOKEN = '0xdddddddddddddddddddddddddddddddddddddddd'

const order = (fields: Partial<CowOrder> = {}): CowOrder => ({
  owner: ADDR.safe,
  status: 'fulfilled',
  sellToken: USDC_ADDRESS,
  buyToken: TOKEN,
  executedFee: '200000',
  executedFeeToken: USDC_ADDRESS,
  ...fields
})

const swapAt = (
  hash: string,
  orders: CowOrder[],
  rows: SafeIncomingTransfer[] = history().slice(0, 3),
  marketRate = 2000
) =>
  finalizeJournalEntryDrafts(
    buildCncJournalEntryDrafts({
      safeAddress: ADDR.safe,
      safeAssetTransfers: rows,
      safeSwapOrders: [{ txHash: hash, data: orders }],
      rateOfRecord: () => marketRate
    })
  ).journal.find((entry) => entry.txHash === hash)!

const purchase = (orders: CowOrder[]) => swapAt(tx(2), orders)

const lineOf = (entry: JournalEntry, account: string) =>
  entry.lines.find((line) => line.account.family.name === account)

const assetLine = (entry: JournalEntry, symbol: string) =>
  entry.lines.find((line) => line.movement?.asset?.symbol === symbol)

describe('Safe swap transaction fees', () => {
  it('[AC-US-ACCT-002-14] books the CoW fee as Transaction Fee Expense and the rest of the price paid on the asset received', () => {
    const entry = purchase([order()])
    expect(lineOf(entry, 'Transaction Fee Expense')?.debit).toBe(usd('0.2'))
    expect(assetLine(entry, 'AWETH')?.debit).toBe(usd('19.8'))
    expect(entry.lines.find((line) => line.movement?.token === 'usdc')?.credit).toBe(usd('20'))
    expect(new Set(entry.lines.map((line) => line.account.family.name))).toEqual(
      new Set(['Cash — Safe', 'Transaction Fee Expense'])
    )
    const debits = entry.lines.reduce((sum, line) => sum + (line.debit ?? 0n), 0n)
    const credits = entry.lines.reduce((sum, line) => sum + (line.credit ?? 0n), 0n)
    expect(debits).toBe(credits)
  })

  it('keeps the whole price paid on the asset received when no fee is reported', () => {
    const entry = purchase([])
    expect(lineOf(entry, 'Transaction Fee Expense')).toBeUndefined()
    expect(assetLine(entry, 'AWETH')?.debit).toBe(usd('20'))
  })

  it('values a fee taken from a volatile asset at its carrying cost, not its market price', () => {
    const received = transfer(3, 1, ROUTER, ADDR.safe, OTHER_TOKEN, '5000000000000000000')
    received.tokenInfo = {
      ...received.tokenInfo!,
      name: 'Other asset',
      symbol: 'OTHR',
      decimals: 18
    }
    const rows = [
      ...history().slice(0, 3),
      transfer(3, 0, ADDR.safe, ROUTER, TOKEN, '10000000000000000'),
      received
    ]
    const feeInAsset = order({
      sellToken: TOKEN,
      buyToken: OTHER_TOKEN,
      executedFee: '1000000000000000',
      executedFeeToken: TOKEN
    })
    const entry = swapAt(tx(3), [feeInAsset], rows, 3000)
    expect(lineOf(entry, 'Transaction Fee Expense')?.debit).toBe(usd('2'))
    expect(assetLine(entry, 'OTHR')?.debit).toBe(usd('18'))
  })

  it('ignores orders of another owner, unsettled orders and malformed fees', () => {
    expect(
      toSafeSwapFeeRows(
        [
          {
            txHash: tx(2),
            data: [
              order({ owner: ADDR.client }),
              order({ status: 'open' }),
              order({ executedFee: '1.5' }),
              order({ executedFeeToken: null })
            ]
          },
          { txHash: tx(4) }
        ],
        ADDR.safe
      )
    ).toEqual([])
    expect(purchase([order({ owner: ADDR.client })]).lines.length).toBe(purchase([]).lines.length)
  })

  it('books the CoW fee of a swap made by a previous team Safe', () => {
    const entry = finalizeJournalEntryDrafts(
      buildCncJournalEntryDrafts({
        safeAddress: '0x4444444444444444444444444444444444444444',
        safeAssetTransfers: [],
        previousSafes: [{ safeAddress: ADDR.safe, assetTransfers: history().slice(0, 3) }],
        safeSwapOrders: [{ txHash: tx(2), data: [order()] }],
        rateOfRecord: () => 2000
      })
    ).journal.find((journal) => journal.txHash === tx(2))!
    expect(lineOf(entry, 'Transaction Fee Expense')?.debit).toBe(usd('0.2'))
    expect(assetLine(entry, 'AWETH')?.debit).toBe(usd('19.8'))
  })

  it('looks up the swaps the Safe overview counts, not a same-token round trip', () => {
    const roundTrip = [
      transfer(4, 0, ADDR.safe, ROUTER, USDC_ADDRESS, '1'),
      transfer(4, 1, ROUTER, ADDR.safe, USDC_ADDRESS, '1')
    ]
    const swapHashes = (safe?: string) => [
      ...new Set(
        safeSwapTransfers([...history(), ...roundTrip], safe).map(
          ({ transactionHash }) => transactionHash
        )
      )
    ]
    expect(swapHashes(ADDR.safe)).toEqual([tx(2), tx(3)])
    expect(swapHashes(undefined)).toEqual([])
  })
})
