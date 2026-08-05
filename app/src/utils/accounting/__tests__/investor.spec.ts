import { describe, it, expect } from 'vitest'
import { mapInvestorEvents } from '@/utils/accounting/mappers/investor'
import { makeCtx, ADDR } from './fixtures'

const ctx = makeCtx()

describe('mapInvestorEvents', () => {
  it('drops a mint backed by a SafeDepositRouter deposit (equity booked there)', () => {
    const entries = mapInvestorEvents(
      {
        mints: [
          {
            id: 'm1',
            contractAddress: ADDR.safe,
            shareholder: ADDR.founder,
            amount: '10000000',
            timestamp: 100
          }
        ],
        safeDepositRouterDeposits: [
          {
            id: 'sd1',
            contractAddress: ADDR.safe,
            depositor: ADDR.founder,
            token: ADDR.usdcToken,
            tokenAmount: '5000000',
            sherAmount: '10000000',
            timestamp: 100
          }
        ]
      },
      ctx
    )
    expect(entries).toHaveLength(0)
  })

  it('drops a mint backed by a SHER wage withdrawal', () => {
    const entries = mapInvestorEvents(
      {
        mints: [
          {
            id: 'm2',
            contractAddress: ADDR.safe,
            shareholder: ADDR.member,
            amount: '7000000',
            timestamp: 100
          }
        ],
        cashRemunerationWithdrawTokens: [
          {
            id: 'w1',
            contractAddress: ADDR.payroll,
            withdrawer: ADDR.member,
            tokenAddress: ADDR.sherToken,
            amount: '7000000',
            timestamp: 100
          }
        ]
      },
      ctx
    )
    expect(entries).toHaveLength(0)
  })

  it('books an unbacked mint as a share issuance (Dr Shares to be issued · Cr Investor Equity)', () => {
    const [entry] = mapInvestorEvents(
      {
        mints: [
          {
            id: 'm3',
            contractAddress: ADDR.safe,
            shareholder: ADDR.client,
            amount: '3000000',
            timestamp: 100
          }
        ]
      },
      ctx
    )
    // The SHER were accrued into Shares to be issued (the wage accrual) and are now
    // formally issued, so the liability clears into equity — valued at the SHER
    // rate of record ($0.50 in the fixture → 3 SHER = $1.50).
    expect(entry).toMatchObject({
      useCase: 'DEFAULT-D',
      debit: 'Shares to be issued',
      credit: 'Investor Equity',
      amountUsd: 1.5,
      shares: 3
    })
  })

  it('books a DividendPaid as UC-INV-01 (Dividend Expense → Cash — Bank)', () => {
    const [entry] = mapInvestorEvents(
      {
        dividendPaids: [
          {
            id: 'dp1',
            contractAddress: ADDR.safe,
            shareholder: ADDR.member,
            token: ADDR.usdcToken,
            amount: '2000000',
            timestamp: 100
          }
        ]
      },
      ctx
    )
    expect(entry).toMatchObject({
      useCase: 'UC-INV-01',
      debit: 'Dividend Expense',
      credit: 'Cash — Bank',
      amountUsd: 2
    })
  })

  it('only consumes one backing per matching mint', () => {
    const entries = mapInvestorEvents(
      {
        mints: [
          {
            id: 'm1',
            contractAddress: ADDR.safe,
            shareholder: ADDR.founder,
            amount: '10000000',
            timestamp: 100
          },
          {
            id: 'm2',
            contractAddress: ADDR.safe,
            shareholder: ADDR.founder,
            amount: '10000000',
            timestamp: 200
          }
        ],
        safeDepositRouterDeposits: [
          {
            id: 'sd1',
            contractAddress: ADDR.safe,
            depositor: ADDR.founder,
            token: ADDR.usdcToken,
            tokenAmount: '5000000',
            sherAmount: '10000000',
            timestamp: 100
          }
        ]
      },
      ctx
    )
    // First mint is backed and dropped; the second has no backing left → Default-D.
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ id: 'm2', useCase: 'DEFAULT-D' })
  })
})
