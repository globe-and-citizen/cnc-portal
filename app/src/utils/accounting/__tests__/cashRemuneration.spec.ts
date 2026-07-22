import { describe, it, expect } from 'vitest'
import { mapCashRemunerationEvents } from '@/utils/accounting/mappers/cashRemuneration'
import { makeCtx, ADDR } from './fixtures'

const ctx = makeCtx()

describe('mapCashRemunerationEvents', () => {
  it('settles a native wage withdrawal against Wage Payable (UC-CASH-03)', () => {
    const [entry] = mapCashRemunerationEvents(
      {
        withdraws: [
          {
            id: 'w1',
            contractAddress: ADDR.payroll,
            withdrawer: ADDR.member,
            amount: '1000000000000000000',
            timestamp: 100
          }
        ]
      },
      ctx
    )
    expect(entry).toMatchObject({
      useCase: 'UC-CASH-03',
      debit: 'Wage Payable',
      credit: 'Cash — Payroll',
      amountUsd: 2,
      enrichment: 'needs-off-chain-data'
    })
  })

  it('books a SHER WithdrawToken as the equity leg (Shares to be issued → Investor Equity)', () => {
    const [entry] = mapCashRemunerationEvents(
      {
        withdrawTokens: [
          {
            id: 'w2',
            contractAddress: ADDR.payroll,
            withdrawer: ADDR.member,
            tokenAddress: ADDR.sherToken,
            amount: '10000000',
            timestamp: 100
          }
        ]
      },
      ctx
    )
    expect(entry).toMatchObject({
      useCase: 'UC-CASH-03',
      debit: 'Shares to be issued',
      credit: 'Investor Equity',
      token: 'sher',
      shares: 10,
      amountUsd: 5 // 10 sher * $0.50
    })
  })

  it('books a USDC WithdrawToken as a cash settlement', () => {
    const [entry] = mapCashRemunerationEvents(
      {
        withdrawTokens: [
          {
            id: 'w3',
            contractAddress: ADDR.payroll,
            withdrawer: ADDR.member,
            tokenAddress: ADDR.usdcToken,
            amount: '3000000',
            timestamp: 100
          }
        ]
      },
      ctx
    )
    expect(entry).toMatchObject({ debit: 'Wage Payable', credit: 'Cash — Payroll', token: 'usdc' })
  })

  it('books a deposit as internal funding from its source pocket', () => {
    const [entry] = mapCashRemunerationEvents(
      {
        deposits: [
          {
            id: 'dep',
            contractAddress: ADDR.payroll,
            depositor: ADDR.bank,
            amount: '1000000',
            timestamp: 100
          }
        ]
      },
      ctx
    )
    expect(entry).toMatchObject({
      useCase: 'INTERNAL',
      debit: 'Cash — Payroll',
      credit: 'Cash — Bank',
      internal: true
    })
  })

  it('drops the empty GO leg of a SHER-only claim, keeping just the share issuance', () => {
    // A claim paid only in SHER still fires a native Withdraw(employee, 0) for the
    // wage's zero-rate GO component (the contract emits per component, no >0 guard).
    // Only the SHER equity leg should survive — no phantom $0 "Wage settlement".
    const entries = mapCashRemunerationEvents(
      {
        withdraws: [
          {
            id: 'go-0',
            contractAddress: ADDR.payroll,
            withdrawer: ADDR.member,
            amount: '0',
            timestamp: 100
          }
        ],
        withdrawTokens: [
          {
            id: 'sher-25',
            contractAddress: ADDR.payroll,
            withdrawer: ADDR.member,
            tokenAddress: ADDR.sherToken,
            amount: '25000000',
            timestamp: 100
          }
        ]
      },
      ctx
    )
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      debit: 'Shares to be issued',
      credit: 'Investor Equity',
      token: 'sher',
      shares: 25
    })
  })

  it('drops a dust native withdrawal that rounds to $0.00 (not just an exact zero)', () => {
    // A few wei of the 18-decimal native token: > 0, so the old `amount <= 0` guard
    // let it through, but it renders as quantity 0 / $0.00 — pure clutter. Skipped.
    const entries = mapCashRemunerationEvents(
      {
        withdraws: [
          {
            id: 'dust',
            contractAddress: ADDR.payroll,
            withdrawer: ADDR.member,
            amount: '1000000', // 1e6 wei ≈ 1e-12 native → rounds to 0 at 6 dp
            timestamp: 100
          }
        ]
      },
      ctx
    )
    expect(entries).toHaveLength(0)
  })

  it('books an owner sweep back to Bank as an internal move', () => {
    const [entry] = mapCashRemunerationEvents(
      {
        ownerTreasuryWithdrawNatives: [
          {
            id: 's1',
            contractAddress: ADDR.payroll,
            ownerAddress: ADDR.founder,
            amount: '1000000000000000000',
            timestamp: 100
          }
        ]
      },
      ctx
    )
    expect(entry).toMatchObject({
      useCase: 'INTERNAL',
      debit: 'Cash — Bank',
      credit: 'Cash — Payroll',
      internal: true
    })
  })
})
