import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import TeamContracts from '@/components/TeamContracts.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import TeamContractAdmins from '@/components/TeamContractAdmins.vue'
import TeamContractsDetail from '@/components/TeamContractsDetail.vue'

// Mock AddCampaignService methods
vi.mock('@/services/AddCampaignService', () => ({
  AddCampaignService: vi.fn().mockImplementation(() => ({
    getContractData: vi.fn().mockResolvedValue([{ key: 'costPerClick', value: '10' }]),
  })),
}))

describe('TeamContracts.vue', () => {
  const contracts = [
    {
      type: 'Campaign',
      address: '0x1234567890abcdef1234567890abcdef12345678',
      admins: ['admin1', 'admin2'],
    },
    {
      type: 'Campaign',
      address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      admins: ['admin3'],
    },
  ]

  it('renders contract rows correctly', () => {
    const wrapper = mount(TeamContracts, {
      props: { contracts }
    })

    // Check that the rows match the number of contracts
    const rows = wrapper.findAll('tbody tr')
    expect(rows.length).toBe(contracts.length)

    // Check that the content of the first row is correct
    const firstRow = rows[0]
    expect(firstRow.text()).toContain(contracts[0].type)
    expect(firstRow.text()).toContain(contracts[0].address.slice(0, 6) + '...' + contracts[0].address.slice(-4))
  })

  it('opens the admin modal with correct admins on button click', async () => {
    const wrapper = mount(TeamContracts, {
      props: { contracts }
    })

    // Click the button to open admin modal for the first contract
    const adminButton = wrapper.findAll('.btn-ghost')[0]
    await adminButton.trigger('click')

    // Assert that the modal is shown and has correct admins
    expect(wrapper.findComponent(ModalComponent).exists()).toBe(true)
    const modalAdminList = wrapper.findComponent(TeamContractAdmins)
    expect(modalAdminList.exists()).toBe(true)
    expect(modalAdminList.props().admins).toEqual(contracts[0].admins)
  })

  it('opens the contract data modal with correct data on button click', async () => {
    const wrapper = mount(TeamContracts, {
      props: { contracts }
    })

    // Click the button to open contract data modal
    const detailsButton = wrapper.findAll('.btn-ghost')[1]
    await detailsButton.trigger('click')

    // Assert that the contract data modal is shown and has correct data
    expect(wrapper.findComponent(ModalComponent).exists()).toBe(true)
    const contractDataList = wrapper.findComponent(TeamContractsDetail)
    expect(contractDataList.exists()).toBe(true)

    // Mocked data from AddCampaignService
    expect(contractDataList.props().datas).toEqual([{ key: 'costPerClick', value: '10' }])
  })
})
