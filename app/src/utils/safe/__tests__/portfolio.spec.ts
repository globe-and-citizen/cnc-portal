import { describe, expect, it } from 'vitest'
import { currentChainId, SUPPORTED_TOKENS } from '@/constant'
import { makeTokenBalance } from '@/tests/mocks/composables.mock'
import { assetMetadata } from '@/utils/tokens/assets'
import { safePortfolioRows, type SafePortfolioAsset } from '../portfolio'

const token = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const heldAsset = (address = token, chainId = currentChainId): SafePortfolioAsset => ({
  asset: assetMetadata(address, chainId, {
    address,
    name: 'Wrapped Ether',
    symbol: 'WETH',
    decimals: 18
  }),
  raw: 11371464599721321n,
  quantity: '0.011371464599721321',
  priceUsd: 2000,
  valueUsd: 22.742929199442642
})

describe('Safe holdings presentation', () => {
  it('keeps supported currencies first with exact raw quantities and USD valuations', () => {
    const balances = SUPPORTED_TOKENS.map((token) =>
      makeTokenBalance({ token, raw: 1n, usdPrice: 1 })
    )
    const rows = safePortfolioRows([heldAsset()], {
      balances,
      total: { usd: { value: 0, formatted: '$0' }, local: { value: 0, formatted: '$0' } }
    })
    expect(rows.map((row) => row.symbol)).toEqual([
      ...SUPPORTED_TOKENS.map((token) => token.symbol),
      'WETH'
    ])
    expect(rows[0].quantity).toBe('0.000001')
    expect(rows[2].quantity).toBe('0.000000000000000001')
    expect(rows[3]).toMatchObject({
      quantity: '0.011371464599721321',
      price: '$2,000.000000',
      value: '$22.74'
    })
  })

  it('deduplicates by network and contract while keeping identically named assets distinct', () => {
    const weth = heldAsset()
    const rows = safePortfolioRows([
      weth,
      heldAsset(token.toUpperCase().replace('0X', '0x')),
      heldAsset('0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'),
      heldAsset(token, currentChainId === 1 ? 137 : 1),
      heldAsset(SUPPORTED_TOKENS[0]!.address)
    ])
    expect(rows).toHaveLength(6)
    expect(new Set(rows.map((row) => row.id)).size).toBe(6)
    expect(rows.filter((row) => row.symbol === 'WETH')).toHaveLength(3)
  })

  it('hides zero discovered balances but retains failed balance reads without inventing zero', () => {
    const unknown = { ...heldAsset(), raw: null, quantity: null, priceUsd: null, valueUsd: null }
    const rows = safePortfolioRows([
      unknown,
      {
        ...heldAsset('0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'),
        raw: 0n,
        quantity: '0',
        valueUsd: 0
      }
    ])
    expect(rows).toHaveLength(4)
    expect(rows[3]).toMatchObject({
      quantity: 'Balance unavailable',
      price: 'Price unavailable',
      value: 'Value unavailable'
    })
  })
})
