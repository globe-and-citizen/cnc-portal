import { describe, expect, it } from 'vitest'
import { zeroAddress } from 'viem'
import {
  getTokenAddress,
  isSupportedTokenId,
  isValidPositiveTokenAmount,
  resolveTokenIdByAddress
} from '../constantUtil'

describe('constantUtil', () => {
  it('recognizes supported token ids', () => {
    expect(isSupportedTokenId('native')).toBe(true)
    expect(isSupportedTokenId('usdc')).toBe(true)
    expect(isSupportedTokenId('unknown-token')).toBe(false)
  })

  it('validates positive amounts with the default native token decimals', () => {
    expect(isValidPositiveTokenAmount(' 1 ')).toBe(true)
    expect(isValidPositiveTokenAmount('')).toBe(false)
    expect(isValidPositiveTokenAmount('1e3')).toBe(false)
  })

  it('resolves known token ids from addresses, including the native zero address', () => {
    expect(resolveTokenIdByAddress(zeroAddress)).toBe('native')

    const usdtAddress = getTokenAddress('usdt')
    expect(usdtAddress).toBeDefined()
    if (!usdtAddress) return

    expect(resolveTokenIdByAddress(usdtAddress.toUpperCase())).toBe('usdt')
  })
})
