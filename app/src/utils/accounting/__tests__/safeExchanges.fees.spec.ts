import { describe, expect, it } from 'vitest'
import { USDC_ADDRESS } from '@/constant'
import type { CowOrder } from '@/types/cow'
import { safeSwapTransfers } from '@/utils/safe/swapValuation'
import { buildCncJournalEntryDrafts } from '../assemble'
import { finalizeJournalEntryDrafts } from '../journalEntry'
import { toSafeSwapFeeRows } from '../safeTransfers'
import { usd, ADDR } from './fixtures'
import { history, ROUTER, TOKEN, transfer, tx } from './safeExchangeFixtures'

const order = (fields: Partial<CowOrder> = {}): CowOrder => ({
  owner: ADDR.safe,
  status: 'fulfilled',
  sellToken: TOKEN,
  buyToken: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
  executedFee: '100000000000000',
  executedFeeToken: TOKEN,
  ...fields
})

const sale = (orders: CowOrder[]) =>
  finalizeJournalEntryDrafts(
    buildCncJournalEntryDrafts({
      safeAddress: ADDR.safe,
      safeAssetTransfers: history(),
      safeSwapOrders: [{ txHash: tx(3), data: orders }],
      rateOfRecord: () => 2000
    })
  ).journal.find((entry) => entry.txHash === tx(3))!

const lineOf = (entry: ReturnType<typeof sale>, account: string) =>
  entry.lines.find((line) => line.account.family.name === account)

describe('Safe swap transaction fees', () => {
  it('[AC-US-ACCT-002-14] books the CoW fee as Transaction Fee Expense and leaves it out of the exchange gain', () => {
    const entry = sale([order()])
    expect(lineOf(entry, 'Transaction Fee Expense')?.debit).toBe(usd('0.2'))
    expect(lineOf(entry, 'Asset Exchange Gain')?.credit).toBe(usd('10.858984'))
    expect(lineOf(entry, 'Asset Exchange Loss')).toBeUndefined()
    const debits = entry.lines.reduce((sum, line) => sum + (line.debit ?? 0n), 0n)
    const credits = entry.lines.reduce((sum, line) => sum + (line.credit ?? 0n), 0n)
    expect(debits).toBe(credits)
  })

  it('keeps the whole result in the exchange gain when no fee is reported', () => {
    const entry = sale([])
    expect(lineOf(entry, 'Transaction Fee Expense')).toBeUndefined()
    expect(lineOf(entry, 'Asset Exchange Gain')?.credit).toBe(usd('10.658984'))
  })

  it('ignores orders of another owner, unsettled orders and malformed fees', () => {
    expect(
      toSafeSwapFeeRows(
        [
          {
            txHash: tx(3),
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
    expect(sale([order({ owner: ADDR.client })]).lines.length).toBe(sale([]).lines.length)
  })

  it('books the CoW fee of a swap made by a previous team Safe', () => {
    const entry = finalizeJournalEntryDrafts(
      buildCncJournalEntryDrafts({
        safeAddress: '0x4444444444444444444444444444444444444444',
        safeAssetTransfers: [],
        previousSafes: [{ safeAddress: ADDR.safe, assetTransfers: history() }],
        safeSwapOrders: [{ txHash: tx(3), data: [order()] }],
        rateOfRecord: () => 2000
      })
    ).journal.find((journal) => journal.txHash === tx(3))!
    expect(lineOf(entry, 'Transaction Fee Expense')?.debit).toBe(usd('0.2'))
    expect(lineOf(entry, 'Asset Exchange Gain')?.credit).toBe(usd('10.858984'))
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
