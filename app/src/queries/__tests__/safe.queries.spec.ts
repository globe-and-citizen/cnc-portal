import { describe, expect, it } from 'vitest'
import { contractBalanceKeys } from '@/composables/useContractBalance'
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

  it('builds the balance key the contract-balance query owns', () => {
    // Native and ERC-20 holdings share one key, so there is no separate
    // per-token key to invalidate.
    expect(safeKeys.balance('0xSafe', 137)).toEqual(contractBalanceKeys.detail('0xSafe', 137))
    expect(safeKeys.balance('0xSafe', 137)).toEqual([
      'balance',
      { address: '0xSafe', chainId: 137 }
    ])
  })
})
