import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BoDService } from '@/services/bodService'
import { type IWeb3Library, EthersJsAdapter } from '@/adapters/web3LibraryAdapter'
import { Contract } from 'ethers'
import { useCustomFetch } from '@/composables/useCustomFetch'

// Mock data
const mockDirectors = ['0xDirector1', '0xDirector2', '0xDirector3']

// Mock the EthersJsAdapter
vi.mock('@/adapters/web3LibraryAdapter', () => ({
  EthersJsAdapter: {
    getInstance: vi.fn()
  }
}))

// Mock the SmartContract class and its getContract method
vi.mock('@/services/contractService', () => ({
  SmartContract: vi.fn().mockImplementation(() => ({
    getContract: vi.fn().mockResolvedValue({
      getBoardOfDirectors: vi.fn().mockResolvedValue(mockDirectors)
    })
  }))
}))

// Mock useCustomFetch
vi.mock('@/composables/useCustomFetch', () => ({
  useCustomFetch: vi.fn().mockReturnValue({
    put: vi.fn().mockReturnThis(),
    json: vi
      .fn()
      .mockResolvedValue({ data: { value: { boardOfDirectorsAddress: '0xBodAddress' } } })
  })
}))

describe('BoDService', () => {
  let bodService: BoDService
  let mockContract: {
    getBoardOfDirectors: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    mockContract = {
      getBoardOfDirectors: vi.fn().mockResolvedValue(mockDirectors)
    }

    const ethersJsAdapterMock = {
      getContract: vi.fn().mockResolvedValue(mockContract as unknown as Contract),
      getFactoryContract: vi.fn().mockResolvedValue({
        deploy: vi.fn().mockResolvedValue({
          waitForDeployment: vi.fn().mockResolvedValue({
            getAddress: vi.fn().mockResolvedValue('0xDeployedAddress')
          })
        })
      })
    }

    ;(EthersJsAdapter.getInstance as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      ethersJsAdapterMock
    )

    bodService = new BoDService(ethersJsAdapterMock as unknown as IWeb3Library)
  })

  describe('getBoardOfDirectors', () => {
    it('should fetch board of directors', async () => {
      const directors = await bodService.getBoardOfDirectors('0xBodAddress')

      expect(directors).toBeDefined()
      expect(directors.length).toBeGreaterThan(0)
      expect(directors).toEqual(mockDirectors)
    })

    it('should handle errors when fetching board of directors', async () => {
      mockContract.getBoardOfDirectors.mockRejectedValueOnce(new Error('Fetch Failed'))

      await expect(bodService.getBoardOfDirectors('0xBodAddress')).rejects.toThrow('Fetch Failed')
      expect(mockContract.getBoardOfDirectors).toHaveBeenCalledOnce()
    })
  })

  describe('createBODContract', () => {
    it('should create BOD contract and return the address', async () => {
      const address = await bodService.createBODContract('teamId', '0xVotingAddress')

      expect(address).toBeDefined()
      expect(address).toBe('0xBodAddress')
    })

    it('should handle errors when creating BOD contract', async () => {
      ;(useCustomFetch('teams/teamId').json as any).mockRejectedValueOnce(
        new Error('Creation Failed')
      )

      await expect(bodService.createBODContract('teamId', '0xVotingAddress')).rejects.toThrow(
        'Creation Failed'
      )
    })
  })

  describe('deployBoDContract', () => {
    it('should deploy the BoD contract and return the address', async () => {
      const address = await bodService.createBODContract('teamId', '0xVotingAddress')

      expect(address).toBe('0xBodAddress')
    })
  })
})
