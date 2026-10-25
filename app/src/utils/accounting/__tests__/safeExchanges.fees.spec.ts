import { describe, expect, it } from 'vitest'
import type { CowOrder } from '@/types/cow'
import { buildCncJournalEntryDrafts } from '../assemble'
import { finalizeJournalEntryDrafts } from '../journalEntry'
import { safeSwapTransactionHashes, toSafeSwapFeeRows } from '../safeTransfers'
import { usd, ADDR } from './fixtures'
import { history, TOKEN, tx } from './safeExchangeFixtures'

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

const amountOn = (entry: ReturnType<typeof sale>, account: string) =>
  entry.lines.find((line) => line.account.family.name === account)

describe('Safe swap transaction fees', () => {
  it('[AC-US-ACCT-002-14] books the CoW fee as Transaction Fee Expense and leaves it out of the exchange gain', () => {
    const entry = sale([order()])
    expect(amountOn(entry, 'Transaction Fee Expense')?.debit).toBe(usd('0.2'))
    expect(amountOn(entry, 'Asset Exchange Gain')?.credit).toBe(usd('10.858984'))
    expect(amountOn(entry, 'Asset Exchange Loss')).toBeUndefined()
    const debits = entry.lines.reduce((sum, line) => sum + (line.debit ?? 0n), 0n)
    const credits = entry.lines.reduce((sum, line) => sum + (line.credit ?? 0n), 0n)
    expect(debits).toBe(credits)
  })

  it('keeps the whole result in the exchange gain when no fee is reported', () => {
    const entry = sale([])
    expect(amountOn(entry, 'Transaction Fee Expense')).toBeUndefined()
    expect(amountOn(entry, 'Asset Exchange Gain')?.credit).toBe(usd('10.658984'))
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

  it('looks up only transactions where the Safe both sent and received', () => {
    expect(safeSwapTransactionHashes(history(), ADDR.safe)).toEqual([tx(2), tx(3)])
    expect(safeSwapTransactionHashes(history(), undefined)).toEqual([])
  })
})
