import { describe, expect, it } from 'vitest'
import { zeroAddress } from 'viem'
import {
  getTokenAddress,
  isSupportedTokenId,
  isValidPositiveTokenAmount,
  resolveTokenIdByAddress,
  tokenSymbol
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

  it('resolves token symbol using supported tokens as source of truth', () => {
    const usdcAddress = getTokenAddress('usdc')
    const usdceAddress = getTokenAddress('usdc.e')
    expect(usdcAddress).toBeDefined()
    expect(usdceAddress).toBeDefined()
    if (!usdcAddress || !usdceAddress) return

    expect(tokenSymbol(usdcAddress)).toBe('USDC')
    expect(tokenSymbol(usdceAddress)).toBe('USDC.e')
    expect(tokenSymbol(zeroAddress)).not.toBe('')
    expect(tokenSymbol('0x1111111111111111111111111111111111111111')).toBe('')
  })
})
