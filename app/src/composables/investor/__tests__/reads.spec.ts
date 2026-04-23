import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  useInvestorAddress,
  useInvestorName,
  useInvestorSymbol,
  useInvestorTotalSupply,
  useInvestorOwner,
  useInvestorBalanceOf,
  useInvestorShareholders
} from '../reads'
import { mockInvestorReads, resetContractMocks } from '@/tests/mocks'
import type { Address } from 'viem'

const MOCK_DATA = {
  ownerAddress: '0x742d35Cc6bF8C55C6C2e013e5492D2b6637e0886' as Address,
  shareholderAddress: '0xA0b86a33E6441bB7bE6d0B9EB5Bbf26b2d60C1cd' as Address,
  totalSupply: 1000000n * 10n ** 18n,
  shareholderBalance: 50000n * 10n ** 18n
} as const

describe('Investor Contract Reads', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetContractMocks()
  })

  it('useInvestorAddress returns a ref-like value', () => {
    const result = useInvestorAddress()
    expect(typeof result.value).toBe('string')
  })

  it('useInvestorName returns the name mock', () => {
    expect(useInvestorName()).toBe(mockInvestorReads.name)
  })

  it('useInvestorSymbol returns the symbol mock', () => {
    expect(useInvestorSymbol()).toBe(mockInvestorReads.symbol)
  })

  it('useInvestorTotalSupply returns the totalSupply mock', () => {
    mockInvestorReads.totalSupply.data.value = MOCK_DATA.totalSupply
    expect(useInvestorTotalSupply().data.value).toBe(MOCK_DATA.totalSupply)
  })

  it('useInvestorOwner returns the owner mock', () => {
    expect(useInvestorOwner()).toBe(mockInvestorReads.owner)
  })

  it('useInvestorBalanceOf returns the balance mock', () => {
    mockInvestorReads.balanceOf.data.value = MOCK_DATA.shareholderBalance
    const result = useInvestorBalanceOf(MOCK_DATA.shareholderAddress)
    expect(result).toBe(mockInvestorReads.balanceOf)
    expect(result.data.value).toBe(MOCK_DATA.shareholderBalance)
  })

  it('useInvestorShareholders returns the shareholders mock', () => {
    mockInvestorReads.shareholders.data.value = [
      MOCK_DATA.ownerAddress,
      MOCK_DATA.shareholderAddress
    ] as never
    const result = useInvestorShareholders()
    expect((result.data.value as Address[]).length).toBe(2)
  })
})

// UNUSED — useInvestorPaused is commented out in ../reads.ts.
