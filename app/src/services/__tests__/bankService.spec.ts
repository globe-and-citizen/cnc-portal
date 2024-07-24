import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BankService } from '../bankService'
import { EthersJsAdapter } from '@/adapters/web3LibraryAdapter'
import { reactive } from 'vue'
import { BankEventType } from '@/types'

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
  getEvents: vi.fn((type: BankEventType) => events)
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
  deployBankContract: vi.fn(),
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

  describe('createBankContract', () => {
    it('should create a new bank contract', async () => {
      const result = await bankService.createBankContract('123')
      expect(useCustomFetchMock.put).toHaveBeenCalled()
      expect(result).toBe('0x123')
    })
  })

  describe('deposit', () => {
    it('should deposit to bank contract', async () => {
      const result = await bankService.deposit('0x123', '100')
      expect(bankService.web3Library.sendTransaction).toHaveBeenCalledWith('0x123', '100')
      expect(result).toMatchObject(tx)
    })
  })

  describe('transfer', () => {
    it('should transfer from bank contract', async () => {
      const result = await bankService.transfer('0x123', '0x456', '100')
      expect(bank.transfer).toHaveBeenCalledWith('0x456', bankService.web3Library.parseEther('100'))
      expect(result).toMatchObject(tx)
    })
  })

  describe('pushTip', () => {
    it('should pushTip from bank contract', async () => {
      const result = await bankService.pushTip('0x123', ['0x456'], 100)
      expect(bank.pushTip).toHaveBeenCalledWith(
        ['0x456'],
        bankService.web3Library.parseEther('100')
      )
      expect(result).toMatchObject(tx)
    })
  })

  describe('sendTip', () => {
    it('should sendTip from bank contract', async () => {
      const result = await bankService.sendTip('0x123', ['0x456'], 100)
      expect(bank.sendTip).toHaveBeenCalledWith(
        ['0x456'],
        bankService.web3Library.parseEther('100')
      )
      expect(result).toMatchObject(tx)
    })
  })

  describe('getEvents', () => {
    it('should get events from bank contract', async () => {
      const result = await bankService.getEvents('0x123', BankEventType.Deposit)
      expect(contractService.getEvents).toHaveBeenCalledWith(BankEventType.Deposit)
      expect(result).toMatchObject(events)
    })
  })

  describe('getContract', () => {
    it('should get bank contract', async () => {
      const result = await bankService.getContract('0x123')
      expect(contractService.getContract).toHaveBeenCalled()
      expect(result).toMatchObject(bank)
    })
  })
})
