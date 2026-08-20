import { describe, expect, it } from 'vitest'
import { getTokens } from '../expenseUtil'
import { SUPPORTED_TOKENS, USDC_ADDRESS } from '@/constant'
import type { TokenBalance } from '@/types'
import type { TableRow } from '@/types/table'

const usdcConfig = SUPPORTED_TOKENS.find((token) => token.id === 'usdc')!

const money = (value: number) => ({ value, formatted: `${value}` })
const pair = (value: number) => ({ usd: money(value), local: money(value) })

/** Contract holdings as `useContractBalance` exposes them. */
const heldUsdc = (amount: number): TokenBalance => ({
  token: usdcConfig,
  raw: BigInt(Math.round(amount * 1e6)),
  amount,
  price: pair(1),
  value: pair(amount)
})

/**
 * An expense row as the backend serialises it: `balances[1]` is the amount
 * already transferred in the current period, `data.amount` the approved budget.
 */
const expenseRow = (overrides: Partial<TableRow> = {}): TableRow => ({
  signature: '0xSignature',
  status: 'enabled',
  data: { amount: 2, tokenAddress: USDC_ADDRESS },
  balances: { 0: '1700000000', 1: '0' },
  ...overrides
})

describe('getTokens', () => {
  const spendableOf = (row: TableRow, balances: TokenBalance[]) =>
    getTokens([row], row.signature, balances)[0]?.spendableBalance

  it('treats a never-spent expense as fully spendable', () => {
    // Regression: 0 transferred is the normal state of a fresh approval. Read
    // as falsy it collapsed the whole budget to 0 and left nothing to spend.
    expect(spendableOf(expenseRow(), [heldUsdc(10)])).toBe(2)
  })

  it('treats a numeric 0 transferred the same as the string the API returns', () => {
    expect(spendableOf(expenseRow({ balances: { 0: '0', 1: 0 } }), [heldUsdc(10)])).toBe(2)
  })

  it('subtracts what has already been spent this period', () => {
    expect(spendableOf(expenseRow({ balances: { 0: '0', 1: '1.5' } }), [heldUsdc(10)])).toBe(0.5)
  })

  it('caps the spendable amount at what the contract actually holds', () => {
    // An ERC-20 transfer pays out of the contract's own balance, so an approved
    // budget the contract cannot cover is not spendable.
    expect(spendableOf(expenseRow(), [heldUsdc(0.5)])).toBe(0.5)
  })

  it('never reports a negative balance once the budget is exhausted', () => {
    expect(spendableOf(expenseRow({ balances: { 0: '0', 1: '3' } }), [heldUsdc(10)])).toBe(0)
  })

  it('survives a row the backend returned without balances', () => {
    // `syncExpenseStatus` short-circuits expired rows and passes through
    // `data.balances`, which `updateExpense` never persists.
    expect(spendableOf(expenseRow({ balances: undefined }), [heldUsdc(10)])).toBe(2)
  })

  it('reports no token until the contract balance has been read', () => {
    // The empty result is what `TransferAction` reads as "still loading" — it
    // must stay distinguishable from a real zero balance.
    expect(getTokens([expenseRow()], '0xSignature', [])).toEqual([])
  })

  it('exposes the balance and symbol alongside the spendable amount', () => {
    const [token] = getTokens([expenseRow()], '0xSignature', [heldUsdc(10)])

    expect(token).toMatchObject({ symbol: 'USDC', balance: 10, spendableBalance: 2 })
  })
})
