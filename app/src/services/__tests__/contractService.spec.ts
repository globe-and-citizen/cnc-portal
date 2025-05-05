import { SmartContract } from '../contractService'
import type { IWeb3Library } from '@/adapters/web3LibraryAdapter'
import type { Contract, EventLog, InterfaceAbi } from 'ethers'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock EthersJsAdapter
vi.mock('@/adapters/web3LibraryAdapter', () => ({
  EthersJsAdapter: {
    getInstance: vi.fn(() => ({
      getContract: vi.fn()
    }))
  }
}))

describe('SmartContract', () => {
  const mockContractAddress = '0x1234567890123456789012345678901234567890'
  const mockContractAbi: InterfaceAbi = ['some abi']
  const mockContract = {
    queryFilter: vi.fn().mockResolvedValue([])
  } as unknown as Contract

  let smartContract: SmartContract
  let mockWeb3Library: IWeb3Library

  beforeEach(() => {
    vi.clearAllMocks()
    mockWeb3Library = {
      getContract: vi.fn().mockResolvedValue(mockContract),
      initialize: vi.fn(),
      connectWallet: vi.fn(),
      requestSign: vi.fn(),
      getAddress: vi.fn(),
      getBalance: vi.fn(),
      getFactoryContract: vi.fn(),
      parseEther: vi.fn(),
      formatEther: vi.fn(),
      sendTransaction: vi.fn()
    }
    smartContract = new SmartContract(mockContractAddress, mockContractAbi, mockWeb3Library)
  })

  describe('getContract', () => {
    it('should get contract instance if not already initialized', async () => {
      const contract = await smartContract.getContract()

      expect(mockWeb3Library.getContract).toHaveBeenCalledTimes(1)
      expect(mockWeb3Library.getContract).toHaveBeenCalledWith(mockContractAddress, mockContractAbi)
      expect(contract).toBe(mockContract)
    })

    it('should return existing contract instance if already initialized', async () => {
      // First call to initialize contract
      await smartContract.getContract()

      // Second call should use cached instance
      const contract = await smartContract.getContract()

      expect(mockWeb3Library.getContract).toHaveBeenCalledTimes(1)
      expect(contract).toBe(mockContract)
    })
  })

  describe('getEvents', () => {
    const mockEventType = 'Transfer'
    const mockEventLogs = [
      { blockNumber: 1, transactionIndex: 0, logIndex: 0 }
    ] as unknown as EventLog[]

    interface IMock {
      mockResolvedValue: (value: EventLog[]) => void
    }
    beforeEach(() => {
      const mock = mockContract.queryFilter as unknown as IMock
      mock.mockResolvedValue(mockEventLogs)
    })

    it('should get events of specified type', async () => {
      const events = await smartContract.getEvents(mockEventType)

      expect(mockWeb3Library.getContract).toHaveBeenCalledTimes(1)
      expect(mockContract.queryFilter).toHaveBeenCalledWith(mockEventType)
      expect(events).toEqual(mockEventLogs)
    })

    it('should initialize contract if not already initialized', async () => {
      await smartContract.getEvents(mockEventType)

      expect(mockWeb3Library.getContract).toHaveBeenCalledTimes(1)
      expect(mockWeb3Library.getContract).toHaveBeenCalledWith(mockContractAddress, mockContractAbi)
    })

    it('should use existing contract if already initialized', async () => {
      // First initialize contract
      await smartContract.getContract()

      // Then get events
      await smartContract.getEvents(mockEventType)

      expect(mockWeb3Library.getContract).toHaveBeenCalledTimes(1)
      expect(mockContract.queryFilter).toHaveBeenCalledWith(mockEventType)
    })
  })
})
