import { describe, expect, it } from 'vitest'
import type { SafeIncomingTransfer } from '@/types/safe'
import { excludeConfirmedSafeSpam, getConfirmedSafeSpam } from '../confirmedSpam'

const counterfeit = '0x0ce89273aadcb0f297a32d957cbd459ed06848ea'
const earlierCounterfeit = '0x9251cf87c36a02b741ff2127817be4d79eadc05b'
const realUsdc = '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359'
const row = (tokenAddress: string): SafeIncomingTransfer => ({
  type: 'ERC20_TRANSFER',
  transferId: `event-${tokenAddress}`,
  tokenAddress,
  transactionHash: '0xmixed',
  executionDate: '2026-10-08T12:14:23Z',
  blockNumber: 1,
  from: '0x1111111111111111111111111111111111111111',
  to: '0x2222222222222222222222222222222222222222',
  value: '1000000'
})

describe('Confirmed Safe spam', () => {
  it.each([counterfeit, earlierCounterfeit])(
    'excludes the audited Polygon contract %s with evidence',
    (address) => {
      const transfer = row(address.toUpperCase().replace('0X', '0x'))
      expect(getConfirmedSafeSpam(transfer, 137)).toMatchObject({
        reason: expect.stringContaining('Counterfeit USDC'),
        evidence: expect.stringContaining('https://polygonscan.com/tx/'),
        confirmedAt: expect.any(String)
      })
      expect(excludeConfirmedSafeSpam([transfer], 137)).toEqual([])
    }
  )

  it('keeps the same address on other chains', () => {
    const transfer = row(counterfeit)
    expect(getConfirmedSafeSpam(transfer, 31337)).toBeUndefined()
    expect(excludeConfirmedSafeSpam([transfer], 31337)).toEqual([transfer])
  })

  it('retains unknown, metadata-free, untrusted and zero-value assets without heuristics', () => {
    const unknown = row('0x3333333333333333333333333333333333333333')
    const untrusted = {
      ...row(realUsdc),
      value: '0',
      tokenInfo: {
        type: 'ERC20',
        address: realUsdc,
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
        trusted: false
      }
    }
    expect(excludeConfirmedSafeSpam([unknown, untrusted], 137)).toEqual([unknown, untrusted])
  })

  it('preserves every other leg of a mixed transaction and leaves raw evidence unchanged', () => {
    const spam = Object.freeze(row(counterfeit))
    const inflow = Object.freeze(row(realUsdc))
    const outflow = Object.freeze({ ...row(realUsdc), from: inflow.to, to: inflow.from })
    const raw = Object.freeze([spam, inflow, outflow])
    const admitted = excludeConfirmedSafeSpam(raw, 137)
    expect(admitted).toEqual([inflow, outflow])
    expect(admitted[0]).toBe(inflow)
    expect(raw).toEqual([spam, inflow, outflow])
  })

  it('does not classify native or NFT movements by an unrelated token address', () => {
    const native = { ...row(counterfeit), type: 'ETHER_TRANSFER' as const }
    const nft = { ...row(counterfeit), type: 'ERC721_TRANSFER' as const }
    expect(
      excludeConfirmedSafeSpam([native, nft, { ...row(counterfeit), tokenAddress: null }], 137)
    ).toEqual([native, nft, { ...row(counterfeit), tokenAddress: null }])
  })
})
