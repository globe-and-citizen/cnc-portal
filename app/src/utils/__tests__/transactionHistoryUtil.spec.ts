import { describe, expect, it } from 'vitest'
import {
  getTokenAddress,
  getTokenDecimals,
  isValidPositiveTokenAmount,
  resolveTokenIdByAddress
} from '../constantUtil'
import { groupTransactionsByTxHash } from '../transactionHistoryUtil'

type TransactionFixture = {
  txHash: string
  type: string
  timestamp: number
}

describe('transactionHistoryUtil', () => {
  it('groups rows by tx hash and keeps first-seen parent order', () => {
    const grouped = groupTransactionsByTxHash<TransactionFixture>([
      { txHash: '0xaaa', type: 'deposit', timestamp: 300 },
      { txHash: '0xbbb', type: 'transfer', timestamp: 200 },
      { txHash: '0xaaa', type: 'tokenDeposit', timestamp: 290 }
    ])

    expect(grouped).toHaveLength(2)
    expect(grouped[0]?.txHash).toBe('0xaaa')
    expect(grouped[1]?.txHash).toBe('0xbbb')

    expect(grouped[0]?.groupedEventCount).toBe(2)
    expect(grouped[0]?.subRows).toHaveLength(1)
    expect(grouped[0]?.subRows[0]).toMatchObject({
      txHash: '0xaaa',
      type: 'tokenDeposit',
      groupedEventCount: 1
    })
  })

  it('returns empty subRows for a tx hash without children', () => {
    const grouped = groupTransactionsByTxHash<TransactionFixture>([
      { txHash: '0xsingle', type: 'transfer', timestamp: 100 }
    ])

    expect(grouped).toHaveLength(1)
    expect(grouped[0]?.groupedEventCount).toBe(1)
    expect(grouped[0]?.subRows).toEqual([])
  })

  it('resolves known token IDs by address (case-insensitive)', () => {
    const usdcAddress = getTokenAddress('usdc')
    expect(usdcAddress).toBeDefined()
    if (!usdcAddress) return

    expect(resolveTokenIdByAddress(usdcAddress.toUpperCase())).toBe('usdc')
  })

  it('returns null for unknown token addresses', () => {
    expect(resolveTokenIdByAddress('0x1111111111111111111111111111111111111111')).toBe(null)
  })

  it('returns token decimals from shared registry', () => {
    expect(getTokenDecimals('native')).toBe(18)
    expect(getTokenDecimals('usdc')).toBe(6)
    expect(getTokenDecimals('usdc.e')).toBe(6)
    expect(getTokenDecimals('usdt')).toBe(6)
    expect(getTokenDecimals('sher')).toBe(6)
  })

  it('validates positive token amounts using token decimals', () => {
    expect(isValidPositiveTokenAmount('1', 'native')).toBe(true)
    expect(isValidPositiveTokenAmount('0.000001', 'usdc')).toBe(true)

    expect(isValidPositiveTokenAmount('0', 'native')).toBe(false)
    expect(isValidPositiveTokenAmount('1e3', 'native')).toBe(false)
    expect(isValidPositiveTokenAmount('abc', 'native')).toBe(false)
    expect(isValidPositiveTokenAmount('0.0000001', 'usdc')).toBe(false)
  })
})
