import { describe, expect, it } from 'vitest'
import { zeroAddress } from 'viem'
import { SUPPORTED_TOKENS } from '@/constant'
import type { SafeClientBalance, SafeClientBalances } from '@/types/safe'
import { getSafeFiatTotal, toSafeHoldingRows, toSafeTransferTokens } from '../portfolio'

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
    const rows = toSafeHoldingRows(data)
    expect(rows).toHaveLength(2)
    expect(rows.map((row) => row.token.symbol)).toEqual(['WETH', 'Provider USDC'])
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
    const rows = toSafeHoldingRows(response([heldAsset()]))
    expect(rows.map((row) => row.token.symbol)).toEqual(['WETH'])
    expect(rows[0]).toMatchObject({
      quantity: '0.011371464599721321',
      amountLabel: '0.0114',
      price: 2000,
      priceLabel: '$2K',
      balanceLabel: '$22.74',
      icon: 'https://assets.example/weth.png'
    })
    expect(getSafeFiatTotal(response([heldAsset()]))).toBe(22.742929199442642)
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
    const row = toSafeHoldingRows(response([native])).find((item) => item.address === null)
    expect(row).toMatchObject({ quantity: '0.000000000000000001', amountLabel: '<0.0001' })
  })

  it('maps each returned item without regrouping contracts or recalculating the provider total', () => {
    const second = heldAsset({
      tokenInfo: { ...heldAsset().tokenInfo, address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' }
    })
    const duplicate = heldAsset({
      tokenInfo: { ...heldAsset().tokenInfo, address: token.toUpperCase().replace('0X', '0x') }
    })
    const data = response([heldAsset(), duplicate, second], '68.23')
    expect(toSafeHoldingRows(data).map((row) => row.address)).toEqual([
      token,
      duplicate.tokenInfo.address,
      second.tokenInfo.address
    ])
    expect(getSafeFiatTotal(data)).toBe(68.23)
  })

  it.each([null, '0', '', 'NaN', '-1'])(
    'keeps an unavailable market price %s explicit despite a zero fallback from Safe',
    (price) => {
      const data = response([heldAsset({ fiatConversion: price, fiatBalance: '0' })], '0')
      expect(toSafeHoldingRows(data)[0]).toMatchObject({
        quantity: '0.011371464599721321',
        priceLabel: 'Price unavailable',
        balanceLabel: 'Value unavailable'
      })
      expect(getSafeFiatTotal(data)).toBeUndefined()
    }
  )

  it('distinguishes a missing response and unreadable amount from confirmed zero holdings', () => {
    expect(toSafeHoldingRows()).toEqual([])
    expect(toSafeHoldingRows(response([], '0'))).toEqual([])
    expect(getSafeFiatTotal(undefined)).toBeUndefined()
    expect(getSafeFiatTotal(response([], '0'))).toBe(0)
    const data = response([heldAsset({ balance: null })])
    expect(toSafeHoldingRows(data)[0]?.amountLabel).toBe('Balance unavailable')
    expect(getSafeFiatTotal(data)).toBeUndefined()
    expect(
      toSafeHoldingRows(response([heldAsset({ balance: '0', fiatConversion: null })], '0'))
    ).toHaveLength(1)
  })

  it('uses the requested fiat prices directly without calculating an exchange rate from another token', () => {
    const rows = toSafeHoldingRows(
      response([heldAsset({ fiatConversion: '1800', fiatBalance: '20.468636279498378' })]),
      'EUR'
    )
    expect(rows[0]).toMatchObject({ price: 1800, priceLabel: '€1.8K', balanceLabel: '€20.47' })
  })

  it('keeps provider-returned contracts without a local blacklist or response mutation', () => {
    const returned = heldAsset({
      tokenInfo: { ...heldAsset().tokenInfo, address: '0x0ce89273aadcb0f297a32d957cbd459ed06848ea' }
    })
    const data = response([returned, heldAsset()], '9999')
    const before = structuredClone(data)
    expect(toSafeHoldingRows(data).some((row) => row.address === returned.tokenInfo.address)).toBe(
      true
    )
    expect(getSafeFiatTotal(data)).toBe(9999)
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
    const tokens = toSafeTransferTokens(data)
    expect(tokens.map((item) => item.tokenId)).toEqual(SUPPORTED_TOKENS.map((item) => item.id))
    expect(tokens[0]).toMatchObject({ symbol: supported.symbol, balance: 1.234567 })
    expect(toSafeTransferTokens(undefined)).toEqual([])
    expect(toSafeHoldingRows(data)[1]?.token.symbol).toBe('Spoofed symbol')
  })
})
