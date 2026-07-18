import { describe, it, expect } from 'vitest'
import { getAddress } from 'viem'
import type { ExpenseResponse } from '@/types/expense-account'
import {
  mapExpenseAccountEvents,
  mapExpenseDrawsFromPortal
} from '@/utils/accounting/mappers/expenseAccount'
import { makeCtx, ADDR } from './fixtures'

const ctx = makeCtx()
const DAY = 86_400

/** An approved one-time 300-USDC budget for ADDR.member, created at t=50. */
const approvedBudget = (frequencyType = 0): ExpenseResponse =>
  ({
    id: 7,
    userAddress: ADDR.member,
    status: 'enabled',
    createdAt: new Date(50 * 1000).toISOString(),
    balances: { 0: '0', 1: '0' },
    data: {
      amount: 300,
      frequencyType,
      customFrequency: 0,
      startDate: 50,
      endDate: 99_999_999_999,
      tokenAddress: ADDR.usdcToken,
      approvedAddress: ADDR.member
    }
  }) as unknown as ExpenseResponse

/** A withdrawal row (token = USDC) — `at` seconds, `amount` in whole USDC. */
const draw = (id: string, whole: number, at: number) => ({
  id,
  contractAddress: ADDR.expense,
  withdrawer: ADDR.member,
  to: ADDR.member,
  token: ADDR.usdcToken,
  amount: String(whole * 1_000_000),
  timestamp: at
})

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

  it('books a one-time payout with the approved cap (no remaining) in its fields', () => {
    const [entry] = mapExpenseAccountEvents({ tokenTransfers: [draw('x6', 80, 100)] }, ctx, [
      approvedBudget()
    ])
    expect(entry).toMatchObject({
      useCase: 'UC-EXP-01',
      amountUsd: 80,
      expenseFrequencyType: 0,
      expenseApprovedUsd: 300
    })
    // A one-time approval is single-use — no remaining is reported.
    expect(entry.expenseRemainingUsd).toBeUndefined()
    expect(entry.memo).toContain('one-time approval of 300 USDC')
  })

  it('accumulates recurring draws within a period and reports the remaining after each', () => {
    // Daily budget, two draws the same day (period 0): 300 − 120 = 180, then − 80 = 100.
    const entries = mapExpenseAccountEvents(
      { tokenTransfers: [draw('x7', 120, 100), draw('x8', 80, 200)] },
      ctx,
      [approvedBudget(1)]
    )
    expect(entries.map((e) => e.amountUsd)).toEqual([120, 80])
    expect(entries.map((e) => e.expenseFrequencyType)).toEqual([1, 1])
    expect(entries.map((e) => e.expenseRemainingUsd)).toEqual([180, 100])
    expect(entries[0].memo).toContain('180 USDC left this period')
    expect(entries[1].memo).toContain('100 USDC left this period')
  })

  it('resets a recurring budget each period — a next-day draw sees the full cap again', () => {
    // Daily budget (startDate 50): a draw on day 0 then one ~a day later (period 1).
    const entries = mapExpenseAccountEvents(
      { tokenTransfers: [draw('x9', 250, 100), draw('x10', 40, 50 + DAY + 10)] },
      ctx,
      [approvedBudget(1)]
    )
    // Day 0: 300 − 250 = 50 left. Next day: cap resets → 300 − 40 = 260 left.
    expect(entries.map((e) => e.expenseRemainingUsd)).toEqual([50, 260])
  })

  it('flags a recurring period as fully drawn once its cap is reached', () => {
    const [entry] = mapExpenseAccountEvents({ tokenTransfers: [draw('x7b', 300, 100)] }, ctx, [
      approvedBudget(1)
    ])
    expect(entry.expenseRemainingUsd).toBe(0)
    expect(entry.memo).toContain('period budget fully drawn')
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

  it('books a one-time drawn balance with the approved cap (no remaining)', () => {
    const [entry] = mapExpenseDrawsFromPortal([partlyDrawn()], ctx)
    expect(entry).toMatchObject({
      id: 'expense-drawn-12',
      useCase: 'UC-EXP-01',
      debit: 'Operating Expense',
      credit: 'Cash — Expense',
      amountUsd: 99, // 99 USDC drawn @ $1
      timestamp: 300, // updatedAt
      category: 'Operating',
      enrichment: 'enriched',
      expenseFrequencyType: 0,
      expenseApprovedUsd: 200
    })
    expect(entry.counterparty).toBe(getAddress(ADDR.member))
    expect(entry.expenseRemainingUsd).toBeUndefined()
    expect(entry.memo).toContain('one-time approval of 200 USDC')
  })

  it('reports the current-period remaining for a recurring drawn balance', () => {
    // `balances[1]` is the contract's per-period `totalWithdrawn`: 200 cap − 99 = 101.
    const recurring = {
      ...partlyDrawn(),
      id: 15,
      data: { ...partlyDrawn().data, frequencyType: 2 }
    } as ExpenseResponse
    const [entry] = mapExpenseDrawsFromPortal([recurring], ctx)
    expect(entry.expenseFrequencyType).toBe(2)
    expect(entry.expenseRemainingUsd).toBe(101)
    expect(entry.memo).toContain('101 USDC left this period')
  })

  it('skips budgets with nothing drawn', () => {
    const nothingDrawn = {
      ...partlyDrawn(),
      id: 14,
      balances: { 0: '0', 1: '0' }
    } as ExpenseResponse
    const entries = mapExpenseDrawsFromPortal([partlyDrawn(), nothingDrawn], ctx)
    expect(entries).toHaveLength(1)
    expect(entries[0].id).toBe('expense-drawn-12')
  })
})
