import { describe, expect, it } from 'vitest'
import { parseUnits, zeroAddress } from 'viem'
import { SUPPORTED_TOKENS, USDC_ADDRESS } from '@/constant'
import type { CowOrder } from '@/types/cow'
import type { SafeClientBalance, SafeIncomingTransfer } from '@/types/safe'
import type { SafeCostBasis } from '../costBasis'
import { SAFE_NATIVE_ASSET } from '../swapTransfers'
import {
  buildSafeCostBasis,
  safeCostBasisRateRequests,
  safeSwapCoinIds,
  safeSwapTransfers,
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
/** Fund the Safe with the asset a swap sells just before it, so the history covers the sale. */
const funded = (rows: SafeIncomingTransfer[]): SafeIncomingTransfer[] => {
  const sold = rows.find(({ from }) => from === SAFE)!
  const funding = { ...sold, from: '0xfunder', to: SAFE, transactionHash: '0xfunding' }
  return [...rows, { ...funding, blockNumber: 0 }]
}
const positionOf = (basis: SafeCostBasis, symbol: string) =>
  basis.positions.find((position) => position.symbol === symbol)!
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

  it('retains interleaved swap rows in source order and leaves same-asset round trips out', () => {
    const first = swap({ txHash: '0xfirst' })
    const second = swap({ txHash: '0xsecond', sell: WETH, buy: USDC })
    const roundTrip = swap({ txHash: '0xround', buy: USDC })
    const rows = [first[0]!, second[0]!, roundTrip[0]!, second[1]!, first[1]!, roundTrip[1]!]
    const selected = safeSwapTransfers(rows, SAFE)

    expect(selected).toEqual([first[0], second[0], second[1], first[1]])
    selected.forEach((row) => expect(rows).toContain(row))
  })

  it('[AC-US-SAFE-007-07] reads the CoW fee of the Safe’s own fulfilled order in the asset it sold', () => {
    const orders = [
      order(),
      order({ owner: '0x00000000000000000000000000000000000000aa' }),
      order({ status: 'expired' }),
      order({ executedFeeToken: WETH })
    ]

    const feesOf = (data: CowOrder[]) =>
      buildSafeCostBasis(funded(swap()), sources({ orders: [{ txHash: '0xswap', data }] })).feesUsd

    expect(feesOf(orders)).toBe(3.5)
    expect(feesOf(orders.slice(1))).toBeNull()
  })

  it('values the assets given up at the price of the swap day', () => {
    const basis = buildSafeCostBasis(
      funded(swap({ sell: SAFE_NATIVE_ASSET, sellAmount: '2000' })),
      sources({ rates: [quote(NATIVE_COIN_ID, '2026-06-01', 0.25)] })
    )

    expect(positionOf(basis, 'WETH')).toMatchObject({ costUsd: 500, valueUsd: 1200, pnlUsd: 700 })
  })

  it('[AC-US-SAFE-007-04] values a held asset at its Gateway price, else at today’s quote', () => {
    const held = buildSafeCostBasis(funded(swap()), sources())
    const unlisted = buildSafeCostBasis(
      funded(swap()),
      sources({ heldBalances: [], rates: [quote('weth', TODAY, 2200)] })
    )

    expect(positionOf(held, 'WETH').valueUsd).toBe(1200)
    expect(positionOf(unlisted, 'WETH').valueUsd).toBe(1100)
  })

  it('[AC-US-SAFE-007-06] values USD stablecoins at their peg', () => {
    const basis = buildSafeCostBasis(
      funded(swap({ sell: WETH, sellAmount: '1', buy: USDC, buyAmount: '2990' })),
      sources({ heldBalances: [held(USDC, 0.9991)], rates: [quote('weth', '2026-06-01', 3000)] })
    )

    expect(positionOf(basis, 'USDC')).toMatchObject({ priceUsd: 1, valueUsd: 2990, pnlUsd: 0 })
  })

  it('adds fees from several fulfilled orders after netting a sold-token refund', () => {
    const rows = swap()
    const refund = { ...rows[0]!, from: rows[0]!.to, to: SAFE, value: '10000000' }
    const basis = buildSafeCostBasis(
      funded([...rows, refund]),
      sources({ orders: [{ txHash: '0xswap', data: [order(), order({ executedFee: '500000' })] }] })
    )

    expect(basis.feesUsd).toBe(4)
    expect(positionOf(basis, 'WETH')).toMatchObject({ costUsd: 986, pnlUsd: 214 })
  })

  it('reports a failed or empty quote as an unvalued token', () => {
    const basis = buildSafeCostBasis(
      funded(swap({ sell: WETH, sellAmount: '1', buy: USDC, buyAmount: '2990' })),
      sources({ rates: [{ coinId: 'weth', date: '2026-06-01', data: { market_data: {} } }] })
    )

    expect(basis.unvaluedTokens).toEqual(['WETH'])
  })
})

describe('[US-SAFE-007] Safe cost basis valuation', () => {
  const [sold, bought] = swap()
  const deposit = {
    ...sold!,
    from: '0xfunder',
    to: SAFE,
    transactionHash: '0xdeposit',
    blockNumber: 0
  }
  const payment = {
    ...bought!,
    from: SAFE,
    to: '0xvendor',
    transactionHash: '0xpayment',
    executionDate: '2026-07-01T12:00:00Z',
    blockNumber: 2,
    value: parseUnits('0.1', 18).toString()
  }
  const movements = [payment, sold!, bought!, deposit]

  it('[AC-US-SAFE-007-03] requests once each quote the cost basis reads', () => {
    expect(safeCostBasisRateRequests(movements, sources())).toEqual([
      { coinId: 'weth', date: '2026-07-01' }
    ])
    expect(safeCostBasisRateRequests(movements, sources({ heldBalances: [] }))).toEqual([
      { coinId: 'weth', date: TODAY },
      { coinId: 'weth', date: '2026-07-01' }
    ])
  })

  it('[AC-US-SAFE-007-04] values every movement of a token from the settled quotes and balances', () => {
    const basis = buildSafeCostBasis(
      movements,
      sources({ rates: [quote('weth', '2026-07-01', 2500)] })
    )

    expect(basis.positions.find(({ symbol }) => symbol === 'WETH')).toMatchObject({
      quantity: 0.4,
      averageCostUsd: 2000,
      priceUsd: 2400,
      pnlUsd: 210
    })
    expect(basis).toMatchObject({ count: 1, pnlUsd: 210, unvaluedTokens: [] })
  })
})
