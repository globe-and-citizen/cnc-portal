import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BankService } from '../bankService'
import { EthersJsAdapter } from '@/adapters/web3LibraryAdapter'
import { reactive } from 'vue'

// mock Bank
const tx = {
  txHash: '0x123',
  wait: vi.fn()
}
const events = [
  {
    transactionHash: '0x123',
    data: '0x123',
    topics: ['0x123']
  },
  {
    transactionHash: '0x456',
    data: '0x123',
    topics: ['0x123']
  }
]
const bank = {
  transfer: vi.fn().mockReturnValue(tx),
  pushTip: vi.fn().mockReturnValue(tx),
  sendTip: vi.fn().mockReturnValue(tx),
  getEvents: vi.fn().mockReturnValue(events),
  pause: vi.fn().mockReturnValue(tx),
  unpause: vi.fn().mockReturnValue(tx),
  transferOwnership: vi.fn().mockReturnValue(tx),
  owner: vi.fn().mockReturnValue(tx),
  paused: vi.fn().mockReturnValue(false),
  queryFilter: vi.fn(),
  interface: {
    encodeFunctionData: vi.fn()
  },
  waitForDeployment: vi.fn().mockReturnValue({
    getAddress: vi.fn().mockReturnValue('0x123')
  })
}

// mock SmartContract
const contractService = {
  getContract: vi.fn().mockReturnValue(bank),
  getEvents: vi.fn().mockReturnValueOnce(events)
}
vi.mock('@/services/contractService', () => {
  return {
    SmartContract: vi.fn().mockImplementation(() => contractService)
  }
})

// mock web3Library
const mockEthersJs = {
  initialize: vi.fn(),
  connectWallet: vi.fn(),
  sendTransaction: vi.fn().mockReturnValue(tx),
  getContract: vi.fn().mockReturnValue(bank),
  parseEther: vi.fn((value) => (value / 1e18).toString()),
  getFactoryContract: vi.fn().mockImplementation(() => {
    return {
      deploy: vi.fn().mockReturnValue(bank)
    }
  })
}

vi.mock('@/adapters/web3LibraryAdapter', () => {
  return {
    EthersJsAdapter: vi.fn().mockImplementation(() => mockEthersJs)
  }
})

// mock useCustomFetch
const mockResponseJson = {
  data: {
    value: reactive({
      bankAddress: '0x123'
    })
  }
}
const useCustomFetchMock = {
  put: vi.fn().mockImplementation(() => {
    return { json: vi.fn().mockReturnValue(mockResponseJson) }
  })
}
vi.mock('@/composables/useCustomFetch', () => ({
  useCustomFetch: vi.fn().mockImplementation(() => useCustomFetchMock)
}))

describe('Bank Service', () => {
  let bankService: BankService

  beforeEach(() => {
    EthersJsAdapter['getInstance'] = vi.fn().mockReturnValue(mockEthersJs)
    bankService = new BankService()
  })

  describe('getContract', () => {
    it('should get bank contract', async () => {
      const result = await bankService.getContract('0x123')
      expect(contractService.getContract).toHaveBeenCalled()
      expect(result).toMatchObject(bank)
    })
  })
})
