import { describe, expect, it } from 'vitest'
import { buildAccountingSummary } from '@/utils/accounting/accountingSummary'
import { finalizeJournalEntryDrafts } from '@/utils/accounting/journalEntry'
import { makeJournalEntryDraft, type JournalEntryDraft } from '@/utils/accounting/journalEntryDraft'
import { usd } from './fixtures'

const BANK = '0x1111111111111111111111111111111111111111'
const PAYROLL = '0x2222222222222222222222222222222222222222'
const TX_A = `0x${'a'.repeat(64)}`
const TX_B = `0x${'b'.repeat(64)}`

function transferDraft(
  txHash: string,
  logIndex: number,
  emittedBy: string,
  useCase: JournalEntryDraft['useCase'] = 'UC-BANK-03'
): JournalEntryDraft {
  return makeJournalEntryDraft({
    id: `${txHash}-${logIndex}`,
    sourceContract: emittedBy,
    timestamp: 100,
    useCase,
    debit: 'Cash — Payroll',
    debitInstance: PAYROLL,
    credit: 'Cash — Bank',
    creditInstance: BANK,
    token: 'usdc',
    rawAmount: '10000000',
    rate: 1,
    internal: true,
    memo: 'Fund Payroll from Bank'
  })
}

describe('JournalEntry draft finalization', () => {
  it('preserves equal movements from distinct transactions', () => {
    const result = finalizeJournalEntryDrafts([
      transferDraft(TX_A, 1, BANK),
      transferDraft(TX_B, 1, BANK)
    ])

    expect(result.journal.map((entry) => entry.txHash)).toEqual([TX_A, TX_B])
    expect(result.journal).toHaveLength(2)
  })

  it('reconciles complementary contract events for one internal movement', () => {
    const result = finalizeJournalEntryDrafts([
      transferDraft(TX_A, 1, BANK),
      transferDraft(TX_A, 2, PAYROLL, 'INTERNAL')
    ])

    expect(result.journal).toHaveLength(1)
    expect(result.journal[0]).toMatchObject({
      id: TX_A,
      txHash: TX_A,
      activityAmount: usd(10),
      lines: [
        { account: { family: { name: 'Cash — Payroll' } }, debit: usd(10) },
        { account: { family: { name: 'Cash — Bank' } }, credit: usd(10) }
      ]
    })
  })

  it('preserves the count of repeated equal movements inside one transaction', () => {
    const result = finalizeJournalEntryDrafts([
      transferDraft(TX_A, 1, BANK),
      transferDraft(TX_A, 2, PAYROLL, 'INTERNAL'),
      transferDraft(TX_A, 3, BANK),
      transferDraft(TX_A, 4, PAYROLL, 'INTERNAL')
    ])

    expect(result.journal).toHaveLength(1)
    expect(result.journal[0]!.activityAmount).toBe(usd(20))
    expect(result.journal[0]!.lines).toMatchObject([
      { account: { family: { name: 'Cash — Payroll' } }, debit: usd(20) },
      { account: { family: { name: 'Cash — Bank' } }, credit: usd(20) }
    ])
  })

  it('attaches a Bank fee to its transaction and reports an orphan fee', () => {
    const fee = (txHash: string) =>
      makeJournalEntryDraft({
        id: `${txHash}-9`,
        sourceContract: BANK,
        timestamp: 100,
        useCase: 'FEE',
        debit: 'Transaction Fee Expense',
        credit: 'Cash — Bank',
        creditInstance: BANK,
        token: 'usdc',
        rawAmount: '50000',
        rate: 1,
        memo: 'Transaction fee skimmed from Bank'
      })
    const result = finalizeJournalEntryDrafts([transferDraft(TX_A, 1, BANK), fee(TX_A), fee(TX_B)])

    expect(result.unmatchedFeeOperationIds).toEqual([TX_B])
    expect(result.journal).toHaveLength(1)
    expect(result.journal[0]!.activityAmount).toBe(usd(10))
    expect(result.journal[0]!.lines).toMatchObject([
      { account: { family: { name: 'Cash — Payroll' } }, debit: usd(10) },
      { account: { family: { name: 'Transaction Fee Expense' } }, debit: usd(0.05) },
      { account: { family: { name: 'Cash — Bank' } }, credit: usd(10.05) }
    ])
    expect(buildAccountingSummary(result.journal).transactionFees).toBe(usd(0.05))
  })

  it('retains a non-zero token movement while its USD rate is unavailable', () => {
    const draft = makeJournalEntryDraft({
      id: 'unvalued-native-payment',
      timestamp: 100,
      useCase: 'UC-CASH-03',
      debit: 'Wage Payable',
      credit: 'Cash — Payroll',
      token: 'native',
      rawAmount: '1000000000000000',
      rate: 0,
      memo: 'Wage withdrawal — cash settlement'
    })

    const { journal } = finalizeJournalEntryDrafts([draft])

    expect(journal).toHaveLength(1)
    expect(journal[0]!.lines).toHaveLength(2)
    expect(journal[0]!.lines.every((line) => (line.debit ?? line.credit) === 0n)).toBe(true)
  })
})
