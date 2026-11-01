import { describe, expect, it } from 'vitest'
import type { SafeIncomingTransfer } from '@/types/safe'
import { computeSafeSwapPnl } from '../swapPnl'

const SAFE = '0x5AFE00000000000000000000000000000000cafe'
const SETTLEMENT = '0x9008d19f58aabd9ed0d60971565aa8510560ab41'
const USDC = '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359'
const WETH = '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619'

const erc20 = (
  token: { address: string; symbol: string; decimals: number },
  value: string,
  overrides: Partial<SafeIncomingTransfer> = {}
): SafeIncomingTransfer => ({
  type: 'ERC20_TRANSFER',
  executionDate: '2026-06-01T23:30:00Z',
  blockNumber: 10,
  transactionHash: '0xswap',
  from: SETTLEMENT,
  to: SAFE.toLowerCase(),
  value,
  tokenAddress: token.address,
  tokenInfo: { type: 'ERC20', name: token.symbol, ...token },
  ...overrides
})
const usdc = { address: USDC, symbol: 'USDC', decimals: 6 }
const weth = { address: WETH, symbol: 'WETH', decimals: 18 }
const sell = { from: SAFE, to: SETTLEMENT }

const swap = (txHash = '0xswap'): SafeIncomingTransfer[] => [
  erc20(usdc, '1000000000', { ...sell, transactionHash: txHash }),
  erc20(weth, '500000000000000000', { transactionHash: txHash })
]
const prices = (now: number | undefined) => ({
  on: (asset: string) => (asset === USDC ? 1 : undefined),
  now: (asset: string) => (asset === WETH ? now : 1)
})

describe('[US-SAFE-007] computeSafeSwapPnl', () => {
  it('nets a refund before valuing the assets given up', () => {
    const pnl = computeSafeSwapPnl(
      [...swap(), erc20(usdc, '10000000')],
      SAFE,
      prices(2400),
      () => undefined
    )
    expect(pnl).toMatchObject({ count: 1, swappedUsd: 990, currentUsd: 1200, pnlUsd: 210 })
  })

  it('does not count a transaction whose outgoing asset was fully refunded', () => {
    const pnl = computeSafeSwapPnl(
      [...swap(), erc20(usdc, '1000000000')],
      SAFE,
      prices(2400),
      () => undefined
    )
    expect(pnl).toMatchObject({ count: 0, swappedUsd: 0, currentUsd: 0 })
  })

  it('nets large raw quantities exactly before converting the remaining amount', () => {
    const pnl = computeSafeSwapPnl(
      [
        erc20(usdc, '9007199254740993000001', sell),
        erc20(usdc, '9007199254740993000000'),
        erc20(weth, '500000000000000000')
      ],
      SAFE,
      prices(2400),
      () => undefined
    )
    expect(pnl.swappedUsd).toBe(0.000001)
  })

  it('values interleaved swaps independently and nets a mixed-case token refund', () => {
    const first = swap('0xfirst')
    const second = swap('0xsecond')
    const refund = erc20(usdc, '10000000', {
      transactionHash: '0xfirst',
      tokenAddress: USDC.toUpperCase()
    })
    const pnl = computeSafeSwapPnl(
      [first[0]!, second[0]!, first[1]!, refund, second[1]!],
      SAFE,
      prices(2400),
      () => undefined
    )

    expect(pnl).toMatchObject({ count: 2, swappedUsd: 1990, currentUsd: 2400, pnlUsd: 410 })
    expect(pnl.swaps).toEqual([
      { txHash: '0xfirst', pnlUsd: 210 },
      { txHash: '0xsecond', pnlUsd: 200 }
    ])
  })

  it('reports a gain when the assets received are worth more than what was given up', () => {
    const pnl = computeSafeSwapPnl(swap(), SAFE, prices(2400), () => undefined)

    expect(pnl).toMatchObject({ count: 1, swappedUsd: 1000, currentUsd: 1200, pnlUsd: 200 })
    expect(pnl.pnlRatio).toBeCloseTo(0.2)
  })

  it('reports a loss when the assets received lost value', () => {
    const pnl = computeSafeSwapPnl(swap(), SAFE, prices(1800), () => undefined)

    expect(pnl).toMatchObject({ currentUsd: 900, pnlUsd: -100 })
  })

  it('[AC-US-SAFE-007-07] adds the reported fees in USD and counts the swaps that report one', () => {
    const fee = { asset: USDC, symbol: 'USDC', quantity: 3.5 }
    const pnl = computeSafeSwapPnl([...swap(), ...swap('0xother')], SAFE, prices(2000), (found) =>
      found[0]!.transactionHash === '0xswap' ? fee : undefined
    )

    expect(pnl).toMatchObject({ feesUsd: 3.5, feesReported: 1, count: 2 })
    expect(computeSafeSwapPnl(swap(), SAFE, prices(2000), () => undefined).feesUsd).toBeNull()
  })

  it('takes a reported fee out of the swapped value so the P&L excludes it', () => {
    const fee = { asset: USDC, symbol: 'USDC', quantity: 3.5 }
    const pnl = computeSafeSwapPnl([...swap(), ...swap('0xother')], SAFE, prices(2400), (found) =>
      found[0]!.transactionHash === '0xswap' ? fee : undefined
    )

    expect(pnl).toMatchObject({ swappedUsd: 1996.5, currentUsd: 2400, pnlUsd: 403.5, feesUsd: 3.5 })
  })

  it('reports the P&L of each swap, fee excluded, adding up to the total', () => {
    const fee = { asset: USDC, symbol: 'USDC', quantity: 3.5 }
    const pnl = computeSafeSwapPnl([...swap(), ...swap('0xother')], SAFE, prices(2400), (found) =>
      found[0]!.transactionHash === '0xswap' ? fee : undefined
    )

    expect(pnl.swaps).toEqual([
      { txHash: '0xswap', pnlUsd: 203.5 },
      { txHash: '0xother', pnlUsd: 200 }
    ])
    expect(pnl.swaps.reduce((sum, swap) => sum + swap.pnlUsd, 0)).toBe(pnl.pnlUsd)
  })

  it('names the assets that cannot be priced', () => {
    const pnl = computeSafeSwapPnl(swap(), SAFE, prices(undefined), () => undefined)

    expect(pnl.missingPrices).toEqual(['WETH'])
    expect(computeSafeSwapPnl([], SAFE, prices(1), () => undefined).pnlRatio).toBeNull()
  })
})
