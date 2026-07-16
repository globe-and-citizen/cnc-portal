import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  useFixedReturnCreateLendingOffer,
  useFixedReturnLendFunds,
  useFixedReturnMarkAsRefundable,
  useFixedReturnClaimRefund,
  useFixedReturnRefundLenders,
  useFixedReturnAcceptPartialFunding,
  useFixedReturnAddTokenSupport,
  useFixedReturnRemoveTokenSupport
} from '../writes'
import { mockFixedReturnWrites } from '@/tests/mocks'

describe('FixedReturn Contract Writes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useFixedReturnCreateLendingOffer returns the createLendingOffer mutation', () => {
    const result = useFixedReturnCreateLendingOffer()
    expect(result).toBe(mockFixedReturnWrites.createLendingOffer)
    expect(result.mutateAsync).toBeInstanceOf(Function)
  })

  it('useFixedReturnLendFunds returns its mutation', () => {
    expect(useFixedReturnLendFunds()).toBe(mockFixedReturnWrites.lendFunds)
  })

  it('useFixedReturnMarkAsRefundable returns its mutation', () => {
    expect(useFixedReturnMarkAsRefundable()).toBe(mockFixedReturnWrites.markAsRefundable)
  })

  it('useFixedReturnClaimRefund returns its mutation', () => {
    expect(useFixedReturnClaimRefund()).toBe(mockFixedReturnWrites.claimRefund)
  })

  it('useFixedReturnRefundLenders returns its mutation', () => {
    expect(useFixedReturnRefundLenders()).toBe(mockFixedReturnWrites.refundLenders)
  })

  it('useFixedReturnAcceptPartialFunding returns its mutation', () => {
    expect(useFixedReturnAcceptPartialFunding()).toBe(mockFixedReturnWrites.acceptPartialFunding)
  })

  it('useFixedReturnAddTokenSupport returns its mutation', () => {
    expect(useFixedReturnAddTokenSupport()).toBe(mockFixedReturnWrites.addTokenSupport)
  })

  it('useFixedReturnRemoveTokenSupport returns its mutation', () => {
    expect(useFixedReturnRemoveTokenSupport()).toBe(mockFixedReturnWrites.removeTokenSupport)
  })

  it('forwards mutateAsync success and errors from the mock', async () => {
    mockFixedReturnWrites.lendFunds.mutateAsync.mockResolvedValueOnce({ hash: '0xlend' })
    const out = await useFixedReturnLendFunds().mutateAsync({ args: [1n, 1000n] })
    expect(out).toEqual({ hash: '0xlend' })

    mockFixedReturnWrites.lendFunds.mutateAsync.mockRejectedValueOnce(new Error('Lend failed'))
    await expect(useFixedReturnLendFunds().mutateAsync({ args: [1n, 1000n] })).rejects.toThrow(
      'Lend failed'
    )
  })

  it('exposes the V3 mutation interface', () => {
    const result = useFixedReturnCreateLendingOffer()
    expect(result).toHaveProperty('mutate')
    expect(result).toHaveProperty('mutateAsync')
    expect(result).toHaveProperty('isPending')
  })
})
