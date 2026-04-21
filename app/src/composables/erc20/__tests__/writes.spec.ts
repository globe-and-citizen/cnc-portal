import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useERC20ContractWrite, useERC20Approve } from '../writes'
import { mockERC20Writes, resetERC20Mocks } from '@/tests/mocks'
import type { Address } from 'viem'

const MOCK_DATA = {
  contractAddress: '0x1234567890123456789012345678901234567890' as Address,
  spender: '0x9876543210987654321098765432109876543210' as Address,
  amount: BigInt('1000000000000000000')
} as const

describe('ERC20 Contract Writes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetERC20Mocks()
  })

  it('useERC20ContractWrite exposes the V2 write interface', () => {
    const result = useERC20ContractWrite({
      contractAddress: MOCK_DATA.contractAddress,
      functionName: 'approve'
    })
    expect(result).toHaveProperty('executeWrite')
    expect(result).toHaveProperty('writeResult')
    expect(result).toHaveProperty('receiptResult')
    expect(result.executeWrite).toBeInstanceOf(Function)
  })

  it('useERC20Approve returns the approve mock and forwards errors', async () => {
    const result = useERC20Approve(MOCK_DATA.contractAddress, MOCK_DATA.spender, MOCK_DATA.amount)
    expect(result).toBe(mockERC20Writes.approve)

    mockERC20Writes.approve.executeWrite.mockResolvedValueOnce('0xhash')
    await expect(result.executeWrite()).resolves.toBe('0xhash')

    mockERC20Writes.approve.executeWrite.mockRejectedValueOnce(new Error('Approve failed'))
    await expect(result.executeWrite()).rejects.toThrow('Approve failed')
  })
})

// UNUSED composables — tests commented out along with the composables:
//   useERC20Transfer, useERC20TransferFrom. See ../writes.ts.
