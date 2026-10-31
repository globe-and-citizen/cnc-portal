import { describe, expect, it } from 'vitest'
import { parseUnits } from 'viem'
import type { SafeIncomingTransfer } from '@/types/safe'
import { computeSafeCostBasis, type SafeCostBasis } from '../costBasis'
import { safeMovements, safeSwapHashes, type SafeAssetAmount } from '../swapTransfers'

const SAFE = '0x5AFE00000000000000000000000000000000cafe'
const SETTLEMENT = '0x9008d19f58aabd9ed0d60971565aa8510560ab41'
const USDC = '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359'
const WETH = '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619'
const POL = '0x0000000000000000000000000000000000001010'

type Token = { address: string; symbol: string; decimals: number }
const usdc: Token = { address: USDC, symbol: 'USDC', decimals: 6 }
const weth: Token = { address: WETH, symbol: 'WETH', decimals: 18 }
const pol: Token = { address: POL, symbol: 'POL', decimals: 18 }

type Move = [Token, string]

const transfer = (
  [token, quantity]: Move,
  isReceived: boolean,
  transactionHash: string,
  date: string
): SafeIncomingTransfer => ({
  type: 'ERC20_TRANSFER',
  executionDate: `${date}T12:00:00Z`,
  blockNumber: 0,
  transactionHash,
  from: isReceived ? SETTLEMENT : SAFE,
  to: isReceived ? SAFE : SETTLEMENT,
  value: parseUnits(quantity, token.decimals).toString(),
  tokenAddress: token.address,
  tokenInfo: { type: 'ERC20', name: token.symbol, ...token }
})
const swap = (hash: string, date: string, given: Move[], received: Move[]) => [
  ...given.map((move) => transfer(move, false, hash, date)),
  ...received.map((move) => transfer(move, true, hash, date))
]
const deposit = (hash: string, date: string, move: Move) => [transfer(move, true, hash, date)]
const payment = (hash: string, date: string, move: Move) => [transfer(move, false, hash, date)]

/** Number the blocks in the order given, then list the newest first as the Safe service does. */
const history = (...transactions: SafeIncomingTransfer[][]) =>
  transactions
    .flatMap((rows, index) => rows.map((row) => ({ ...row, blockNumber: index + 1 })))
    .reverse()

interface Market {
  on?: Record<string, Record<string, number>>
  now?: Record<string, number>
  fees?: Record<string, SafeAssetAmount>
}

const compute = (
  movements: SafeIncomingTransfer[],
  { on = {}, now = {}, fees = {} }: Market = {}
) =>
  computeSafeCostBasis(movements, {
    safeAddress: SAFE,
    swapHashes: safeSwapHashes(safeMovements(movements, SAFE), SAFE),
    isStable: (asset) => asset === USDC,
    prices: { on: (asset, day) => on[asset]?.[day], now: (asset) => now[asset] },
    feeOf: (rows) => fees[rows[0]!.transactionHash]
  })
const position = (basis: SafeCostBasis, symbol: string) =>
  basis.positions.find((token) => token.symbol === symbol)!

/** The worked example of the Safe swaps use-case document: two purchases, a payment and a sale. */
const wethExample = history(
  deposit('0xdeposit', '2026-05-01', [usdc, '5000']),
  swap('0xbuy1', '2026-06-01', [[usdc, '1000']], [[weth, '0.5']]),
  swap('0xbuy2', '2026-07-01', [[usdc, '1300']], [[weth, '0.5']]),
  payment('0xvendor', '2026-08-15', [weth, '0.5']),
  swap('0xsale', '2026-09-01', [[weth, '0.25']], [[usdc, '700']])
)
const wethMarket = { on: { [WETH]: { '2026-08-15': 2500 } }, now: { [WETH]: 2400 } }

describe('[US-SAFE-007] computeSafeCostBasis', () => {
  it('[AC-US-SAFE-007-03] averages the cost of repeated purchases of a token', () => {
    const basis = compute(wethExample.slice(3), { now: { [WETH]: 2400 } })

    expect(position(basis, 'WETH')).toMatchObject({
      quantity: 1,
      costUsd: 2300,
      averageCostUsd: 2300,
      pnlUsd: 100
    })
  })

  it('[AC-US-SAFE-007-04] fixes what left the Safe at its day price and values the rest today', () => {
    const basis = compute(wethExample, wethMarket)

    const token = position(basis, 'WETH')
    expect(token.history.map(({ pnlUsd }) => pnlUsd)).toEqual([null, null, 100, 125])
    expect(token).toMatchObject({ quantity: 0.25, costUsd: 575, valueUsd: 600, pnlUsd: 250 })
    expect(basis.pnlUsd).toBe(250)
  })

  it('[AC-US-SAFE-007-04] keeps the result of a payment whatever the price today', () => {
    const later = compute(wethExample, { ...wethMarket, now: { [WETH]: 3000 } })

    expect(position(later, 'WETH').history[2]!.pnlUsd).toBe(100)
    expect(position(later, 'WETH').pnlUsd).toBe(400)
  })

  it('[AC-US-SAFE-007-06] keeps a stablecoin at a $1 average cost, with no result', () => {
    const token = position(compute(wethExample, wethMarket), 'USDC')

    expect(token).toMatchObject({ quantity: 3400, averageCostUsd: 1, priceUsd: 1, pnlUsd: 0 })
  })

  it('[AC-US-SAFE-007-11] values an exchange from its stablecoin side, else from the side given', () => {
    const basis = compute(
      history(
        deposit('0xdeposit', '2026-05-01', [pol, '1000']),
        swap('0xpol', '2026-06-01', [[pol, '1000']], [[weth, '0.5']]),
        swap('0xsale', '2026-07-01', [[weth, '0.25']], [[usdc, '700']])
      ),
      {
        on: { [POL]: { '2026-05-01': 0.4, '2026-06-01': 0.5 }, [WETH]: { '2026-07-01': 9999 } },
        now: { [WETH]: 2400 }
      }
    )

    expect(basis.swaps.map(({ valueUsd }) => valueUsd)).toEqual([500, 700])
    expect(position(basis, 'POL').pnlUsd).toBe(100)
    expect(position(basis, 'WETH').history[1]!.pnlUsd).toBe(450)
  })

  it('[AC-US-SAFE-007-10] keeps a reported fee out of the exchange value and the P&L', () => {
    const basis = compute(
      history(
        deposit('0xdeposit', '2026-10-10', [usdc, '532.94']),
        swap('0xswap', '2026-10-20', [[usdc, '532.94']], [[weth, '0.1943']])
      ),
      {
        now: { [WETH]: 2248.53 },
        fees: { '0xswap': { asset: USDC, symbol: 'USDC', quantity: 3.87 } }
      }
    )

    expect(basis.swaps[0]).toMatchObject({
      given: [{ symbol: 'USDC', quantity: expect.closeTo(529.07, 6) }],
      valueUsd: expect.closeTo(529.07, 6),
      fee: { symbol: 'USDC', quantity: 3.87, usd: 3.87 }
    })
    expect(position(basis, 'WETH').averageCostUsd).toBeCloseTo(2722.95, 2)
    expect(basis.pnlUsd).toBeCloseTo(-92.18, 2)
    expect(basis.pnlRatio).toBeCloseTo(basis.pnlUsd / 529.07, 6)
    expect(basis.feesUsd).toBeCloseTo(3.87, 6)
    expect(position(basis, 'USDC')).toMatchObject({ quantity: 0, pnlUsd: 0 })
    expect(position(basis, 'USDC').history.map(({ kind, quantity }) => [kind, quantity])).toEqual([
      ['received', expect.closeTo(532.94, 6)],
      ['swap', expect.closeTo(529.07, 6)],
      ['fee', expect.closeTo(3.87, 6)]
    ])
  })

  it('[AC-US-SAFE-007-08] leaves a token unvalued when a price it needs is missing', () => {
    const basis = compute(wethExample, { now: { [WETH]: 2400 } })

    expect(position(basis, 'WETH').pnlUsd).toBeNull()
    expect(position(basis, 'WETH').history[2]!.pnlUsd).toBeNull()
    expect(basis.unvaluedTokens).toEqual(['WETH'])
    expect(basis.pnlUsd).toBe(0)
  })

  it('[AC-US-SAFE-007-08] leaves a token unvalued when it leaves more than its history holds', () => {
    const basis = compute(
      history(swap('0xswap', '2026-06-01', [[usdc, '1000']], [[weth, '0.5']])),
      { now: { [WETH]: 2400 } }
    )

    expect(position(basis, 'USDC').pnlUsd).toBeNull()
    expect(position(basis, 'WETH').pnlUsd).toBe(200)
    expect(basis.unvaluedTokens).toEqual(['USDC'])
  })

  it('[AC-US-SAFE-007-12] starts the average cost again once a position is emptied', () => {
    const basis = compute(
      history(
        deposit('0xdeposit', '2026-05-01', [usdc, '5000']),
        swap('0xbuy1', '2026-06-01', [[usdc, '1000']], [[weth, '0.5']]),
        swap('0xsale', '2026-07-01', [[weth, '0.5']], [[usdc, '1200']]),
        swap('0xbuy2', '2026-08-01', [[usdc, '1500']], [[weth, '0.5']])
      ),
      { now: { [WETH]: 3000 } }
    )

    expect(position(basis, 'WETH')).toMatchObject({ averageCostUsd: 3000, pnlUsd: 200 })
  })

  it('[AC-US-SAFE-007-11] shares the cost of several tokens received by their worth on the swap day', () => {
    const basis = compute(
      history(
        deposit('0xdeposit', '2026-05-01', [usdc, '1000']),
        swap(
          '0xswap',
          '2026-06-01',
          [[usdc, '1000']],
          [
            [weth, '0.25'],
            [pol, '250']
          ]
        )
      ),
      { on: { [WETH]: { '2026-06-01': 2000 }, [POL]: { '2026-06-01': 0.5 } } }
    )

    expect(position(basis, 'WETH').costUsd).toBeCloseTo(800, 6)
    expect(position(basis, 'POL').costUsd).toBeCloseTo(200, 6)
  })

  it('lists the swaps in chain order and the tokens still held first', () => {
    const basis = compute(
      history(
        deposit('0xdeposit', '2026-05-01', [usdc, '1000']),
        swap('0xbuy', '2026-06-01', [[usdc, '1000']], [[weth, '0.5']])
      )
    )

    expect(basis.count).toBe(1)
    expect(basis.swaps.map(({ txHash }) => txHash)).toEqual(['0xbuy'])
    expect(basis.positions.map(({ symbol }) => symbol)).toEqual(['WETH', 'USDC'])
  })
})
