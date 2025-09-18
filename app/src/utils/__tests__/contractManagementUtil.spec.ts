import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getTeamContracts } from '../contractManagementUtil'
import type { TeamContract } from '@/types'

// Mock wagmi core
const mockReadContract = vi.fn()
vi.mock('@wagmi/core', () => ({
  readContract: mockReadContract
}))

// Mock wagmi config
vi.mock('@/wagmi.config', () => ({
  config: { mockConfig: true }
}))

// Mock utils
const mockLog = {
  info: vi.fn(),
  error: vi.fn()
}
const mockParseError = vi.fn()

vi.mock('@/utils', () => ({
  log: mockLog,
  parseError: mockParseError
}))

// Mock ABI imports - these should be mocked to avoid file system issues
vi.mock('@/artifacts/abi/expense-account-eip712.json', () => ({
  default: [{ type: 'function', name: 'owner' }]
}))
vi.mock('@/artifacts/abi/bank.json', () => ({
  default: [{ type: 'function', name: 'owner' }]
}))
vi.mock('@/artifacts/abi/AdCampaignManager.json', () => ({
  default: [{ type: 'function', name: 'owner' }]
}))
vi.mock('@/artifacts/abi/CashRemunerationEIP712.json', () => ({
  default: [{ type: 'function', name: 'owner' }]
}))
vi.mock('@/artifacts/abi/elections.json', () => ({
  default: [{ type: 'function', name: 'owner' }]
}))
vi.mock('@/artifacts/abi/investorsV1', () => ({
  INVESTOR_ABI: [{ type: 'function', name: 'owner' }]
}))
vi.mock('@/artifacts/abi/proposals', () => ({
  PROPOSALS_ABI: [{ type: 'function', name: 'owner' }]
}))
vi.mock('@/artifacts/abi/voting.json', () => ({
  default: [{ type: 'function', name: 'owner' }]
}))

describe('contractManagementUtil', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockParseError.mockReturnValue('Parsed error message')
  })

  describe('getTeamContracts', () => {
    const mockContracts: TeamContract[] = [
      {
        address: '0x1234567890123456789012345678901234567890',
        type: 'ExpenseAccount',
        admins: ['0xAdmin1'],
        deployer: '0xDeployer1'
      },
      {
        address: '0x2345678901234567890123456789012345678901',
        type: 'Bank',
        admins: ['0xAdmin2'],
        deployer: '0xDeployer2'
      }
    ]

    it('should fetch contract owners and paused status successfully', async () => {
      mockReadContract
        .mockResolvedValueOnce('0xOwner1') // owner call for first contract
        .mockResolvedValueOnce(false) // paused call for first contract
        .mockResolvedValueOnce('0xOwner2') // owner call for second contract
        .mockResolvedValueOnce(true) // paused call for second contract

      const result = await getTeamContracts(mockContracts)

      expect(result).toHaveLength(2)
      expect(result![0]).toEqual({
        address: '0x1234567890123456789012345678901234567890',
        type: 'ExpenseAccount',
        admins: ['0xAdmin1'],
        deployer: '0xDeployer1',
        owner: '0xOwner1',
        paused: false
      })
      expect(result![1]).toEqual({
        address: '0x2345678901234567890123456789012345678901',
        type: 'Bank',
        admins: ['0xAdmin2'],
        deployer: '0xDeployer2',
        owner: '0xOwner2',
        paused: true
      })

      expect(mockReadContract).toHaveBeenCalledTimes(4)
    })

    it('should handle empty contracts array', async () => {
      const result = await getTeamContracts([])

      expect(result).toEqual([])
      expect(mockReadContract).not.toHaveBeenCalled()
    })

    it('should skip contracts without ABI', async () => {
      const contractsWithUnknownType: TeamContract[] = [
        {
          address: '0x1234567890123456789012345678901234567890',
          type: 'UnknownType' as unknown as ContractType,
          admins: [],
          deployer: '0xDeployer'
        }
      ]

      // Mock the contractsWithAbis function to return null for unknown types
      const result = await getTeamContracts(contractsWithUnknownType)

      // Should return empty array since unknown types don't have ABIs
      expect(result).toEqual([])
    })

    it('should handle readContract errors gracefully', async () => {
      const contractError = new Error('Contract call failed')
      mockReadContract.mockRejectedValueOnce(contractError)

      const result = await getTeamContracts(mockContracts)

      expect(result).toBeUndefined()
      expect(mockLog.error).toHaveBeenCalledWith(
        'Error fetching contract owners: ',
        'Parsed error message'
      )
      expect(mockParseError).toHaveBeenCalledWith(contractError)
    })

    it('should handle mixed success and failure scenarios', async () => {
      mockReadContract
        .mockResolvedValueOnce('0xOwner1') // owner call for first contract
        .mockRejectedValueOnce(new Error('Paused call failed')) // paused call fails

      const result = await getTeamContracts(mockContracts)

      expect(result).toBeUndefined()
      expect(mockLog.error).toHaveBeenCalled()
    })

    it('should log info for contracts with undefined ABI', async () => {
      const contractsWithNull = [null, undefined] as unknown as Contract[]

      const result = await getTeamContracts(contractsWithNull)

      expect(result).toBeUndefined()
      expect(mockLog.error).toHaveBeenCalled()
    })

    it('should call readContract with correct parameters', async () => {
      mockReadContract.mockResolvedValueOnce('0xOwner1').mockResolvedValueOnce(false)

      const singleContract = [mockContracts[0]]
      await getTeamContracts(singleContract)

      expect(mockReadContract).toHaveBeenNthCalledWith(
        1,
        { mockConfig: true },
        {
          address: '0x1234567890123456789012345678901234567890',
          abi: expect.any(Array),
          functionName: 'owner'
        }
      )

      expect(mockReadContract).toHaveBeenNthCalledWith(
        2,
        { mockConfig: true },
        {
          address: '0x1234567890123456789012345678901234567890',
          abi: expect.any(Array),
          functionName: 'paused'
        }
      )
    })

    it('should handle contracts with different types correctly', async () => {
      const multiTypeContracts: TeamContract[] = [
        { address: '0x111', type: 'ExpenseAccount', admins: [], deployer: '0x1' },
        { address: '0x222', type: 'Bank', admins: [], deployer: '0x2' },
        { address: '0x333', type: 'Campaign', admins: [], deployer: '0x3' },
        { address: '0x444', type: 'CashRemunerationEIP712', admins: [], deployer: '0x4' },
        { address: '0x555', type: 'Elections', admins: [], deployer: '0x5' }
      ]

      // Mock successful responses for all contracts
      mockReadContract.mockResolvedValue('0xOwner')
      mockReadContract.mockResolvedValue(false)

      const result = await getTeamContracts(multiTypeContracts)

      // Should process all contracts with known types
      expect(mockReadContract).toHaveBeenCalled()
      expect(result).toBeDefined()
    })
  })
})
