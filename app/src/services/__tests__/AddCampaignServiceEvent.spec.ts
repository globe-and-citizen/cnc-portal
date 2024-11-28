import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AddCampaignService } from '@/services/AddCampaignService'
import { reactive } from 'vue'
import { EthersJsAdapter } from '@/adapters/web3LibraryAdapter'

const tx = {
  txHash: '0x123',
  wait: vi.fn()
}

const _tx = {
  wait: vi.fn().mockResolvedValue({
    status: 1, // Simulating a successful transaction receipt
    transactionHash: '0x123456789',
    blockNumber: 12345
  })
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
const contractData = [{ key: 'exampleKey', value: 'exampleValue' }]
const adminList = ['0xAdminAddress1', '0xAdminAddress2']

const addCampaign = {
  createAdCampaignManager: vi.fn().mockResolvedValue('0xCampaignManagerAddress'),
  getEvents: vi.fn().mockResolvedValue(events),
  getContractData: vi.fn().mockResolvedValue(contractData),
  addAdmin: vi.fn().mockReturnValue(_tx),
  removeAdmin: vi.fn().mockReturnValue(_tx),
  getAdminList: vi.fn().mockResolvedValue(adminList),
  testFunction: vi.fn().mockResolvedValue('0xResult'),
  queryFilter: vi.fn(),
  filters: {
    AdminAdded: vi.fn(),
    AdminRemoved: vi.fn(),
    CampaignCreated: vi.fn()
  },
  interface: {
    encodeFunctionData: vi.fn()
  },
  waitForDeployment: vi.fn().mockReturnValue({
    getAddress: vi.fn().mockReturnValue('0x123')
  })
}

// mock SmartContract
const contractService = {
  getContract: vi.fn().mockReturnValue(addCampaign),
  getEvents: vi.fn().mockReturnValue(events)
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
  getContract: vi.fn().mockReturnValue(addCampaign),
  parseEther: vi.fn((value) => (value / 1e18).toString()),
  getFactoryContract: vi.fn().mockImplementation(() => {
    return {
      deploy: vi.fn().mockReturnValue(addCampaign)
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
      addCampainAddress: '0x123'
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

describe('AddCampaignService', () => {
  let addCampaignService: AddCampaignService

  beforeEach(() => {
    EthersJsAdapter['getInstance'] = vi.fn().mockReturnValue(mockEthersJs)
    addCampaignService = new AddCampaignService()
  })

  describe('getEvents', () => {
    it('should return the list of events', async () => {
      const resultAdmin = await addCampaignService.addAdmin('0xCampaignAddress', '0xAdminAddress')
      // Verify the addAdmin method was called on the contract
      expect(addCampaign.addAdmin).toHaveBeenCalledWith('0xAdminAddress')
      // Verify that the transaction was awaited
      expect(resultAdmin).toMatchObject(await _tx.wait())
      // Mock the events
      const adminAddedEvent = { args: { admin: '0xAdmin1' } }
      const adminRemovedEvent = { args: { admin: '0xAdmin2' } }

      addCampaign.queryFilter
        .mockResolvedValueOnce([adminAddedEvent, { args: { admin: '0xAdmin2' } }]) // AdminAdded
        .mockResolvedValueOnce([adminRemovedEvent]) // AdminRemoved

      const adminList = await addCampaignService.getAdminList('0xCampaignAddress')

      // Verify that queryFilter was called with correct event filters
      expect(addCampaign.queryFilter).toHaveBeenCalledTimes(2)
      expect(addCampaign.filters.AdminAdded).toHaveBeenCalled()
      expect(addCampaign.filters.AdminRemoved).toHaveBeenCalled()

      // Verify that the returned list is correct
      expect(adminList).toEqual(['0xAdmin1'])

      const resultEvents = await addCampaignService.getEvents(
        '0xCampaignAddress',
        'CampaignCreated'
      )
      expect(addCampaign.queryFilter).toHaveBeenCalledWith(addCampaign.filters.CampaignCreated())
      // Verify the correct event log was returned
      expect(resultEvents).toEqual(events)
    })
  })
})
