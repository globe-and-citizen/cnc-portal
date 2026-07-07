import { describe, it, expect } from 'vitest'
import { buildCncLedgerEntries, type LedgerSources } from '@/utils/accounting/mappers'
import { makeCtx, ADDR } from './fixtures'

const ctx = makeCtx()

const sources: LedgerSources = {
  bank: {
    deposits: [
      {
        id: 'b1',
        contractAddress: ADDR.bank,
        depositor: ADDR.founder,
        amount: '1000000000000000000',
        timestamp: 300
      }
    ],
    transfers: [
      { id: 'b2', sender: ADDR.bank, to: ADDR.payroll, amount: '2000000', timestamp: 100 }
    ]
  },
  fees: {
    bankFeePaids: [
      {
        id: 'f1',
        contractAddress: ADDR.bank,
        feeCollector: ADDR.feeCollector,
        token: ADDR.usdcToken,
        amount: '1000000',
        timestamp: 200
      }
    ]
  },
  cashRemuneration: {
    withdraws: [
      {
        id: 'c1',
        contractAddress: ADDR.payroll,
        withdrawer: ADDR.member,
        amount: '1000000000000000000',
        timestamp: 400
      }
    ]
  },
  safeDepositRouter: {
    deposits: [
      {
        id: 's1',
        contractAddress: ADDR.safe,
        depositor: ADDR.client,
        token: ADDR.usdcToken,
        tokenAmount: '5000000',
        sherAmount: '10000000',
        timestamp: 500
      }
    ]
  }
}

describe('buildCncLedgerEntries', () => {
  const entries = buildCncLedgerEntries(sources, ctx)

  it('runs every source and returns entries sorted by timestamp', () => {
    expect(entries.map((e) => e.timestamp)).toEqual([100, 200, 300, 400, 500])
  })

  it('produces a balanced ledger (every posting has equal debit and credit legs)', () => {
    let debits = 0
    let credits = 0
    for (const e of entries) {
      if (e.debit) debits += e.amountUsd
      if (e.credit) credits += e.amountUsd
    }
    expect(debits).toBeCloseTo(credits)
  })

  it('enriches payroll entries when off-chain data is supplied', () => {
    const enriched = buildCncLedgerEntries(sources, ctx, {
      weeklyClaims: [
        {
          memberAddress: ADDR.member,
          weekStart: new Date(400 * 1000).toISOString(),
          minutesWorked: 60,
          wage: { ratePerHour: [{ type: 'native', amount: 1 }] },
          claims: []
        } as never
      ]
    })
    const payroll = enriched.find((e) => e.useCase === 'UC-CASH-03')
    expect(payroll?.enrichment).toBe('enriched')
    expect(payroll?.category).toBe('Payroll')
  })

  it('books an expense payout cash-basis, enriches it, and reports the remaining budget', () => {
    const withExpenses = buildCncLedgerEntries(
      {
        expenseAccount: {
          tokenTransfers: [
            {
              id: 'x1',
              contractAddress: ADDR.expense,
              withdrawer: ADDR.member,
              to: ADDR.member,
              token: ADDR.usdcToken,
              amount: '120000000',
              timestamp: 700
            }
          ]
        }
      },
      ctx,
      {
        expenses: [
          {
            id: 7,
            userAddress: ADDR.member,
            status: 'enabled',
            createdAt: new Date(600 * 1000).toISOString(),
            balances: { 0: '0', 1: '120' },
            data: {
              amount: 300,
              frequencyType: 0,
              customFrequency: 0,
              startDate: 600,
              endDate: 99_999_999_999,
              tokenAddress: ADDR.usdcToken,
              approvedAddress: ADDR.member
            }
          } as never
        ]
      }
    )
    // No accrual entry is ever booked — expenses are cash-basis.
    expect(withExpenses.some((e) => e.credit === 'Expense Payable')).toBe(false)
    const payout = withExpenses.find((e) => e.useCase === 'UC-EXP-01')
    expect(payout).toMatchObject({
      debit: 'Operating Expense',
      credit: 'Cash — Expense',
      amountUsd: 120,
      enrichment: 'enriched',
      category: 'Operating'
    })
    // One-time approval — the payout carries the approved cap, no remaining.
    expect(payout).toMatchObject({ expenseFrequencyType: 0, expenseApprovedUsd: 300 })
    expect(payout?.memo).toContain('one-time approval of 300 USDC')
    // The indexed payout wins — the portal fallback must not double-count it.
    expect(withExpenses.filter((e) => e.useCase === 'UC-EXP-01')).toHaveLength(1)
  })

  it('falls back to the portal drawn balance when no expense payout is indexed', () => {
    const entries = buildCncLedgerEntries({}, ctx, {
      expenses: [
        {
          id: 7,
          userAddress: ADDR.member,
          status: 'limit-reached',
          createdAt: new Date(600 * 1000).toISOString(),
          updatedAt: new Date(900 * 1000).toISOString(),
          balances: { 0: '0', 1: '120' },
          data: {
            amount: 300,
            frequencyType: 0,
            customFrequency: 0,
            startDate: 600,
            endDate: 99_999_999_999,
            tokenAddress: ADDR.usdcToken,
            approvedAddress: ADDR.member
          }
        } as never
      ]
    })
    const drawn = entries.find((e) => e.useCase === 'UC-EXP-01')
    expect(drawn).toMatchObject({
      id: 'expense-drawn-7',
      debit: 'Operating Expense',
      credit: 'Cash — Expense',
      amountUsd: 120,
      category: 'Operating'
    })
    expect(drawn?.memo).toContain('one-time approval of 300 USDC')
  })
})
