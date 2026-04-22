import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useERC20Approve } from '../writes'
import { mockERC20Writes, resetERC20Mocks } from '@/tests/mocks'
import type { Address } from 'viem'

const MOCK_DATA = {
  contractAddress: '0x1234567890123456789012345678901234567890' as Address,
  spender: '0x9876543210987654321098765432109876543210' as Address,
  amount: 1000000000000000000n
} as const

describe('ERC20 Contract Writes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetERC20Mocks()
  })

  it('useERC20Approve returns the approve V3 mutation', () => {
    const result = useERC20Approve(MOCK_DATA.contractAddress)
    expect(result).toBe(mockERC20Writes.approve)
    expect(result.mutateAsync).toBeInstanceOf(Function)
    expect(result).toHaveProperty('isPending')
    expect(result).toHaveProperty('error')
  })

  it('forwards mutateAsync success and errors from the mock', async () => {
    const result = useERC20Approve(MOCK_DATA.contractAddress)

    mockERC20Writes.approve.mutateAsync.mockResolvedValueOnce({ hash: '0xapproved' })
    await expect(
      result.mutateAsync({ args: [MOCK_DATA.spender, MOCK_DATA.amount] })
    ).resolves.toEqual({ hash: '0xapproved' })

    mockERC20Writes.approve.mutateAsync.mockRejectedValueOnce(new Error('Approve failed'))
    await expect(
      result.mutateAsync({ args: [MOCK_DATA.spender, MOCK_DATA.amount] })
    ).rejects.toThrow('Approve failed')
  })
})
