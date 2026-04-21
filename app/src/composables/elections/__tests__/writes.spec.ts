import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  useElectionsCreateElection,
  useElectionsCastVote,
  useElectionsPublishResults
} from '../writes'
import { mockElectionsWrites, resetContractMocks } from '@/tests/mocks'

describe('Elections Contract Writes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetContractMocks()
  })

  it('useElectionsCreateElection returns the createElection mutation', () => {
    const result = useElectionsCreateElection()
    expect(result).toBe(mockElectionsWrites.createElection)
    expect(result.mutateAsync).toBeInstanceOf(Function)
  })

  it('useElectionsCastVote returns the castVote mutation', () => {
    expect(useElectionsCastVote()).toBe(mockElectionsWrites.castVote)
  })

  it('useElectionsPublishResults returns the publishResults mutation', () => {
    expect(useElectionsPublishResults()).toBe(mockElectionsWrites.publishResults)
  })

  it('forwards mutateAsync success and errors from the mock', async () => {
    mockElectionsWrites.createElection.mutateAsync.mockResolvedValueOnce({ hash: '0xabc' })
    const out = await useElectionsCreateElection().mutateAsync({
      args: ['title', 'desc', 0n, 0n, 1n, [], []]
    })
    expect(out).toEqual({ hash: '0xabc' })

    mockElectionsWrites.castVote.mutateAsync.mockRejectedValueOnce(new Error('Vote casting failed'))
    await expect(
      useElectionsCastVote().mutateAsync({ args: [1n, []] })
    ).rejects.toThrow('Vote casting failed')
  })

  it('exposes the V3 mutation interface', () => {
    const result = useElectionsPublishResults()
    expect(result).toHaveProperty('mutate')
    expect(result).toHaveProperty('mutateAsync')
    expect(result).toHaveProperty('isPending')
  })
})
