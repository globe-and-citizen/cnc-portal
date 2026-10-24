import { describe, expect, it } from 'vitest'
import { parseUnits, zeroAddress } from 'viem'
import { SUPPORTED_TOKENS, USDC_ADDRESS } from '@/constant'
import type { CowOrder } from '@/types/cow'
import type { SafeClientBalance, SafeIncomingTransfer } from '@/types/safe'
import { SAFE_NATIVE_ASSET } from '../swapPnl'
import {
  buildSafeSwapReport,
  safeSwapCoinIds,
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
const swap = ({
  sell = USDC,
  sellAmount = '1000',
  buy = WETH,
  buyAmount = '0.5',
  txHash = '0xswap'
} = {}): SafeIncomingTransfer[] =>
  [
    [sell, sellAmount],
    [buy, buyAmount]
  ].map(([asset, amount], index) => ({
    type: asset === SAFE_NATIVE_ASSET ? 'ETHER_TRANSFER' : 'ERC20_TRANSFER',
    executionDate: '2026-06-01T12:00:00Z',
    blockNumber: 1,
    transactionHash: txHash!,
    from: index === 0 ? SAFE : '0xsettlement',
    to: index === 0 ? '0xsettlement' : SAFE,
    value: parseUnits(amount!, asset === USDC ? 6 : 18).toString(),
    tokenAddress: asset === SAFE_NATIVE_ASSET ? null : asset,
    tokenInfo:
      asset === SAFE_NATIVE_ASSET
        ? undefined
        : {
            type: 'ERC20',
            address: asset!,
            name: asset === USDC ? 'USDC' : 'WETH',
            symbol: asset === USDC ? 'USDC' : 'WETH',
            decimals: asset === USDC ? 6 : 18
          }
  }))
const held = (address: string, price: number): SafeClientBalance => ({
  tokenInfo: {
    type: address === SAFE_NATIVE_ASSET ? 'NATIVE_TOKEN' : 'ERC20',
    address: address === SAFE_NATIVE_ASSET ? zeroAddress : address,
    decimals: address === USDC ? 6 : 18,
    symbol: address === USDC ? 'USDC' : 'WETH',
    name: 'Token'
  },
  balance: '1',
  fiatConversion: String(price),
  fiatBalance: '0'
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
  heldBalances: [held(WETH, 2400)],
  rates: [],
  orders: [],
  ...overrides
})

describe('[US-SAFE-007] Safe swap valuation', () => {
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
      sell: WETH,
      sellAmount: '0.5',
      buy: USDC,
      buyAmount: '1200',
      txHash: '0xsold'
    })

    expect(safeSwapRateRequests([...swap(), ...sold], SAFE, coinIds, [], TODAY)).toEqual([
      { coinId: 'weth', date: TODAY },
      { coinId: 'weth', date: '2026-06-01' }
    ])
    expect(safeSwapRateRequests(swap(), SAFE, coinIds, [held(WETH, 1)], TODAY)).toEqual([])
  })

  it('does not request a current quote for a refund of the asset sold', () => {
    const sold = swap({ sell: WETH, sellAmount: '1', buy: USDC, buyAmount: '2000' })
    const refund = { ...sold[0]!, from: sold[0]!.to, to: SAFE, value: '10000000000000000' }
    expect(
      safeSwapRateRequests([...sold, refund], SAFE, safeSwapCoinIds([wethMarket]), [], TODAY)
    ).toEqual([{ coinId: 'weth', date: '2026-06-01' }])
  })

  it('[AC-US-SAFE-007-07] reads the CoW fee of the Safe’s own fulfilled order in the asset it sold', () => {
    const orders = [
      order(),
      order({ owner: '0x00000000000000000000000000000000000000aa' }),
      order({ status: 'expired' }),
      order({ executedFeeToken: WETH })
    ]

    const feesOf = (data: CowOrder[]) =>
      buildSafeSwapReport(swap(), sources({ orders: [{ txHash: '0xswap', data }] }))

    expect(feesOf(orders)).toMatchObject({ feesUsd: 3.5, feesReported: 1 })
    expect(feesOf(orders.slice(1))).toMatchObject({ feesUsd: null, feesReported: 0 })
  })

  it('[AC-US-SAFE-007-03] values the assets given up at the price of the swap day', () => {
    const report = buildSafeSwapReport(
      swap({ sell: SAFE_NATIVE_ASSET, sellAmount: '2000' }),
      sources({ rates: [quote(NATIVE_COIN_ID, '2026-06-01', 0.25)] })
    )

    expect(report).toMatchObject({ swappedUsd: 500, currentUsd: 1200, pnlUsd: 700 })
  })

  it('[AC-US-SAFE-007-04] values a received asset at its held price, else at today’s quote', () => {
    const held = buildSafeSwapReport(swap(), sources())
    const soldSince = buildSafeSwapReport(
      swap(),
      sources({ heldBalances: [], rates: [quote('weth', TODAY, 2200)] })
    )

    expect(held.currentUsd).toBe(1200)
    expect(soldSince.currentUsd).toBe(1100)
  })

  it('[AC-US-SAFE-007-06] values USD stablecoins at their peg', () => {
    const report = buildSafeSwapReport(
      swap({ sell: WETH, sellAmount: '1', buy: USDC, buyAmount: '2990' }),
      sources({ heldBalances: [held(USDC, 0.9991)], rates: [quote('weth', '2026-06-01', 3000)] })
    )

    expect(report).toMatchObject({ swappedUsd: 3000, currentUsd: 2990, missingPrices: [] })
    expect(report.pnlUsd).toBeCloseTo(-10)
  })

  it('[AC-US-SAFE-007-07] values the reported fee in USD on the swap day', () => {
    const report = buildSafeSwapReport(
      swap(),
      sources({ orders: [{ txHash: '0xswap', data: [order()] }] })
    )

    expect(report).toMatchObject({ feesUsd: 3.5, feesReported: 1 })
  })

  it('[AC-US-SAFE-007-08] reports a failed or empty quote as a missing price', () => {
    const report = buildSafeSwapReport(
      swap({ sell: WETH, sellAmount: '1', buy: USDC, buyAmount: '2990' }),
      sources({ rates: [{ coinId: 'weth', date: '2026-06-01', data: { market_data: {} } }] })
    )

    expect(report.missingPrices).toEqual(['WETH'])
  })
})
