import { describe, expect, it } from 'vitest'
import { NETWORK } from '@/constant'
import type { SafeIncomingTransfer } from '@/types/safe'
import { SAFE_NATIVE_ASSET, computeSafeSwapPnl, toSafeSwaps, type SafeSwap } from '../swapPnl'

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

const swap = (overrides: Partial<SafeSwap> = {}): SafeSwap => ({
  txHash: '0xswap',
  date: '2026-06-01',
  given: [{ asset: USDC, symbol: 'USDC', decimals: 6, quantity: 1000 }],
  received: [{ asset: WETH, symbol: 'WETH', decimals: 18, quantity: 0.5 }],
  ...overrides
})
const prices = (now: number | undefined) => ({
  on: (asset: string) => (asset === USDC ? 1 : undefined),
  now: (asset: string) => (asset === WETH ? now : 1)
})

describe('[US-SAFE-007] toSafeSwaps', () => {
  it('[AC-US-SAFE-007-02] keeps only transactions in which the Safe sends and receives different assets', () => {
    const swaps = toSafeSwaps(
      [
        erc20(usdc, '1000000000', sell),
        erc20(weth, '500000000000000000'),
        erc20(usdc, '50000000', { transactionHash: '0xdeposit', blockNumber: 4 }),
        erc20(usdc, '20000000', { ...sell, transactionHash: '0xpayment', blockNumber: 12 }),
        erc20(weth, '1', { type: 'ERC721_TRANSFER', transactionHash: '0xnft', ...sell }),
        erc20(usdc, '5', { transactionHash: '0xself', from: SAFE })
      ],
      SAFE
    )

    expect(swaps).toEqual([
      {
        txHash: '0xswap',
        date: '2026-06-01',
        given: [{ asset: USDC, symbol: 'USDC', decimals: 6, quantity: 1000 }],
        received: [{ asset: WETH, symbol: 'WETH', decimals: 18, quantity: 0.5 }]
      }
    ])
  })

  it('nets a refund of the sold asset inside the same swap', () => {
    const [found] = toSafeSwaps(
      [erc20(usdc, '1000000000', sell), erc20(usdc, '10000000'), erc20(weth, '500000000000000000')],
      SAFE
    )

    expect(found!.given[0]!.quantity).toBe(990)
  })

  it('reads a native leg with the network symbol and orders swaps by block', () => {
    const swaps = toSafeSwaps(
      [
        erc20(usdc, '1000000', { ...sell, transactionHash: '0xlater', blockNumber: 20 }),
        erc20(weth, '1000000000000000', { transactionHash: '0xlater', blockNumber: 20 }),
        erc20(usdc, '2000000', sell),
        {
          ...erc20(usdc, '3000000000000000000'),
          type: 'ETHER_TRANSFER',
          tokenAddress: null,
          tokenInfo: undefined
        }
      ],
      SAFE
    )

    expect(swaps.map(({ txHash }) => txHash)).toEqual(['0xswap', '0xlater'])
    expect(swaps[0]!.received[0]).toMatchObject({
      asset: SAFE_NATIVE_ASSET,
      symbol: NETWORK.currencySymbol,
      quantity: 3
    })
  })
})

describe('[US-SAFE-007] computeSafeSwapPnl', () => {
  it('[AC-US-SAFE-007-05] reports a gain when the assets received are worth more than what was given up', () => {
    const pnl = computeSafeSwapPnl([swap()], prices(2400), () => undefined)

    expect(pnl).toMatchObject({ count: 1, swappedUsd: 1000, currentUsd: 1200, pnlUsd: 200 })
    expect(pnl.pnlRatio).toBeCloseTo(0.2)
  })

  it('[AC-US-SAFE-007-05] reports a loss when the assets received lost value', () => {
    const pnl = computeSafeSwapPnl([swap()], prices(1800), () => undefined)

    expect(pnl).toMatchObject({ currentUsd: 900, pnlUsd: -100 })
  })

  it('[AC-US-SAFE-007-07] adds the reported fees in USD and counts the swaps that report one', () => {
    const fee = { asset: USDC, symbol: 'USDC', quantity: 3.5 }
    const pnl = computeSafeSwapPnl([swap(), swap({ txHash: '0xother' })], prices(2000), (found) =>
      found.txHash === '0xswap' ? fee : undefined
    )

    expect(pnl).toMatchObject({ feesUsd: 3.5, feesReported: 1, count: 2 })
    expect(computeSafeSwapPnl([swap()], prices(2000), () => undefined).feesUsd).toBeNull()
  })

  it('[AC-US-SAFE-007-08] names the assets that cannot be priced', () => {
    const pnl = computeSafeSwapPnl([swap()], prices(undefined), () => undefined)

    expect(pnl.missingPrices).toEqual(['WETH'])
    expect(computeSafeSwapPnl([], prices(1), () => undefined).pnlRatio).toBeNull()
  })
})
