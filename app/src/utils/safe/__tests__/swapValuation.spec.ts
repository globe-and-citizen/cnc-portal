import { describe, expect, it } from 'vitest'
import { zeroAddress } from 'viem'
import { SUPPORTED_TOKENS, USDC_ADDRESS } from '@/constant'
import type { CowOrder } from '@/types/cow'
import type { SafeClientBalances } from '@/types/safe'
import { SAFE_NATIVE_ASSET, type SafeSwap } from '../swapPnl'
import {
  buildSafeSwapReport,
  safeHeldPrices,
  safeSwapCoinIds,
  safeSwapContracts,
  safeSwapRateRequests,
  type SafeSwapValuationSources
} from '../swapValuation'

const SAFE = '0x5AFE00000000000000000000000000000000cafe'
const USDC = USDC_ADDRESS.toLowerCase()
const WETH = '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619'
const NATIVE_COIN_ID = SUPPORTED_TOKENS.find(({ id }) => id === 'native')!.coingeckoId
const TODAY = '2026-10-23'

const wethMarket = {
  address: WETH,
  data: { id: 'weth', platforms: { 'polygon-pos': WETH } }
}
const quote = (coinId: string, date: string, usd: number) => ({
  coinId,
  date,
  data: { market_data: { current_price: { usd } } }
})
const swap = (overrides: Partial<SafeSwap> = {}): SafeSwap => ({
  txHash: '0xswap',
  date: '2026-06-01',
  given: [{ asset: USDC, symbol: 'USDC', decimals: 6, quantity: 1000 }],
  received: [{ asset: WETH, symbol: 'WETH', decimals: 18, quantity: 0.5 }],
  ...overrides
})
const order = (overrides: Partial<CowOrder> = {}): CowOrder => ({
  owner: SAFE.toLowerCase(),
  status: 'fulfilled',
  sellToken: USDC,
  buyToken: WETH,
  executedFee: '3500000',
  executedFeeToken: USDC,
  ...overrides
})
const sources = (overrides: Partial<SafeSwapValuationSources> = {}): SafeSwapValuationSources => ({
  safeAddress: SAFE,
  today: TODAY,
  coinIds: safeSwapCoinIds([wethMarket]),
  heldPrices: new Map([[WETH, 2400]]),
  rates: [],
  orders: [],
  ...overrides
})

describe('[US-SAFE-007] Safe swap valuation', () => {
  it('reads the current USD price of every held asset the Gateway values', () => {
    const balances: SafeClientBalances = {
      fiatTotal: '0',
      items: [
        {
          tokenInfo: {
            type: 'NATIVE_TOKEN',
            address: zeroAddress,
            decimals: 18,
            symbol: 'POL',
            name: 'POL'
          },
          balance: '1',
          fiatConversion: '0.4',
          fiatBalance: '0'
        },
        {
          tokenInfo: {
            type: 'ERC20',
            address: WETH.toUpperCase(),
            decimals: 18,
            symbol: 'WETH',
            name: 'WETH'
          },
          balance: '1',
          fiatConversion: null,
          fiatBalance: null
        }
      ]
    }

    expect([...safeHeldPrices(balances)]).toEqual([[SAFE_NATIVE_ASSET, 0.4]])
  })

  it('looks up market identities only for swap tokens outside the supported list', () => {
    expect(safeSwapContracts([swap()])).toEqual([WETH])
  })

  it('accepts a market identity only when its metadata names the same contract', () => {
    const coinIds = safeSwapCoinIds([
      wethMarket,
      { address: '0x00000000000000000000000000000000000005a5', data: { id: 'fake' } }
    ])

    expect(coinIds.get(WETH)).toBe('weth')
    expect(coinIds.has('0x00000000000000000000000000000000000005a5')).toBe(false)
  })

  it("[AC-US-SAFE-007-04] requests today's quote only for a received asset the Safe no longer holds", () => {
    const coinIds = safeSwapCoinIds([wethMarket])
    const sold = swap({
      given: [{ asset: WETH, symbol: 'WETH', decimals: 18, quantity: 0.5 }],
      received: [{ asset: USDC, symbol: 'USDC', decimals: 6, quantity: 1200 }]
    })

    expect(safeSwapRateRequests([swap(), sold], coinIds, new Map(), TODAY)).toEqual([
      { coinId: 'weth', date: TODAY },
      { coinId: 'weth', date: '2026-06-01' }
    ])
    expect(safeSwapRateRequests([swap()], coinIds, new Map([[WETH, 1]]), TODAY)).toEqual([])
  })

  it('[AC-US-SAFE-007-07] reads the CoW fee of the Safe’s own fulfilled order in the asset it sold', () => {
    const orders = [
      order(),
      order({ owner: '0x00000000000000000000000000000000000000aa' }),
      order({ status: 'expired' }),
      order({ executedFeeToken: WETH })
    ]

    const feesOf = (data: CowOrder[]) =>
      buildSafeSwapReport([swap()], sources({ orders: [{ txHash: '0xswap', data }] }))

    expect(feesOf(orders)).toMatchObject({ feesUsd: 3.5, feesReported: 1 })
    expect(feesOf(orders.slice(1))).toMatchObject({ feesUsd: null, feesReported: 0 })
  })

  it('[AC-US-SAFE-007-03] values the assets given up at the price of the swap day', () => {
    const report = buildSafeSwapReport(
      [
        swap({
          given: [{ asset: SAFE_NATIVE_ASSET, symbol: 'POL', decimals: 18, quantity: 2000 }]
        })
      ],
      sources({ rates: [quote(NATIVE_COIN_ID, '2026-06-01', 0.25)] })
    )

    expect(report).toMatchObject({ swappedUsd: 500, currentUsd: 1200, pnlUsd: 700 })
  })

  it('[AC-US-SAFE-007-04] values a received asset at its held price, else at today’s quote', () => {
    const held = buildSafeSwapReport([swap()], sources())
    const soldSince = buildSafeSwapReport(
      [swap()],
      sources({ heldPrices: new Map(), rates: [quote('weth', TODAY, 2200)] })
    )

    expect(held.currentUsd).toBe(1200)
    expect(soldSince.currentUsd).toBe(1100)
  })

  it('[AC-US-SAFE-007-06] values USD stablecoins at their peg', () => {
    const report = buildSafeSwapReport(
      [
        swap({
          given: [{ asset: WETH, symbol: 'WETH', decimals: 18, quantity: 1 }],
          received: [{ asset: USDC, symbol: 'USDC', decimals: 6, quantity: 2990 }]
        })
      ],
      sources({ heldPrices: new Map([[USDC, 0.9991]]), rates: [quote('weth', '2026-06-01', 3000)] })
    )

    expect(report).toMatchObject({ swappedUsd: 3000, currentUsd: 2990, missingPrices: [] })
    expect(report.pnlUsd).toBeCloseTo(-10)
  })

  it('[AC-US-SAFE-007-07] values the reported fee in USD on the swap day', () => {
    const report = buildSafeSwapReport(
      [swap()],
      sources({ orders: [{ txHash: '0xswap', data: [order()] }] })
    )

    expect(report).toMatchObject({ feesUsd: 3.5, feesReported: 1 })
  })

  it('[AC-US-SAFE-007-08] reports a failed or empty quote as a missing price', () => {
    const report = buildSafeSwapReport(
      [swap({ given: [{ asset: WETH, symbol: 'WETH', decimals: 18, quantity: 1 }] })],
      sources({ rates: [{ coinId: 'weth', date: '2026-06-01', data: { market_data: {} } }] })
    )

    expect(report.missingPrices).toEqual(['WETH'])
  })
})
