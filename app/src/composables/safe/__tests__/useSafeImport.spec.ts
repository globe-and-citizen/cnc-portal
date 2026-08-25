import { describe, expect, it, beforeEach, vi } from 'vitest'
import { readContract } from '@wagmi/core'
import { getAddress, type Address } from 'viem'
import { currentChainId } from '@/constant'
import { inspectSafe } from '../useSafeImport'

const SAFE_ADDRESS = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as Address
const OWNERS = [
  '0x1111111111111111111111111111111111111111',
  '0x2222222222222222222222222222222222222222'
] as Address[]

const mockReadContract = vi.mocked(readContract)

describe('inspectSafe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockReadContract
      .mockResolvedValueOnce(OWNERS)
      .mockResolvedValueOnce(2n)
      .mockResolvedValueOnce('1.4.1')
  })

  it('reads and returns the existing Safe configuration on the configured network', async () => {
    await expect(inspectSafe(SAFE_ADDRESS)).resolves.toEqual({
      address: getAddress(SAFE_ADDRESS),
      owners: OWNERS,
      threshold: 2,
      version: '1.4.1'
    })

    expect(mockReadContract).toHaveBeenCalledTimes(3)
    expect(mockReadContract).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        address: getAddress(SAFE_ADDRESS),
        chainId: currentChainId,
        functionName: 'getOwners'
      })
    )
  })

  it('rejects an invalid address before reading the network', async () => {
    await expect(inspectSafe('not-an-address')).rejects.toThrow('Enter a valid Safe address')
    expect(mockReadContract).not.toHaveBeenCalled()
  })

  it('rejects an address that does not expose the Safe interface', async () => {
    mockReadContract.mockReset()
    mockReadContract.mockRejectedValue(new Error('execution reverted'))

    await expect(inspectSafe(SAFE_ADDRESS)).rejects.toThrow(
      'No supported Safe was found at this address on the configured network'
    )
  })

  it('rejects an invalid Safe threshold', async () => {
    mockReadContract.mockReset()
    mockReadContract
      .mockResolvedValueOnce(OWNERS)
      .mockResolvedValueOnce(3n)
      .mockResolvedValueOnce('1.4.1')

    await expect(inspectSafe(SAFE_ADDRESS)).rejects.toThrow('The Safe configuration is invalid')
  })
})
