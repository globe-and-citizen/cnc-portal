import { describe, expect, it } from 'vitest'
import { safeKeys } from '../safe.queries'

describe('safeKeys', () => {
  it('builds incoming transfer keys with address and optional limit', () => {
    expect(safeKeys.incomingTransfers('0xSafe', 10)).toEqual([
      'safe',
      'incoming-transfers',
      { safeAddress: '0xSafe', limit: 10 }
    ])

    expect(safeKeys.incomingTransfers('0xSafe')).toEqual([
      'safe',
      'incoming-transfers',
      { safeAddress: '0xSafe', limit: undefined }
    ])
  })

  it('builds native balance and token balance keys', () => {
    expect(safeKeys.balance('0xSafe', 137)).toEqual(['balance', { address: '0xSafe', chainId: 137 }])

    expect(safeKeys.tokenBalance('0xToken', '0xSafe', 137)).toEqual([
      'readContract',
      { address: '0xToken', args: ['0xSafe'], chainId: 137 }
    ])
  })
})
