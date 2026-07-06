import { describe, it, expect } from 'vitest'
import { getAddress } from 'viem'
import type { ExpenseResponse } from '@/types/expense-account'
import {
  mapExpenseAccountEvents,
  mapExpenseDrawsFromPortal
} from '@/utils/accounting/mappers/expenseAccount'
import { makeCtx, ADDR } from './fixtures'

const ctx = makeCtx()

/** An approved one-time 300-USDC budget for ADDR.member, created at t=50. */
const approvedBudget = (): ExpenseResponse =>
  ({
    id: 7,
    userAddress: ADDR.member,
    status: 'enabled',
    createdAt: new Date(50 * 1000).toISOString(),
    balances: { 0: '0', 1: '0' },
    data: {
      amount: 300,
      frequencyType: 0,
      customFrequency: 0,
      startDate: 50,
      endDate: 99_999_999_999,
      tokenAddress: ADDR.usdcToken,
      approvedAddress: ADDR.member
    }
  }) as unknown as ExpenseResponse

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

  it('books each partial draw cash-basis and reports the remaining budget in the memo', () => {
    const entries = mapExpenseAccountEvents(
      {
        tokenTransfers: [
          {
            id: 'x6',
            contractAddress: ADDR.expense,
            withdrawer: ADDR.member,
            to: ADDR.member,
            token: ADDR.usdcToken,
            amount: '120000000',
            timestamp: 100
          },
          {
            id: 'x7',
            contractAddress: ADDR.expense,
            withdrawer: ADDR.member,
            to: ADDR.member,
            token: ADDR.usdcToken,
            amount: '80000000',
            timestamp: 200
          }
        ]
      },
      ctx,
      [approvedBudget()]
    )
    expect(entries).toHaveLength(2)
    for (const entry of entries) {
      expect(entry).toMatchObject({
        useCase: 'UC-EXP-01',
        debit: 'Operating Expense',
        credit: 'Cash — Expense',
        enrichment: 'needs-off-chain-data'
      })
    }
    expect(entries.map((e) => e.amountUsd)).toEqual([120, 80])
    // 300 cap − 120 = 180 left; then − 80 = 100 left.
    expect(entries[0].memo).toContain('180 USDC left')
    expect(entries[1].memo).toContain('100 USDC left')
  })

  it('flags the budget as fully drawn once the cap is reached', () => {
    const [entry] = mapExpenseAccountEvents(
      {
        tokenTransfers: [
          {
            id: 'x7b',
            contractAddress: ADDR.expense,
            withdrawer: ADDR.member,
            to: ADDR.member,
            token: ADDR.usdcToken,
            amount: '300000000',
            timestamp: 100
          }
        ]
      },
      ctx,
      [approvedBudget()]
    )
    expect(entry.memo).toContain('budget fully drawn')
  })

  it('omits the remaining-budget note when no portal budget matches the payout', () => {
    const [entry] = mapExpenseAccountEvents(
      {
        tokenTransfers: [
          {
            id: 'x8',
            contractAddress: ADDR.expense,
            withdrawer: ADDR.member,
            to: ADDR.member,
            token: ADDR.usdcToken,
            amount: '4000000',
            timestamp: 100
          }
        ]
      },
      ctx
    )
    expect(entry).toMatchObject({ debit: 'Operating Expense', credit: 'Cash — Expense' })
    expect(entry.memo).toBe('Approved expense payout')
  })

  it('keys the payout on the withdrawer (the budget member), naming the recipient in the memo', () => {
    const [entry] = mapExpenseAccountEvents(
      {
        tokenTransfers: [
          {
            id: 'x9',
            contractAddress: ADDR.expense,
            withdrawer: ADDR.member,
            to: ADDR.client,
            token: ADDR.usdcToken,
            amount: '4000000',
            timestamp: 100
          }
        ]
      },
      ctx
    )
    expect(entry.counterparty).toBe(getAddress(ADDR.member))
    expect(entry.memo).toContain(ADDR.client)
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

describe('mapExpenseDrawsFromPortal', () => {
  /** A partially-drawn 200-USDC budget: 99 drawn, updated at t=300. */
  const partlyDrawn = (): ExpenseResponse =>
    ({
      id: 12,
      userAddress: ADDR.member,
      status: 'limit-reached',
      createdAt: new Date(50 * 1000).toISOString(),
      updatedAt: new Date(300 * 1000).toISOString(),
      balances: { 0: '0', 1: '99' },
      data: {
        amount: 200,
        frequencyType: 0,
        customFrequency: 0,
        startDate: 50,
        endDate: 99_999_999_999,
        tokenAddress: ADDR.usdcToken,
        approvedAddress: ADDR.member
      }
    }) as unknown as ExpenseResponse

  it('books the drawn balance cash-basis with the remaining budget in the memo', () => {
    const [entry] = mapExpenseDrawsFromPortal([partlyDrawn()], ctx)
    expect(entry).toMatchObject({
      id: 'expense-drawn-12',
      useCase: 'UC-EXP-01',
      debit: 'Operating Expense',
      credit: 'Cash — Expense',
      amountUsd: 99, // 99 USDC drawn @ $1
      timestamp: 300, // updatedAt
      category: 'Operating',
      enrichment: 'enriched'
    })
    expect(entry.counterparty).toBe(getAddress(ADDR.member))
    expect(entry.memo).toContain('101 USDC left') // 200 cap − 99 drawn
  })

  it('flags a fully-drawn budget and skips budgets with nothing drawn', () => {
    const fullyDrawn = {
      ...partlyDrawn(),
      id: 13,
      balances: { 0: '0', 1: '200' }
    } as ExpenseResponse
    const nothingDrawn = {
      ...partlyDrawn(),
      id: 14,
      balances: { 0: '0', 1: '0' }
    } as ExpenseResponse
    const entries = mapExpenseDrawsFromPortal([fullyDrawn, nothingDrawn], ctx)
    expect(entries).toHaveLength(1)
    expect(entries[0].id).toBe('expense-drawn-13')
    expect(entries[0].memo).toContain('budget fully drawn')
  })
})
