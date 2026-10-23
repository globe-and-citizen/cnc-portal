import { describe, expect, it } from 'vitest'
import { parseUnits } from 'viem'
import { SUPPORTED_TOKENS, USDC_ADDRESS, USDC_E_ADDRESS } from '@/constant'
import type { CowOrder } from '@/types/cow'
import type { SafeIncomingTransfer } from '@/types/safe'
import { SAFE_NATIVE_ASSET, toSafeSwaps } from '../swapPnl'
import { buildSafeSwapReport, safeSwapCoinIds } from '../swapValuation'

/**
 * Each use case of the Safe swap P&L catalogue (docs/features/accounts/safe-swap-pnl-use-cases.md)
 * replayed end to end: the Safe history as the Safe Transaction Service returns it, the prices and
 * CoW orders as their providers return them, and the four Wallet overview figures.
 */
const SAFE = '0x5AFE00000000000000000000000000000000cafe'
const SETTLEMENT = '0x9008d19f58aabd9ed0d60971565aa8510560ab41'
const OUTSIDE = '0x00000000000000000000000000000000000000aa'
const USDC = USDC_ADDRESS.toLowerCase()
const USDCE = USDC_E_ADDRESS.toLowerCase()
const WETH = '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619'
const NATIVE_COIN_ID = SUPPORTED_TOKENS.find(({ id }) => id === 'native')!.coingeckoId
const SWAP_DAY = '2026-06-01'
const TODAY = '2026-10-23'

const TOKENS = {
  USDC: { address: USDC, symbol: 'USDC', decimals: 6 },
  USDCe: { address: USDCE, symbol: 'USDCe', decimals: 6 },
  WETH: { address: WETH, symbol: 'WETH', decimals: 18 },
  POL: { address: SAFE_NATIVE_ASSET, symbol: 'POL', decimals: 18 }
}
type Symbol = keyof typeof TOKENS

let block = 0
/** One Safe Transaction Service transfer row; `in` reaches the Safe, `out` leaves it. */
const transfer = (
  txHash: string,
  direction: 'in' | 'out',
  amount: string,
  symbol: Symbol,
  { counterparty = SETTLEMENT, day = SWAP_DAY } = {}
): SafeIncomingTransfer => {
  const token = TOKENS[symbol]
  const native = symbol === 'POL'
  block += 1
  return {
    type: native ? 'ETHER_TRANSFER' : 'ERC20_TRANSFER',
    executionDate: `${day}T12:00:00Z`,
    blockNumber: block,
    transactionHash: txHash,
    from: direction === 'in' ? counterparty : SAFE,
    to: direction === 'in' ? SAFE : counterparty,
    value: parseUnits(amount, token.decimals).toString(),
    tokenAddress: native ? null : token.address,
    tokenInfo: native ? undefined : { type: 'ERC20', name: token.symbol, ...token }
  }
}
const quote = (coinId: string, date: string, usd: number) => ({
  coinId,
  date,
  data: { market_data: { current_price: { usd } } }
})
const cowOrder = (feeUsdc: string): CowOrder => ({
  owner: SAFE.toLowerCase(),
  status: 'fulfilled',
  sellToken: USDC,
  buyToken: WETH,
  executedFee: parseUnits(feeUsdc, 6).toString(),
  executedFeeToken: USDC
})

interface Scenario {
  history: SafeIncomingTransfer[]
  held?: [string, number][]
  rates?: ReturnType<typeof quote>[]
  orders?: { txHash: string; data: CowOrder[] }[]
}
const overviewOf = ({ history, held = [], rates = [], orders = [] }: Scenario) =>
  buildSafeSwapReport(toSafeSwaps(history, SAFE), {
    safeAddress: SAFE,
    today: TODAY,
    coinIds: safeSwapCoinIds([
      { address: WETH, data: { id: 'weth', platforms: { 'polygon-pos': WETH } } }
    ]),
    heldPrices: new Map(held),
    rates,
    orders
  })

const buyWeth = (txHash = '0xbuy', day = SWAP_DAY) => [
  transfer(txHash, 'out', '1000', 'USDC', { day }),
  transfer(txHash, 'in', '0.5', 'WETH', { day })
]

describe('[US-SAFE-007] Safe swap P&L use cases', () => {
  describe('market moves', () => {
    it('UC-SWAP-001 buys a volatile asset whose price then rises', () => {
      const overview = overviewOf({ history: buyWeth(), held: [[WETH, 2400]] })

      expect(overview).toMatchObject({ count: 1, swappedUsd: 1000, currentUsd: 1200, pnlUsd: 200 })
      expect(overview.pnlRatio).toBeCloseTo(0.2)
    })

    it('UC-SWAP-002 buys a volatile asset whose price then falls', () => {
      const overview = overviewOf({ history: buyWeth(), held: [[WETH, 1800]] })

      expect(overview).toMatchObject({ swappedUsd: 1000, currentUsd: 900, pnlUsd: -100 })
      expect(overview.pnlRatio).toBeCloseTo(-0.1)
    })

    it('UC-SWAP-003 sells a volatile asset for a stablecoin, which then stays at its peg', () => {
      const overview = overviewOf({
        history: [transfer('0xsell', 'out', '1', 'WETH'), transfer('0xsell', 'in', '2990', 'USDC')],
        held: [[USDC, 0.9991]],
        rates: [quote('weth', SWAP_DAY, 3000)]
      })

      expect(overview).toMatchObject({ swappedUsd: 3000, currentUsd: 2990, missingPrices: [] })
      expect(overview.pnlUsd).toBeCloseTo(-10)
    })

    it('UC-SWAP-004 exchanges two volatile assets, each at its market price', () => {
      const overview = overviewOf({
        history: [transfer('0xpol', 'out', '2000', 'POL'), transfer('0xpol', 'in', '0.2', 'WETH')],
        held: [[WETH, 2600]],
        rates: [quote(NATIVE_COIN_ID, SWAP_DAY, 0.25)]
      })

      expect(overview).toMatchObject({ swappedUsd: 500, currentUsd: 520, pnlUsd: 20 })
      expect(overview.pnlRatio).toBeCloseTo(0.04)
    })

    it('UC-SWAP-005 exchanges two stablecoins, so only the amount lost in the swap shows', () => {
      const overview = overviewOf({
        history: [
          transfer('0xstable', 'out', '1000', 'USDC'),
          transfer('0xstable', 'in', '998.5', 'USDCe')
        ]
      })

      expect(overview).toMatchObject({ swappedUsd: 1000, currentUsd: 998.5, missingPrices: [] })
      expect(overview.pnlUsd).toBeCloseTo(-1.5)
    })
  })

  describe('after the swap', () => {
    it('UC-SWAP-006 values a received asset spent since at today’s price, as if it had been kept', () => {
      const overview = overviewOf({
        history: [
          ...buyWeth(),
          transfer('0xpay', 'out', '0.5', 'WETH', { counterparty: OUTSIDE, day: '2026-07-01' })
        ],
        rates: [quote('weth', TODAY, 2200)]
      })

      expect(overview).toMatchObject({ count: 1, currentUsd: 1100, pnlUsd: 100 })
    })

    it('UC-SWAP-007 adds up several swaps made on different days', () => {
      const overview = overviewOf({
        history: [
          ...buyWeth('0xjune', SWAP_DAY),
          transfer('0xjuly', 'out', '1', 'WETH', { day: '2026-07-15' }),
          transfer('0xjuly', 'in', '2500', 'USDC', { day: '2026-07-15' })
        ],
        held: [[WETH, 2400]],
        rates: [quote('weth', '2026-07-15', 2600)]
      })

      expect(overview).toMatchObject({ count: 2, swappedUsd: 3600, currentUsd: 3700, pnlUsd: 100 })
      expect(overview.pnlRatio).toBeCloseTo(100 / 3600)
    })
  })

  describe('fees', () => {
    it('UC-SWAP-008 shows the fee CoW Protocol reports for the Safe’s order', () => {
      const overview = overviewOf({
        history: buyWeth(),
        held: [[WETH, 2400]],
        orders: [{ txHash: '0xbuy', data: [cowOrder('3.5')] }]
      })

      expect(overview).toMatchObject({ feesUsd: 3.5, feesReported: 1, pnlUsd: 200 })
    })

    it('UC-SWAP-009 reports no fee for a swap the provider does not know', () => {
      const overview = overviewOf({
        history: buyWeth(),
        held: [[WETH, 2400]],
        orders: [{ txHash: '0xbuy', data: [] }]
      })

      expect(overview).toMatchObject({ feesUsd: null, feesReported: 0 })
    })

    it('UC-SWAP-010 counts the fees of the swaps that report one when only some do', () => {
      const overview = overviewOf({
        history: [...buyWeth('0xcow'), ...buyWeth('0xdex')],
        held: [[WETH, 2400]],
        orders: [{ txHash: '0xcow', data: [cowOrder('3.5')] }]
      })

      expect(overview).toMatchObject({ count: 2, swappedUsd: 2000, feesUsd: 3.5, feesReported: 1 })
    })
  })

  describe('edge cases', () => {
    it('UC-SWAP-011 nets a refund of the sold asset inside the same swap', () => {
      const overview = overviewOf({
        history: [
          transfer('0xrefund', 'out', '1000', 'USDC'),
          transfer('0xrefund', 'in', '20', 'USDC'),
          transfer('0xrefund', 'in', '0.49', 'WETH')
        ],
        held: [[WETH, 2400]]
      })

      expect(overview).toMatchObject({ count: 1, swappedUsd: 980, currentUsd: 1176 })
      expect(overview.pnlUsd).toBeCloseTo(196)
    })

    it('UC-SWAP-012 names the asset whose price cannot be found', () => {
      const overview = overviewOf({ history: buyWeth() })

      expect(overview).toMatchObject({ swappedUsd: 1000, currentUsd: 0, missingPrices: ['WETH'] })
    })

    it('UC-SWAP-013 finds no swap in a history of deposits and payments only', () => {
      const away = { counterparty: OUTSIDE }
      const overview = overviewOf({
        history: [
          transfer('0xdeposit', 'in', '5000', 'USDC', away),
          transfer('0xpayment', 'out', '700', 'USDC', away),
          transfer('0xreturn', 'out', '100', 'USDC', away),
          transfer('0xreturn', 'in', '10', 'USDC', away)
        ]
      })

      expect(overview).toMatchObject({ count: 0, swappedUsd: 0, feesUsd: null, pnlRatio: null })
    })
  })
})
