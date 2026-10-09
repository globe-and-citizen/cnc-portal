import { describe, expect, it } from 'vitest'
import { zeroAddress } from 'viem'
import { currentChainId, SUPPORTED_TOKENS } from '@/constant'
import type { SafeClientBalance, SafeClientBalances } from '@/types/safe'
import { safeBalancesTotal, safePortfolioRows, safeTransferTokens } from '../portfolio'

const token = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const heldAsset = (overrides: Partial<SafeClientBalance> = {}): SafeClientBalance => ({
  tokenInfo: {
    type: 'ERC20',
    address: token,
    decimals: 18,
    symbol: 'WETH',
    name: 'Wrapped Ether',
    logoUri: 'https://assets.example/weth.png'
  },
  balance: '11371464599721321',
  fiatConversion: '2000',
  fiatBalance: '22.742929199442642',
  ...overrides
})
const response = (
  items: SafeClientBalance[],
  fiatTotal = '22.742929199442642'
): SafeClientBalances => ({ items, fiatTotal })

describe('Safe Gateway holdings presentation', () => {
  it('preserves response order, metadata and returned zero balances without inserting configured tokens', () => {
    const usdc = SUPPORTED_TOKENS[0]!
    const returned = heldAsset({
      tokenInfo: {
        type: 'ERC20',
        address: usdc.address,
        decimals: 6,
        symbol: 'Provider USDC',
        name: 'Provider token name',
        logoUri: 'https://assets.example/provider-usdc.png'
      },
      balance: '0',
      fiatConversion: '1',
      fiatBalance: '0'
    })
    const data = response([heldAsset(), returned])
    const before = structuredClone(data)
    const rows = safePortfolioRows(data)
    expect(rows).toHaveLength(2)
    expect(rows.map((row) => row.symbol)).toEqual(['WETH', 'Provider USDC'])
    expect(rows[1]).toMatchObject({
      name: 'Provider token name',
      icon: 'https://assets.example/provider-usdc.png',
      quantity: '0',
      balance: 0,
      rank: 2
    })
    expect(data).toEqual(before)
  })
  it('renders only the returned holding with exact quantity and provider valuation', () => {
    const rows = safePortfolioRows(response([heldAsset()]))
    expect(rows.map((row) => row.symbol)).toEqual(['WETH'])
    expect(rows[0]).toMatchObject({
      quantity: '0.011371464599721321',
      amountLabel: '0.0114',
      price: 2000,
      priceLabel: '$2K',
      balanceLabel: '$22.74',
      icon: 'https://assets.example/weth.png'
    })
    expect(safeBalancesTotal(response([heldAsset()]))).toBe(22.742929199442642)
  })

  it('preserves native base-unit precision and labels a dust quantity without showing zero', () => {
    const native = heldAsset({
      tokenInfo: {
        type: 'NATIVE_TOKEN',
        address: zeroAddress,
        decimals: 18,
        symbol: 'POL',
        name: 'Polygon'
      },
      balance: '1',
      fiatConversion: '0.2',
      fiatBalance: '0.0000000000000000002'
    })
    const row = safePortfolioRows(response([native])).find((item) => item.address === null)
    expect(row).toMatchObject({ quantity: '0.000000000000000001', amountLabel: '<0.0001' })
  })

  it('keeps identically named contracts distinct and deduplicates case variants', () => {
    const second = heldAsset({
      tokenInfo: { ...heldAsset().tokenInfo, address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' }
    })
    const duplicate = heldAsset({
      tokenInfo: { ...heldAsset().tokenInfo, address: token.toUpperCase().replace('0X', '0x') }
    })
    expect(safePortfolioRows(response([heldAsset(), duplicate, second]))).toHaveLength(2)
    expect(safeBalancesTotal(response([heldAsset(), duplicate, second]))).toBeCloseTo(
      45.485858398885284
    )
  })

  it.each([null, '0', '', 'NaN', '-1'])(
    'keeps an unavailable market price %s explicit despite a zero fallback from Safe',
    (price) => {
      const data = response([heldAsset({ fiatConversion: price, fiatBalance: '0' })], '0')
      expect(safePortfolioRows(data)[0]).toMatchObject({
        quantity: '0.011371464599721321',
        priceLabel: 'Price unavailable',
        balanceLabel: 'Value unavailable'
      })
      expect(safeBalancesTotal(data)).toBeUndefined()
    }
  )

  it('distinguishes a missing response and unreadable amount from confirmed zero holdings', () => {
    expect(safePortfolioRows()).toEqual([])
    expect(safePortfolioRows(response([], '0'))).toEqual([])
    expect(safeBalancesTotal(undefined)).toBeUndefined()
    expect(safeBalancesTotal(response([], '0'))).toBe(0)
    const data = response([heldAsset({ balance: null })])
    expect(safePortfolioRows(data)[0]?.amountLabel).toBe('Balance unavailable')
    expect(safeBalancesTotal(data)).toBeUndefined()
    expect(
      safePortfolioRows(response([heldAsset({ balance: '0', fiatConversion: null })], '0'))
    ).toHaveLength(1)
  })

  it('uses the requested fiat prices directly without calculating an exchange rate from another token', () => {
    const rows = safePortfolioRows(
      response([heldAsset({ fiatConversion: '1800', fiatBalance: '20.468636279498378' })]),
      'EUR'
    )
    expect(rows[0]).toMatchObject({ price: 1800, priceLabel: '€1.8K', balanceLabel: '€20.47' })
  })

  it('excludes a confirmed counterfeit by chain and contract without mutating the raw response or trusting fiatTotal', () => {
    const spam = heldAsset({
      tokenInfo: { ...heldAsset().tokenInfo, address: '0x0ce89273aadcb0f297a32d957cbd459ed06848ea' }
    })
    const data = response([spam, heldAsset()], '9999')
    const before = structuredClone(data)
    expect(
      safePortfolioRows(data, 'USD', 137).some((row) => row.address === spam.tokenInfo.address)
    ).toBe(false)
    expect(safeBalancesTotal(data, 137)).toBe(22.742929199442642)
    expect(
      safePortfolioRows(data, 'USD', 1).some((row) => row.address === spam.tokenInfo.address)
    ).toBe(true)
    expect(data).toEqual(before)
  })

  it('matches supported assets by contract and never enables a discovered token for CNC transfers', () => {
    const supported = SUPPORTED_TOKENS[0]!
    const data = response([
      heldAsset(),
      heldAsset({
        tokenInfo: {
          ...heldAsset().tokenInfo,
          address: supported.address,
          decimals: supported.decimals,
          symbol: 'Spoofed symbol'
        },
        balance: '1234567'
      })
    ])
    const tokens = safeTransferTokens(data)
    expect(tokens.map((item) => item.tokenId)).toEqual(SUPPORTED_TOKENS.map((item) => item.id))
    expect(tokens[0]).toMatchObject({ symbol: supported.symbol, balance: 1.234567 })
    expect(safeTransferTokens(undefined)).toEqual([])
    expect(safePortfolioRows(data, 'USD', currentChainId)[1]?.symbol).toBe('Spoofed symbol')
  })
})
