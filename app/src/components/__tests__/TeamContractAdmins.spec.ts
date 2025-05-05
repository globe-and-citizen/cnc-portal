import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import TeamContractAdmins from '@/components/TeamContractAdmins.vue'
import { createPinia, setActivePinia } from 'pinia'
import { type TeamContract } from '@/types/teamContract'
import { useToastStore } from '@/stores/__mocks__/useToastStore'

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

describe.skip('TeamContractAdmins', () => {
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

  it('renders the admin data correctly', async () => {
    const wrapper = mount(TeamContractAdmins, {
      props: {
        contract,
        range: 1
      }
    })

    // Mock initial call count
    expect(getAdminListMock).not.toHaveBeenCalled()

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

    expect(getAdminListMock).toHaveBeenCalled()

    // Check number of rows for admins
    const rows = wrapper.findAll('tbody tr')
    expect(rows.length).toBe(adminsData.length)

    // Check first admin row
    expect(rows[0].find('th').text()).toBe('1') // Index
    expect(rows[0].findAll('td')[0].text()).toBe(adminsData[0]) // First admin address
    expect(rows[0].findAll('td')[1].find('button').exists()).toBe(true) // Remove button exists

    // Check second admin row
    expect(rows[1].find('th').text()).toBe('2') // Index
    expect(rows[1].findAll('td')[0].text()).toBe(adminsData[1]) // Second admin address
    expect(rows[1].findAll('td')[1].find('button').exists()).toBe(true) // Remove button exists
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
    expect(rows.length).toBe(0)
  })

  it('renders no rows when data is null', () => {
    const wrapper = mount(TeamContractAdmins, {
      props: {
        contract: {
          address: '0xcontractaddress',
          admins: null as unknown as string[],
          type: 'Campaign',
          deployer: '0xdeployeraddress'
        } as TeamContract,
        range: 1
      }
    })

    // Ensure that no rows are rendered
    const rows = wrapper.findAll('tbody tr')
    expect(rows.length).toBe(0)
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
    expect(addAdminMock).toHaveBeenCalledWith(contract.address, newAdminAddress)
  })

  it('emits an event when the remove button is clicked', async () => {
    getAdminListMock.mockResolvedValueOnce(adminsData)
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
    expect(getAdminListMock).toHaveBeenCalled()
    // Mock the console.log function

    // Simulate clicking the remove button on the first row
    const firstRow = wrapper.find('tbody tr')

    const removeButton = firstRow.find('button')
    await removeButton.trigger('click')
    expect(removeAdminMock).toHaveBeenCalled()

    // Check that the console.log was called with the correct admin address

    expect(addSuccessToast).toHaveBeenCalledWith('Admin removed successfully')

    // Restore the original console.log function
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
