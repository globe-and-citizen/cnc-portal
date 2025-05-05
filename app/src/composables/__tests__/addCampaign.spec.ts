import { describe, it, expect, vi } from 'vitest'
import { useDeployAddCampaignContract } from '@/composables/addCampaign'
import { AddCampaignService } from '@/services/AddCampaignService'

// We will mock AddCampaignService only within each test case

describe('useDeployAddCampaignContract', () => {
  it('should successfully deploy a contract with valid inputs', async () => {
    // Mock the AddCampaignService for this test case
    const mockAddCampaignService = {
      createAdCampaignManager: vi.fn().mockResolvedValue('0xMockedAddress')
    }
    vi.spyOn(AddCampaignService.prototype, 'createAdCampaignManager').mockImplementation(
      mockAddCampaignService.createAdCampaignManager
    )

    const { execute, isLoading, isSuccess, error, contractAddress } = useDeployAddCampaignContract()

    await execute('0xBankContract', 0.01, 0.02, '0xDeployer', 'team123')

    // Verify loading state
    expect(isLoading.value).toBe(false)
    // Ensure the contract address is set correctly
    expect(contractAddress.value).toBe('0xMockedAddress')
    // Verify success state
    expect(isSuccess.value).toBe(true)
    // Verify no error is present
    expect(error.value).toBe(undefined)
    // Verify the service method was called with correct parameters
    expect(mockAddCampaignService.createAdCampaignManager).toHaveBeenCalledWith(
      '0xBankContract',
      '0.01',
      '0.02',
      '0xDeployer',
      'team123'
    )
  })

  it('should throw error when cost per click or cost per impression are invalid', async () => {
    const { execute, isLoading, isSuccess, error, contractAddress } = useDeployAddCampaignContract()

    await execute('0xBankContract', 0, 0, '0xDeployer', 'team123')

    // Verify loading state is false
    expect(isLoading.value).toBe(false)
    // Verify contract address is not set
    expect(contractAddress.value).toBe(null)
    // Verify success state is false
    expect(isSuccess.value).toBe(false)
    // Verify the error message
    expect(error.value.message).toBe(
      'Cost per click and cost per impression must be greater than zero.'
    )
  })

  it('should handle service failure and set error', async () => {
    // Mock the AddCampaignService for this test case
    const mockError = new Error('Failed to deploy contract')
    const mockAddCampaignService = {
      createAdCampaignManager: vi.fn().mockRejectedValue(mockError)
    }
    vi.spyOn(AddCampaignService.prototype, 'createAdCampaignManager').mockImplementation(
      mockAddCampaignService.createAdCampaignManager
    )

    const { execute, isLoading, isSuccess, error, contractAddress } = useDeployAddCampaignContract()

    await execute('0xBankContract', 0.01, 0.02, '0xDeployer', 'team123')

    // Verify loading state
    expect(isLoading.value).toBe(false)
    // Verify contract address is not set
    expect(contractAddress.value).toBe(null)
    // Verify success state is false
    expect(isSuccess.value).toBe(false)
    // Verify the error message is set
    expect(error.value).toBe(mockError)
    // Ensure the service method was called
    expect(mockAddCampaignService.createAdCampaignManager).toHaveBeenCalled()
  })
})
