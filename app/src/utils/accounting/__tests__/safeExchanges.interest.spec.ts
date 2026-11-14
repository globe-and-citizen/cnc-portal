import { describe, expect, it } from 'vitest'
import { zeroAddress } from 'viem'
import { USDC_ADDRESS } from '@/constant'
import { finalizeJournalEntryDrafts } from '../journalEntry'
import { presentIncome } from '../presenter'
import type { JournalEntry } from '../types'
import { usd, ADDR } from './fixtures'
import { drafts, history, ROUTER, TOKEN, transfer, tx } from './safeExchangeFixtures'

const lineOf = (entry: JournalEntry, account: string) =>
  entry.lines.find((line) => line.account.family.name === account)

const awethLines = (entry: JournalEntry) =>
  entry.lines.filter((line) => line.movement?.asset?.symbol === 'AWETH')

/**
 * The AWETH bought for 20 USDC accrued 0.000005 AWETH of interest, which the token mints to the
 * Safe as it sells the whole 0.010005 AWETH for 30.658984 USDC.
 */
const saleWithAccruedInterest = () => {
  const rows = history().slice(0, 3)
  rows.push(
    transfer(3, 0, ADDR.safe, ROUTER, TOKEN, '10005000000000000'),
    transfer(3, 1, ROUTER, ADDR.safe, USDC_ADDRESS, '30658984'),
    transfer(3, 2, zeroAddress, ADDR.safe, TOKEN, '5000000000000')
  )
  return finalizeJournalEntryDrafts(drafts(rows))
}

describe('Interest a yield-bearing token accrues in the Safe', () => {
  it('[AC-US-ACCT-002-21] books the interest minted during a sale to Interest Income instead of withholding the books', () => {
    const { assetDiagnostics, journal } = saleWithAccruedInterest()
    expect(assetDiagnostics).toEqual([])
    const sale = journal.find((entry) => entry.txHash === tx(3))!
    expect(lineOf(sale, 'Interest Income')?.credit).toBe(usd('0.01'))
    expect(awethLines(sale).find((line) => line.debit)?.debit).toBe(usd('0.01'))
  })

  it('sells the interest at the value it was booked at, so Swap P&L keeps only the price effect', () => {
    const sale = saleWithAccruedInterest().journal.find((entry) => entry.txHash === tx(3))!
    expect(awethLines(sale).find((line) => line.credit)?.credit).toBe(usd('20.01'))
    expect(lineOf(sale, 'Swap P&L')?.credit).toBe(usd('10.648984'))
  })

  it('shows Interest Income on the income statement', () => {
    const { journal } = saleWithAccruedInterest()
    expect(presentIncome(journal).revenueLines).toContainEqual(
      expect.objectContaining({ label: 'Interest Income', value: '$0.01' })
    )
  })
})
