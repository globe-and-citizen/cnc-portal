import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useDeployAddCampaignContract } from '@/composables/addCampaign'
//import { AddCampaignService } from '@/services/AddCampaignService'

// Mock AddCampaignService methods for both tests
vi.mock('@/services/AddCampaignService', () => ({
  AddCampaignService: vi.fn().mockImplementation(() => ({
    createAdCampaignManager: vi.fn(),
  })),
}))

describe('useDeployAddCampaignContract', () => {
  //let addCampaignService: any


  beforeEach(() => {
    // Reset the mock implementations before each test
    //addCampaignService = new AddCampaignService()
    vi.clearAllMocks()
  })

//   it('should deploy the contract successfully', async () => {
//     // Ensure that the mocked function returns the expected contract address
//     addCampaignService.createAdCampaignManager.mockResolvedValueOnce('0x123456789abcdef')

//     const { execute, isLoading, isSuccess, error, contractAddress } = useDeployAddCampaignContract()

//     expect(isLoading.value).toBe(false)
//     expect(isSuccess.value).toBe(false)
//     expect(error.value).toBeNull()
//     expect(contractAddress.value).toBeNull()

//     // Call the deploy function with valid parameters
//     await execute('0xbankContract', 0.1, 0.2, '0xdeployerAddress', 'team123')

//     // Expectations after successful deployment
//     expect(isLoading.value).toBe(false)
//     expect(isSuccess.value).toBe(true)
//     expect(contractAddress.value).toBe('0x123456789abcdef') // This line checks the contract address
//     expect(error.value).toBeNull()
//   })

  it('should throw an error for invalid cost values', async () => {
    const { execute, isLoading, error, contractAddress } = useDeployAddCampaignContract()

    await execute('0xbankContract', 0, -1, '0xdeployerAddress', 'team123')

    expect(isLoading.value).toBe(false)
    expect(contractAddress.value).toBeNull()
    expect(error.value).toEqual(new Error('Cost per click and cost per impression must be greater than zero.'))
  })

//   it('should handle service errors', async () => {
//     // Mock rejection for the service
//     addCampaignService.createAdCampaignManager.mockRejectedValueOnce(new Error('Service failed'))

//     const { execute, error } = useDeployAddCampaignContract()

//     await execute('0xbankContract', 0.1, 0.2, '0xdeployerAddress', 'team123')

//     expect(error.value).toEqual(new Error('Service failed'))
//   })

})
