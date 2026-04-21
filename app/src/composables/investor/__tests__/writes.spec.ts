import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  useIndividualMint,
  useDistributeMint,
  useTransfer,
  usePause,
  useUnpause,
  useInitialize,
  useTransferOwnership,
  useRenounceOwnership
} from '../writes'
import { mockInvestorWrites, resetContractMocks } from '@/tests/mocks'

describe('Investor Contract Writes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetContractMocks()
  })

  it('useIndividualMint returns the mint mutation', () => {
    const result = useIndividualMint()
    expect(result).toBe(mockInvestorWrites.mint)
    expect(result.mutateAsync).toBeInstanceOf(Function)
  })

  it('useDistributeMint returns the mint mutation', () => {
    expect(useDistributeMint()).toBe(mockInvestorWrites.mint)
  })

  it('useTransfer returns the transfer mutation', () => {
    expect(useTransfer()).toBe(mockInvestorWrites.transfer)
  })

  it('usePause / useUnpause return distinct mutations', () => {
    expect(usePause()).toBe(mockInvestorWrites.pause)
    expect(useUnpause()).toBe(mockInvestorWrites.unpause)
  })

  it('useInitialize returns the initialize mutation', () => {
    expect(useInitialize()).toBe(mockInvestorWrites.initialize)
  })

  it('useTransferOwnership / useRenounceOwnership return their mutations', () => {
    expect(useTransferOwnership()).toBe(mockInvestorWrites.transferOwnership)
    expect(useRenounceOwnership()).toBe(mockInvestorWrites.renounceOwnership)
  })

  it('forwards mutateAsync results and errors from the mock', async () => {
    mockInvestorWrites.mint.mutateAsync.mockResolvedValueOnce({ hash: '0xminted' })
    const result = useIndividualMint()
    const out = await result.mutateAsync({ args: ['0xshareholder', 1n] })
    expect(out).toEqual({ hash: '0xminted' })

    const err = new Error('Mint failed')
    mockInvestorWrites.mint.mutateAsync.mockRejectedValueOnce(err)
    await expect(result.mutateAsync({ args: ['0xshareholder', 1n] })).rejects.toThrow('Mint failed')
  })

  it('exposes the V3 mutation interface', () => {
    const result = usePause()
    expect(result).toHaveProperty('mutate')
    expect(result).toHaveProperty('mutateAsync')
    expect(result).toHaveProperty('isPending')
  })
})
