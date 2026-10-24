import { describe, expect, it } from 'vitest'
import { isAcceptedAsset, swappedAssets } from '../assetRecognition'

const AIRDROP = 'erc20:137:0x7525a2c3e099f451830e31684736bb1b92c16d34' as const
const WETH = 'erc20:137:0x7ceb23fd6bc0add59e62ac25578270cff1b9f619' as const

describe('asset acceptance', () => {
  it.each(['native', 'usdc', 'usdt', 'sher'] as const)('always accepts the %s asset', (token) => {
    expect(isAcceptedAsset(token, new Set())).toBe(true)
  })

  it('accepts another contract only when the Safe acquired it through a swap', () => {
    const swapped = swappedAssets([
      { useCase: 'SAFE-SWAP', token: 'usdc' },
      { useCase: 'SAFE-SWAP', token: WETH },
      { useCase: 'UC-BANK-02', token: AIRDROP }
    ])
    expect(swapped).toEqual(new Set(['usdc', WETH]))
    expect(isAcceptedAsset(WETH, swapped)).toBe(true)
    expect(isAcceptedAsset(AIRDROP, swapped)).toBe(false)
  })
})
