import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import TeamContractAdmins from '@/components/TeamContractAdmins.vue'
import { createPinia, setActivePinia } from 'pinia'
import { type TeamContract } from '@/types/teamContract'
import { useToastStore } from '@/stores/__mocks__/useToastStore'

// Mock AddCampaignService methods
const addAdminMock = vi.fn().mockResolvedValue({ status: 1 })
const removeAdminMock = vi.fn()
const getAdminListMock = vi.fn()
const getEventsGroupedByCampaignCodeMock = vi.fn()
vi.mock('@/stores/useToastStore')
// Mock isAddress from ethers.js
vi.mock('ethers', () => ({
  isAddress: vi.fn().mockReturnValue(true) // Always returns true in tests
}))
vi.mock('@/services/AddCampaignService', () => ({
  AddCampaignService: vi.fn().mockImplementation(() => ({
    addAdmin: addAdminMock,
    getAdminList: getAdminListMock,
    getEventsGroupedByCampaignCode: getEventsGroupedByCampaignCodeMock,
    removeAdmin: removeAdminMock
  }))
}))

describe('TeamContractAdmins', () => {
  const adminsData = ['0x1234567890abcdef', '0xfedcba0987654321']
  const contract: TeamContract = {
    address: '0xcontractaddress',
    admins: adminsData,
    type: 'AddCampaign',
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
    removeAdminMock.mockResolvedValue({ status: 1 })

    // Mock the API call for fetching grouped events
    getEventsGroupedByCampaignCodeMock.mockResolvedValue({})
  })

  it('renders table headers correctly', () => {
    const wrapper = mount(TeamContractAdmins, {
      props: {
        contract
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
        contract
      }
    })

    // Mock initial call count
    expect(getAdminListMock).not.toHaveBeenCalled()

    // Trigger a contract prop change
    const newContract = {
      address: '0xnewcontractaddress',
      admins: [],
      type: 'AddCampaign',
      deployer: '0xdeployeraddress'
    }
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
          type: 'AddCampaign',
          deployer: '0xdeployeraddress'
        } as TeamContract
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
          type: 'AddCampaign',
          deployer: '0xdeployeraddress'
        } as TeamContract
      }
    })

    // Ensure that no rows are rendered
    const rows = wrapper.findAll('tbody tr')
    expect(rows.length).toBe(0)
  })

  it('emits an event when the remove button is clicked', async () => {
    const { addSuccessToast } = useToastStore()
    const wrapper = mount(TeamContractAdmins, {
      props: {
        contract
      }
    })
    // Trigger a contract prop change
    const newContract = {
      address: '0xnewcontractaddress',
      admins: [],
      type: 'AddCampaign',
      deployer: '0xdeployeraddress'
    }
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

  it('adds a new admin correctly', async () => {
    const wrapper = mount(TeamContractAdmins, {
      props: {
        contract
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

    // Check emitted events
    const emittedEvents = wrapper.emitted()

    // Check if 'updateTeamContract' event was emitted
    expect(emittedEvents.updateTeamContract).toBeTruthy()

    // Ensure the event was emitted with the correct payload
    expect(emittedEvents.updateTeamContract[0]).toEqual([
      {
        ...contract,
        admins: [...contract.admins]
      }
    ])
  })

  it('does not add an admin when the input is empty', async () => {
    const addAdminMock = vi.fn().mockResolvedValue({ status: 0 })

    const wrapper = mount(TeamContractAdmins, {
      props: {
        contract
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
