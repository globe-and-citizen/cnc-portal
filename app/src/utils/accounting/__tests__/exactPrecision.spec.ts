import { describe, expect, it } from 'vitest'
import { buildAccountingSummary } from '@/utils/accounting/accountingSummary'
import { buildBalanceSheet } from '@/utils/accounting/balanceSheet'
import { buildGeneralLedger } from '@/utils/accounting/generalLedger'
import { finalizeJournal } from '@/utils/accounting/__tests__/assembleAccounting'
import { buildIncomeStatement } from '@/utils/accounting/incomeStatement'
import type { JournalEntryDraft } from '@/utils/accounting/journalEntryDraft'
import { usdAmountFromToken, usdRateFromNumber } from '@/utils/accounting/monetaryAmount'
import { presentBalance, presentIncome } from '@/utils/accounting/presenter'
import type { TokenId } from '@/constant'
import type { AccountName } from '@/utils/accounting/chartOfAccounts'
import { usd } from './fixtures'

function posting(
  id: string,
  debit: AccountName,
  credit: AccountName,
  rawAmount: bigint,
  options: {
    token?: TokenId
    rate?: number
    sourceOperationId?: string
    useCase?: JournalEntryDraft['useCase']
  } = {}
): JournalEntryDraft {
  const token = options.token ?? 'usdc'
  const rate = options.rate ?? 1
  return {
    id,
    ...(options.sourceOperationId ? { sourceOperationId: options.sourceOperationId } : {}),
    timestamp: 100,
    useCase: options.useCase ?? 'CASH-IN',
    debit,
    credit,
    token,
    rawAmount: rawAmount.toString(),
    rate,
    internal: false,
    memo: '',
    enrichment: 'not-applicable'
  }
}

describe('exact accounting precision', () => {
  it('represents every supported token base unit on one exact USD scale', () => {
    expect(usdAmountFromToken(1n, 'usdc', usdRateFromNumber(1))).toBe(10n ** 18n)
    expect(usdAmountFromToken(1n, 'native', usdRateFromNumber(0.08))).toBe(80_000n)
  })

  it('retains multiple sub-cent asset accounts and balances them exactly', () => {
    const journal = finalizeJournal([
      posting('bank-capital', 'Cash — Bank', 'Investor Equity', 3_000n),
      posting('safe-capital', 'Cash — Safe', 'Investor Equity', 3_000n)
    ])
    const ledger = buildGeneralLedger(journal)
    const balance = buildBalanceSheet(journal)

    expect(ledger.trialBalance.map((row) => row.balance)).toContain(usd(0.003))
    expect(balance.assets.map((line) => line.balance)).toEqual([usd(0.003), usd(0.003)])
    expect(balance.totalAssets).toBe(usd(0.006))
    expect(balance.totalEquity).toBe(usd(0.006))
    expect(balance.identityGap).toBe(0n)
    expect(ledger.balanced).toBe(true)
    expect(balance.balanced).toBe(true)

    const view = presentBalance(journal)
    expect(view.assetLines.map((line) => line.value)).toEqual(['$0.00', '$0.00'])
    expect(view.totalAssets).toBe('$0.01')
  })

  it('sums report families before presentation rounding', () => {
    const journal = finalizeJournal([
      posting('service', 'Cash — Bank', 'Service Revenue', 4_000n),
      posting('gain', 'Cash — Safe', 'Trading Gain', 4_000n),
      posting('expense', 'Operating Expense', 'Cash — Bank', 3_000n)
    ])
    const income = buildIncomeStatement(journal)
    const summary = buildAccountingSummary(journal)
    const balance = buildBalanceSheet(journal)

    expect(income.totalRevenue).toBe(usd(0.008))
    expect(income.totalExpenses).toBe(usd(0.003))
    expect(income.netIncome).toBe(usd(0.005))
    expect(summary.income).toBe(income.totalRevenue)
    expect(summary.expense).toBe(income.totalExpenses)
    expect(balance.earningsToDate).toBe(income.netIncome)

    const view = presentIncome(journal)
    expect(view.totalRevenue).toBe('$0.01')
    expect(view.totalExpenses).toBe('$0.00')
    expect(view.netIncome).toBe('$0.01')
  })

  it('keeps a Bank transfer and fee in one exactly balanced JournalEntry', () => {
    const operationId = `0x${'a'.repeat(64)}`
    const journal = finalizeJournal([
      posting(`${operationId}-5`, 'Cash — Expense', 'Cash — Bank', 100_000_000n, {
        sourceOperationId: operationId,
        useCase: 'UC-BANK-03'
      }),
      posting(`${operationId}-3`, 'Transaction Fee Expense', 'Cash — Bank', 1_000_000n, {
        sourceOperationId: operationId,
        useCase: 'FEE'
      })
    ])

    expect(journal).toHaveLength(1)
    expect(journal[0]!.lines.map((line) => line.debit ?? line.credit)).toEqual([
      usd(100),
      usd(1),
      usd(101)
    ])
    expect(journal[0]!.lines[0]!.movement).toMatchObject({
      rawAmount: 100_000_000n,
      decimals: 6,
      rate: usdRateFromNumber(1)
    })
    expect(buildGeneralLedger(journal).balanced).toBe(true)
  })
})
