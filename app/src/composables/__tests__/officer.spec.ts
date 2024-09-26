import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  useDeployOfficerContract,
  useCreateTeam,
  useGetOfficerTeam,
  useDeployBank,
  useDeployVoting
} from '@/composables/officer'
// Mock the OfficerService class
vi.mock('@/services/officerService', () => {
  const mockContractAddress = '0xOfficerContractAddress'
  const mockOfficerTeam = {
    founders: ['0xFounder1'],
    members: ['0xMember1', '0xMember2'],
    bankAddress: '0xBankAddress',
    votingAddress: '0xVotingAddress',
    bodAddress: '0xBoDAddress'
  }
  return {
    OfficerService: vi.fn().mockImplementation(() => ({
      createOfficerContract: vi.fn().mockResolvedValue(mockContractAddress),
      createTeam: vi.fn().mockResolvedValue(mockContractAddress),
      getOfficerTeam: vi.fn().mockResolvedValue(mockOfficerTeam),
      deployBank: vi.fn().mockResolvedValue(mockContractAddress),
      deployVoting: vi.fn().mockResolvedValue(mockContractAddress)
    }))
  }
})

describe('Officer Composables', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useDeployOfficerContract', () => {
    it('should deploy the officer contract successfully', async () => {
      const { execute, isLoading, isSuccess, error, contractAddress } = useDeployOfficerContract()

      await execute('teamId')

      expect(isLoading.value).toBe(false)
      expect(isSuccess.value).toBe(true)
      expect(error.value).toBe(null)
      expect(contractAddress.value).toEqual('0xOfficerContractAddress')
    })
  })

  describe('useCreateTeam', () => {
    it('should create a team successfully', async () => {
      const { execute, isLoading, isSuccess, error } = useCreateTeam()

      await execute('0xOfficerAddress', ['0xFounder1'], ['0xMember1', '0xMember2'])

      expect(isLoading.value).toBe(false)
      expect(isSuccess.value).toBe(true)
      expect(error.value).toBe(null)
    })
  })

  describe('useGetOfficerTeam', () => {
    it('should fetch the officer team successfully', async () => {
      const { execute, isLoading, isSuccess, error, officerTeam } = useGetOfficerTeam()

      await execute('0xOfficerAddress')

      expect(isLoading.value).toBe(false)
      expect(isSuccess.value).toBe(true)
      expect(error.value).toBe(null)
      expect(officerTeam.value).toEqual({
        founders: ['0xFounder1'],
        members: ['0xMember1', '0xMember2'],
        bankAddress: '0xBankAddress',
        votingAddress: '0xVotingAddress',
        bodAddress: '0xBoDAddress'
      })
    })
  })

  describe('useDeployBank', () => {
    it('should deploy the bank successfully', async () => {
      const { execute, isLoading, isSuccess, error } = useDeployBank()

      await execute('0xOfficerAddress')

      expect(isLoading.value).toBe(false)
      expect(isSuccess.value).toBe(true)
      expect(error.value).toBe(null)
    })
  })

  describe('useDeployVoting', () => {
    it('should deploy the voting contract successfully', async () => {
      const { execute, isLoading, isSuccess, error } = useDeployVoting()

      await execute('0xOfficerAddress')

      expect(isLoading.value).toBe(false)
      expect(isSuccess.value).toBe(true)
      expect(error.value).toBe(null)
    })
  })
})
