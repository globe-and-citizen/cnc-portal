import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  useDepositToken,
  useDistributeNativeDividends,
  useDistributeTokenDividends
} from '../writes'
import { mockBankWrites, resetContractMocks } from '@/tests/mocks'

describe('Bank Contract Writes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetContractMocks()
  })

  it('useDepositToken returns the deposit mutation', () => {
    const result = useDepositToken()
    expect(result).toBe(mockBankWrites.deposit)
    expect(result.mutateAsync).toBeInstanceOf(Function)
  })

  it('useDistributeNativeDividends returns its mutation', () => {
    expect(useDistributeNativeDividends()).toBe(mockBankWrites.distributeNativeDividends)
  })

  it('useDistributeTokenDividends returns its mutation', () => {
    expect(useDistributeTokenDividends()).toBe(mockBankWrites.distributeTokenDividends)
  })

  it('forwards mutateAsync success and errors from the mock', async () => {
    mockBankWrites.deposit.mutateAsync.mockResolvedValueOnce({ hash: '0xdep' })
    const out = await useDepositToken().mutateAsync({ args: ['0xtoken', 100n] })
    expect(out).toEqual({ hash: '0xdep' })

    mockBankWrites.deposit.mutateAsync.mockRejectedValueOnce(new Error('Deposit failed'))
    await expect(
      useDepositToken().mutateAsync({ args: ['0xtoken', 100n] })
    ).rejects.toThrow('Deposit failed')
  })

  it('exposes the V3 mutation interface', () => {
    const result = useDepositToken()
    expect(result).toHaveProperty('mutate')
    expect(result).toHaveProperty('mutateAsync')
    expect(result).toHaveProperty('isPending')
  })
})

// UNUSED composables — tests commented out along with the composables:
//   useAddTokenSupport, useRemoveTokenSupport, usePause, useUnpause,
//   useTransferOwnership, useRenounceOwnership, useTransfer, useTransferToken
// See ../writes.ts for the commented-out definitions.
