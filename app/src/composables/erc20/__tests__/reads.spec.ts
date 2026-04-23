import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useErc20BalanceOf, useErc20Allowance } from '../reads'
import { mockERC20Reads, resetERC20Mocks } from '@/tests/mocks'
import type { Address } from 'viem'

const MOCK_DATA = {
  validAddress: '0x1234567890123456789012345678901234567890' as Address,
  ownerAddress: '0x742d35Cc6bF8C55C6C2e013e5492D2b6637e0886' as Address,
  spenderAddress: '0x9876543210987654321098765432109876543210' as Address
} as const

describe('ERC20 Contract Reads', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetERC20Mocks()
  })

  it('useErc20BalanceOf returns the balance mock', () => {
    const result = useErc20BalanceOf(MOCK_DATA.validAddress, MOCK_DATA.ownerAddress)
    expect(result).toBe(mockERC20Reads.balanceOf)
    expect(result.data.value).toBe(1000n * 10n ** 18n)
  })

  it('useErc20BalanceOf handles pending state', () => {
    mockERC20Reads.balanceOf.isPending.value = true
    mockERC20Reads.balanceOf.status.value = 'pending'
    const result = useErc20BalanceOf(MOCK_DATA.validAddress, MOCK_DATA.ownerAddress)
    expect(result.isPending.value).toBe(true)
  })

  it('useErc20Allowance returns the allowance mock', () => {
    const result = useErc20Allowance(
      MOCK_DATA.validAddress,
      MOCK_DATA.ownerAddress,
      MOCK_DATA.spenderAddress
    )
    expect(result).toBe(mockERC20Reads.allowance)
    expect(result.data.value).toBe(1000000n * 10n ** 18n)
  })

  it('useErc20Allowance reflects custom amount', () => {
    const custom = 500n * 10n ** 18n
    mockERC20Reads.allowance.data.value = custom
    const result = useErc20Allowance(
      MOCK_DATA.validAddress,
      MOCK_DATA.ownerAddress,
      MOCK_DATA.spenderAddress
    )
    expect(result.data.value).toBe(custom)
  })

  it('resets mocks properly', () => {
    mockERC20Reads.balanceOf.data.value = 999n
    resetERC20Mocks()
    expect(mockERC20Reads.balanceOf.data.value).toBe(1000n * 10n ** 18n)
  })
})

// UNUSED composables — tests commented out alongside them. See ../reads.ts:
//   useErc20Name, useErc20Symbol, useErc20Decimals, useErc20TotalSupply.
