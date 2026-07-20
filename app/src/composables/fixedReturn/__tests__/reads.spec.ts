import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  useFixedReturnAddress,
  useFixedReturnOwner,
  useFixedReturnVersion,
  useFixedReturnTotalOfferings,
  useFixedReturnGetLendingOffer,
  useFixedReturnGetOfferLenders,
  useFixedReturnTotalEntitlementOf,
  useFixedReturnLenderDeposits,
  useFixedReturnLenderAllocation,
  useFixedReturnHasDeposited,
  useFixedReturnIsTokenSupported,
  useFixedReturnGetSupportedTokens
} from '../reads'
import { mockFixedReturnReads } from '@/tests/mocks'
import type { Address } from 'viem'

const MOCK_DATA = {
  lenderAddress: '0xA0b86a33E6441bB7bE6d0B9EB5Bbf26b2d60C1cd' as Address,
  tokenAddress: '0x742d35Cc6bF8C55C6C2e013e5492D2b6637e0886' as Address,
  offerId: 1n
} as const

describe('FixedReturn Contract Reads', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useFixedReturnAddress returns a ref-like value', () => {
    const result = useFixedReturnAddress()
    expect(typeof result.value).toBe('string')
  })

  it('useFixedReturnOwner returns the owner mock', () => {
    expect(useFixedReturnOwner()).toBe(mockFixedReturnReads.owner)
  })

  it('useFixedReturnVersion returns the version mock', () => {
    expect(useFixedReturnVersion()).toBe(mockFixedReturnReads.version)
  })

  it('useFixedReturnTotalOfferings returns the totalOfferings mock', () => {
    mockFixedReturnReads.totalOfferings.data.value = 3n
    expect(useFixedReturnTotalOfferings().data.value).toBe(3n)
  })

  it('useFixedReturnGetLendingOffer returns the getLendingOffer mock', () => {
    const offer = { token: MOCK_DATA.tokenAddress, fundingTarget: 100000n }
    mockFixedReturnReads.getLendingOffer.data.value = offer
    const result = useFixedReturnGetLendingOffer(MOCK_DATA.offerId)
    expect(result).toBe(mockFixedReturnReads.getLendingOffer)
    expect(result.data.value).toEqual(offer)
  })

  it('useFixedReturnGetOfferLenders returns the getOfferLenders mock', () => {
    mockFixedReturnReads.getOfferLenders.data.value = [MOCK_DATA.lenderAddress]
    const result = useFixedReturnGetOfferLenders(MOCK_DATA.offerId)
    expect(result.data.value).toEqual([MOCK_DATA.lenderAddress])
  })

  it('useFixedReturnTotalEntitlementOf returns the totalEntitlementOf mock', () => {
    mockFixedReturnReads.totalEntitlementOf.data.value = 5000n
    const result = useFixedReturnTotalEntitlementOf(MOCK_DATA.offerId, MOCK_DATA.lenderAddress)
    expect(result).toBe(mockFixedReturnReads.totalEntitlementOf)
    expect(result.data.value).toBe(5000n)
  })

  it('useFixedReturnLenderDeposits returns the lenderDeposits mock', () => {
    mockFixedReturnReads.lenderDeposits.data.value = 1000n
    const result = useFixedReturnLenderDeposits(MOCK_DATA.offerId, MOCK_DATA.lenderAddress)
    expect(result.data.value).toBe(1000n)
  })

  it('useFixedReturnLenderAllocation returns the lenderAllocation mock', () => {
    mockFixedReturnReads.lenderAllocation.data.value = 2000n
    const result = useFixedReturnLenderAllocation(MOCK_DATA.offerId, MOCK_DATA.lenderAddress)
    expect(result.data.value).toBe(2000n)
  })

  it('useFixedReturnHasDeposited returns the hasDeposited mock', () => {
    mockFixedReturnReads.hasDeposited.data.value = true
    const result = useFixedReturnHasDeposited(MOCK_DATA.offerId, MOCK_DATA.lenderAddress)
    expect(result.data.value).toBe(true)
  })

  it('useFixedReturnIsTokenSupported returns the isTokenSupported mock', () => {
    mockFixedReturnReads.isTokenSupported.data.value = true
    const result = useFixedReturnIsTokenSupported(MOCK_DATA.tokenAddress)
    expect(result.data.value).toBe(true)
  })

  it('useFixedReturnGetSupportedTokens returns the getSupportedTokens mock', () => {
    mockFixedReturnReads.getSupportedTokens.data.value = [MOCK_DATA.tokenAddress]
    expect(useFixedReturnGetSupportedTokens().data.value).toEqual([MOCK_DATA.tokenAddress])
  })
})
