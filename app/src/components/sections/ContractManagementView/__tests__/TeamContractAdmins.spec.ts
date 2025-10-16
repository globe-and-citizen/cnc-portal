import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import TeamContractAdmins from '@/components/sections/ContractManagementView/TeamContractAdmins.vue'
import { createPinia, setActivePinia } from 'pinia'
import { type TeamContract } from '@/types/teamContract'
import { useToastStore } from '@/stores/__mocks__/useToastStore'
import { createConfig, http } from '@wagmi/core'
import { mainnet } from '@wagmi/core/chains'
import { AD_CAMPAIGN_MANAGER_ABI } from '@/artifacts/abi/ad-campaign-manager'
import { type Abi } from 'viem'

createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: http()
  }
})

const receiptState = {
  data: ref({ contractAddress: '0xDEADBEEF' }),
  isSuccess: ref(false),
  isLoading: ref(true)
}
const mocks = vi.hoisted(() => {
  return {
    mockWrite: vi.fn(),
    deployMock: vi.fn(),
    mockUseDeployContract: vi.fn().mockImplementation(() => ({
      deploy: mocks.deployMock,
      isDeploying: ref(false),
      contractAddress: ref(null),
      error: ref(null)
    })),
    mockUseReadContract: vi.fn().mockImplementation(() => ({
      data: ref(null),
      refetch: vi.fn(),
      error: ref(null)
    })),
    mockUseWaitForTransactionReceipt: vi.fn().mockImplementation(() => receiptState),
    mockUseWriteContract: vi.fn().mockImplementation(() => ({
      writeContract: mocks.mockWrite,
      error: ref<unknown>(null),
      isPending: ref(false),
      data: ref(null)
    }))
  }
})

vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: object = await importOriginal()

  return {
    ...actual,
    useWriteContract: mocks.mockUseWriteContract,
    useWaitForTransactionReceipt: mocks.mockUseWaitForTransactionReceipt,
    useReadContract: mocks.mockUseReadContract,
    useAccount: () => ({ address: ref('0xMockedAddress') }),
    useConfig: () => ({})
  }
})

// Mock AddCampaignService methods
const addAdminMock = vi.fn().mockResolvedValue({ status: 'success' })
const removeAdminMock = vi.fn()
const getAdminListMock = vi.fn()
const getEventsGroupedByCampaignCodeMock = vi.fn()
vi.mock('@/stores/useToastStore')
vi.mock('@/services/AddCampaignService', () => ({
  AddCampaignService: vi.fn().mockImplementation(() => ({
    addAdmin: addAdminMock,
    getAdminList: getAdminListMock,
    getEventsGroupedByCampaignCode: getEventsGroupedByCampaignCodeMock,
    removeAdmin: removeAdminMock
  }))
}))

describe('TeamContractAdmins', () => {
  const adminsData = ['0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', '0xfedcba0987654321']
  const contract: TeamContract = {
    address: '0xcontractaddress',
    admins: adminsData,
    type: 'Campaign',
    deployer: '0xdeployeraddress'
  }

  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)

    addAdminMock.mockClear() // Reset mock before each test
    getAdminListMock.mockClear()
    removeAdminMock.mockClear()
    getEventsGroupedByCampaignCodeMock.mockClear()

    // Mock the API call for fetching admins
    getAdminListMock.mockResolvedValue(adminsData)
    removeAdminMock.mockResolvedValue({ status: 'success' })
    vi.clearAllMocks()
    // Mock the API call for fetching grouped events
    getEventsGroupedByCampaignCodeMock.mockResolvedValue({})
  })

  it('renders table headers correctly', () => {
    const wrapper = mount(TeamContractAdmins, {
      props: {
        contract,
        range: 1
      }
    })

    // Check table headers
    const headers = wrapper.findAll('th')
    expect(headers[0].text()).toBe('#')
    expect(headers[1].text()).toBe('Admin Address')
    expect(headers[2].text()).toBe('Action')
  })
  it('renders no rows when no data is passed', () => {
    const wrapper = mount(TeamContractAdmins, {
      props: {
        contract: {
          address: '0xcontractaddress',
          admins: [] as string[],
          type: 'Campaign',
          deployer: '0xdeployeraddress'
        } as TeamContract,
        range: 1
      }
    })

    // Ensure that no rows are rendered
    const rows = wrapper.findAll('tbody tr')
    expect(rows.length).toBe(1)
    expect(rows[0].text()).toContain('No data available')
  })

  it('renders the admin data correctly', async () => {
    mocks.mockUseReadContract.mockImplementation(() => ({
      data: ref(adminsData),
      refetch: vi.fn().mockResolvedValue({ data: ref(['0xcontractaddress']) }),
      error: ref(null)
    }))
    // Clear all mocks to ensure no interference with subsequent tests
    await flushPromises()
    const wrapper = mount(TeamContractAdmins, {
      props: {
        contract,
        range: 1
      }
    })
    await flushPromises()

    // Mock initial call count
    expect(mocks.mockUseReadContract).toHaveBeenCalled()

    // Trigger a contract prop change
    const newContract = {
      address: '0xnewcontractaddress',
      admins: [],
      type: 'Campaign',
      deployer: '0xdeployeraddress'
    } as TeamContract
    await wrapper.setProps({ contract: newContract })
    await flushPromises()
    // Debugging logs

    expect(mocks.mockUseReadContract).toHaveBeenCalled()

    // Check number of rows for admins
    const rows = wrapper.findAll('tbody tr')

    expect(rows.length).toBe(2)

    // First row
    const firstRowTds = rows[0].findAll('td')
    expect(firstRowTds[0]?.text()).toBe('1') // Index
    expect(firstRowTds[1]?.text()).toContain(adminsData[0]) // Address inside tooltip span
    expect(firstRowTds[2]?.find('button')?.exists()).toBe(true) // Button exists

    // Second row
    const secondRowTds = rows[1].findAll('td')
    expect(secondRowTds[0]?.text()).toBe('2')
    expect(secondRowTds[1]?.text()).toContain(adminsData[1])
    expect(secondRowTds[2]?.find('button')?.exists()).toBe(true)
  })

  it('adds a new admin correctly', async () => {
    const wrapper = mount(TeamContractAdmins, {
      props: {
        contract,
        range: 1
      }
    })

    // Set the new admin address
    const newAdminAddress = '0xE55978c9f7B9bFc190B355d65e7F1dEc2F41D320'

    // Find input and set value for new admin
    const input = wrapper.find('input')
    await input.setValue(newAdminAddress)

    // Ensure input value is set correctly
    expect(input.element.value).toBe(newAdminAddress)

    // Ensure input value is set correctly
    expect(input.element.value).toBe(newAdminAddress)

    // Simulate form submission (this should trigger addAdmin)
    const addButton = wrapper.find('form')
    await addButton.trigger('submit.prevent') // Use form trigger instead of button

    // Wait for the async addAdmin function to complete
    await wrapper.vm.$nextTick() // Ensure all promises are resolved
    // Check if addAdmin method was called with correct arguments

    expect(mocks.mockWrite).toHaveBeenCalledWith({
      address: contract.address,
      abi: AD_CAMPAIGN_MANAGER_ABI,
      functionName: 'addAdmin',
      args: [newAdminAddress]
    })
  })

  it('emits an event when the remove button is clicked', async () => {
    mocks.mockUseReadContract.mockImplementation(() => ({
      data: ref(adminsData),
      refetch: vi.fn().mockResolvedValue({ data: ref(adminsData) }),
      error: ref(null)
    }))
    const { addSuccessToast } = useToastStore()
    const wrapper = mount(TeamContractAdmins, {
      props: {
        contract,
        range: 1
      }
    })
    // Trigger a contract prop change
    const newContract = {
      address: '0xnewcontractaddress',
      admins: [],
      type: 'Campaign',
      deployer: '0xdeployeraddress'
    } as TeamContract
    await wrapper.setProps({ contract: newContract })
    // Mock initial call count
    await flushPromises()
    expect(mocks.mockUseReadContract).toHaveBeenCalled()
    // expect(mocks.mockUseReadContract).toHaveBeenCalledWith({
    //   address: contract.address,
    //   abi: campaignAbi,
    //   functionName: 'getAdminList',
    //   args: []
    // })
    // Mock the console.log function

    // Simulate clicking the remove button on the first row
    const rows = wrapper.findAll('tbody tr')
    const firstRowTds = rows[0].findAll('td')
    const removeButton = firstRowTds[2].find('button')
    await removeButton.trigger('click')

    expect(mocks.mockWrite).toHaveBeenCalledWith({
      address: newContract.address,
      abi: AD_CAMPAIGN_MANAGER_ABI,
      functionName: 'removeAdmin',
      args: [firstRowTds[1].text()]
    })

    // Check that the console.log was called with the correct admin address
    await flushPromises()

    receiptState.isLoading.value = true
    receiptState.isSuccess.value = false
    await flushPromises()

    receiptState.isLoading.value = false
    receiptState.isSuccess.value = true
    await flushPromises()
    expect(addSuccessToast).toHaveBeenCalledWith('Admin removed successfully')
  })

  it('does not add an admin when the input is empty', async () => {
    const addAdminMock = vi.fn().mockResolvedValue({ status: 0 })

    const wrapper = mount(TeamContractAdmins, {
      props: {
        contract,
        range: 1
      }
    })

    // Find input and set value for new admin
    const input = wrapper.find('input')
    await input.setValue('')

    // Simulate form submission (this should trigger addAdmin)
    const addButton = wrapper.find('form')
    await addButton.trigger('submit.prevent') // Use form trigger instead of button

    // Wait for the async addAdmin function to complete
    await wrapper.vm.$nextTick() // Ensure all promises are resolved

    // Check if addAdmin method was not called
    expect(addAdminMock).not.toHaveBeenCalled()
  })
})
