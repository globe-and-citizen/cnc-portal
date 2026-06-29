import { describe, it, expect } from 'vitest'
import { mapExpenseAccountEvents } from '@/utils/accounting/mappers/expenseAccount'
import { makeCtx, ADDR } from './fixtures'

const ctx = makeCtx()

describe('mapExpenseAccountEvents', () => {
  it('books an approved payout to an external member as UC-EXP-01', () => {
    const [entry] = mapExpenseAccountEvents(
      {
        transfers: [
          {
            id: 'x1',
            contractAddress: ADDR.expense,
            withdrawer: ADDR.expense,
            to: ADDR.member,
            amount: '4000000000000000000',
            timestamp: 100
          }
        ]
      },
      ctx
    )
    expect(entry).toMatchObject({
      useCase: 'UC-EXP-01',
      debit: 'Operating Expense',
      credit: 'Cash — Expense',
      amountUsd: 8, // 4 native * $2 (native: token null)
      enrichment: 'needs-off-chain-data'
    })
  })

  it('books a token payout with the right token and value', () => {
    const [entry] = mapExpenseAccountEvents(
      {
        tokenTransfers: [
          {
            id: 'x2',
            contractAddress: ADDR.expense,
            withdrawer: ADDR.expense,
            to: ADDR.member,
            token: ADDR.usdcToken,
            amount: '4000000',
            timestamp: 100
          }
        ]
      },
      ctx
    )
    expect(entry).toMatchObject({ useCase: 'UC-EXP-01', token: 'usdc', amountUsd: 4 })
  })

  it('treats a transfer to an internal pocket as an internal move', () => {
    const [entry] = mapExpenseAccountEvents(
      {
        transfers: [
          {
            id: 'x3',
            contractAddress: ADDR.expense,
            withdrawer: ADDR.expense,
            to: ADDR.bank,
            amount: '1000000',
            timestamp: 100
          }
        ]
      },
      ctx
    )
    expect(entry).toMatchObject({
      useCase: 'INTERNAL',
      debit: 'Cash — Bank',
      credit: 'Cash — Expense',
      internal: true
    })
  })

  it('books deposits as internal funding into the expense pocket', () => {
    const [entry] = mapExpenseAccountEvents(
      {
        deposits: [
          {
            id: 'x4',
            contractAddress: ADDR.expense,
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
      debit: 'Cash — Expense',
      credit: 'Cash — Bank',
      internal: true
    })
  })

  it('books an owner sweep back to Bank as an internal move', () => {
    const [entry] = mapExpenseAccountEvents(
      {
        ownerTreasuryWithdrawTokens: [
          {
            id: 'x5',
            contractAddress: ADDR.expense,
            ownerAddress: ADDR.founder,
            token: ADDR.usdcToken,
            amount: '1000000',
            timestamp: 100
          }
        ]
      },
      ctx
    )
    expect(entry).toMatchObject({
      useCase: 'INTERNAL',
      debit: 'Cash — Bank',
      credit: 'Cash — Expense',
      internal: true
    })
  })
})
