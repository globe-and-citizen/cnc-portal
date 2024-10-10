import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OfficerService } from '@/services/officerService'
import { type IWeb3Library, EthersJsAdapter } from '@/adapters/web3LibraryAdapter'
import { Contract } from 'ethers'
import { setActivePinia, createPinia } from 'pinia'

import { reactive } from 'vue'

// Mock data
const mockOfficerAddress = '0xOfficerAddress'
const mockTeamId = 'team1'
const tx = { wait: vi.fn() }
const mockTeam = {
  founders: ['0xFounder1', '0xFounder2'],
  members: ['0xMember1', '0xMember2'],
  bankAddress: '0xBankAddress',
  votingAddress: '0xVotingAddress',
  bodAddress: '0xBoDAddress'
}

// Mock the `useCustomFetch`
vi.mock('@/composables/useCustomFetch', () => ({
  useCustomFetch: vi.fn()
}))

// Mock the `EthersJsAdapter`
vi.mock('@/adapters/web3LibraryAdapter', () => ({
  EthersJsAdapter: {
    getInstance: vi.fn()
  }
}))
const mockResponseJson = {
  data: {
    value: reactive({
      officerAddress: mockOfficerAddress
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

// Mock SmartContract methods
const mockContract = {
  getTeam: vi
    .fn()
    .mockResolvedValue([
      mockTeam.founders,
      mockTeam.members,
      mockTeam.bankAddress,
      mockTeam.votingAddress,
      mockTeam.bodAddress
    ]),
  deployBankAccount: vi.fn().mockResolvedValue(tx),
  deployVotingContract: vi.fn().mockResolvedValue(tx),
  deployExpenseAccount: vi.fn().mockResolvedValue(tx),
  createTeam: vi.fn().mockResolvedValue(tx),
  createBeaconProxy: vi.fn().mockResolvedValue(tx),
  interface: {
    encodeFunctionData: vi.fn()
  }
}

// Mock the web3Library service
const web3LibraryMock = {
  getContract: vi.fn().mockResolvedValue(mockContract as unknown as Contract),

  getFactoryContract: vi.fn().mockResolvedValue({
    deploy: vi.fn().mockResolvedValue({
      waitForDeployment: vi.fn().mockResolvedValue({
        getAddress: vi.fn().mockResolvedValue(mockOfficerAddress)
      })
    })
  })
}

describe('OfficerService', () => {
  let officerService: OfficerService

  beforeEach(() => {
    setActivePinia(createPinia())

    // Mock the `getInstance` method to return the mocked web3 library
    ;(EthersJsAdapter.getInstance as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      web3LibraryMock
    )

    officerService = new OfficerService(web3LibraryMock as unknown as IWeb3Library)
  })

  describe('createOfficerContract', () => {
    it('should create an officer contract and update the team', async () => {
      const officerAddress = await officerService.createOfficerContract(mockTeamId)

      expect(officerAddress).toBe(mockOfficerAddress)
    })

    it('should handle errors when creating officer contract', async () => {
      mockContract.createBeaconProxy.mockRejectedValueOnce(new Error('Create Failed'))

      await expect(officerService.createOfficerContract(mockTeamId)).rejects.toThrow(
        'Create Failed'
      )
    })
  })

  describe('getOfficerTeam', () => {
    it('should fetch the officer team', async () => {
      const team = await officerService.getOfficerTeam(mockOfficerAddress)

      expect(team).toEqual(mockTeam)
      expect(mockContract.getTeam).toHaveBeenCalledOnce()
    })

    it('should handle errors when fetching the team', async () => {
      mockContract.getTeam.mockRejectedValueOnce(new Error('Get Team Failed'))

      await expect(officerService.getOfficerTeam(mockOfficerAddress)).rejects.toThrow(
        'Get Team Failed'
      )
    })
  })

  describe('deployBank', () => {
    it('should deploy the bank contract', async () => {
      await officerService.deployBank(mockOfficerAddress)

      expect(mockContract.deployBankAccount).toHaveBeenCalledOnce()
    })

    it('should handle errors when deploying the bank', async () => {
      mockContract.deployBankAccount.mockRejectedValueOnce(new Error('Deploy Bank Failed'))

      await expect(officerService.deployBank(mockOfficerAddress)).rejects.toThrow(
        'Deploy Bank Failed'
      )
    })
  })

  describe('deployVoting', () => {
    it('should deploy the voting contract', async () => {
      const tx = await officerService.deployVoting(mockOfficerAddress)

      expect(mockContract.deployVotingContract).toHaveBeenCalledOnce()
      expect(tx).toBeDefined()
    })

    it('should handle errors when deploying the voting contract', async () => {
      mockContract.deployVotingContract.mockRejectedValueOnce(new Error('Deploy Voting Failed'))

      await expect(officerService.deployVoting(mockOfficerAddress)).rejects.toThrow(
        'Deploy Voting Failed'
      )
    })
  })

  describe('createTeam', () => {
    it('should create a team with founders and members', async () => {
      await officerService.createTeam(mockOfficerAddress, mockTeam.founders, mockTeam.members)

      expect(mockContract.createTeam).toHaveBeenCalledOnce()
      expect(mockContract.createTeam).toHaveBeenCalledWith(mockTeam.founders, mockTeam.members)
    })

    it('should handle errors when creating a team', async () => {
      mockContract.createTeam.mockRejectedValueOnce(new Error('Create Team Failed'))

      await expect(
        officerService.createTeam(mockOfficerAddress, mockTeam.founders, mockTeam.members)
      ).rejects.toThrow('Create Team Failed')
    })
  })
  describe('deployExpenseAccount', () => {
    it('should deploy the expense account contract', async () => {
      await officerService.deployExpenseAccount(mockOfficerAddress)

      expect(mockContract.deployExpenseAccount).toHaveBeenCalledOnce()
    })

    it('should handle errors when deploying the expense account', async () => {
      mockContract.deployExpenseAccount.mockRejectedValueOnce(new Error('Deploy Expense Failed'))

      await expect(officerService.deployExpenseAccount(mockOfficerAddress)).rejects.toThrow(
        'Deploy Expense Failed'
      )
    })
  })
})
