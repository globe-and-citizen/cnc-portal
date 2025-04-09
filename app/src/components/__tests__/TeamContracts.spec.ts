import { flushPromises, mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import TeamContracts from '@/components/TeamContracts.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import TeamContractAdmins from '@/components/TeamContractAdmins.vue'
import TeamContractsDetail from '@/components/TeamContractsDetail.vue'
import { createPinia, setActivePinia } from 'pinia'
import type { TeamContract } from '@/types/teamContract'

const getAdminListMock = vi.fn()
const removeAdminMock = vi.fn()
const getEventsGroupedByCampaignCodeMock = vi.fn()
// Mock AddCampaignService methods
vi.mock('@/services/AddCampaignService', () => ({
  AddCampaignService: vi.fn().mockImplementation(() => ({
    getContractData: vi.fn().mockResolvedValue([{ key: 'costPerClick', value: '10' }]),
    getAdminList: getAdminListMock,
    getEventsGroupedByCampaignCode: getEventsGroupedByCampaignCodeMock,
    removeAdmin: removeAdminMock
  }))
}))

describe.skip('TeamContracts.vue', () => {
  const contracts = [
    {
      type: 'Campaign',
      address: '0x1234567890abcdef1234567890abcdef12345678',
      admins: ['0xadmin1Address', '0xadmin2Address'],
      deployer: '0xdeployer1Address'
    },
    {
      type: 'Campaign',
      address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      admins: ['0xadmin3Address'],
      deployer: '0xdeployer1Address'
    }
  ] as TeamContract[]

  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
  })

  it('renders contract rows correctly', () => {
    const wrapper = mount(TeamContracts, {
      props: { contracts, teamId: 'team1' },
      global: {
        plugins: [createPinia()]
      }
    })

    // Check that the rows match the number of contracts
    const rows = wrapper.findAll('tbody tr')
    expect(rows.length).toBe(contracts.length)

    // Check that each row contains the correct contract data
    rows.forEach((row, index) => {
      const cells = row.findAll('td')

      expect(cells[0].text()).toBe(contracts[index].type)
      expect(cells[1].text()).toBe(contracts[index].address)
    })
  })

  it('opens modal with contract details when a row is clicked', async () => {
    const wrapper = mount(TeamContracts, {
      props: { contracts, teamId: 'team1' },
      global: {
        plugins: [createPinia()]
      }
    })

    // Simulate clicking the first row
    const firstRow = wrapper.find('tbody tr')
    const firstRowCells = firstRow.findAll('td')
    await firstRowCells[4].trigger('click')

    // Check that the modal is visible
    const modal = wrapper.findComponent(ModalComponent)
    expect(modal.exists()).toBe(true)

    // Check that the modal contains the correct contract details
    const detailComponent = wrapper.findComponent({ name: 'TeamContractsDetail' })

    expect(detailComponent.exists()).toBe(true)
    expect(detailComponent.props('datas')).toBeDefined()
  })

  it('renders no rows when there are no contracts', () => {
    const wrapper = mount(TeamContracts, {
      props: { contracts: [], teamId: 'team1' },
      global: {
        plugins: [createPinia()]
      }
    })

    // Check that no rows are rendered
    const rows = wrapper.findAll('tbody tr')
    expect(rows.length).toBe(0)
  })

  it('opens the admins modal when the Admins button is clicked', async () => {
    const wrapper = mount(TeamContracts, {
      props: { contracts, teamId: 'team1' },
      global: {
        plugins: [createPinia()]
      }
    })

    // Simulate clicking the "Admins" button of the first row
    const firstRow = wrapper.find('tbody tr')
    const adminButton = firstRow.find('button.btn-ghost')
    await adminButton.trigger('click')

    // Check that the Admins modal is opened
    const adminModal = wrapper.findComponent({ name: 'TeamContractAdmins' })
    expect(adminModal.exists()).toBe(true)

    // Check that the correct contract was passed to the modal
    expect(adminModal.props('contract')).toEqual(contracts[0])
  })

  it('opens the contract data modal with correct details', async () => {
    const wrapper = mount(TeamContracts, {
      props: { contracts, teamId: 'team1', reset: true },
      global: {
        plugins: [createPinia()]
      }
    })

    // Simulate clicking the "View Details" button
    const firstRow = wrapper.find('tbody tr')
    const detailButton = firstRow.findAll('button.btn-ghost')[1] // Assume second button is for details
    await detailButton.trigger('click')
    await flushPromises()

    // Wait for the contract data to be fetched and modal to update
    await wrapper.vm.$nextTick() // Ensure the modal has re-rendered after async data fetching

    // Find the modal for contract data
    const contractDataModal = wrapper.findComponent({ name: 'TeamContractsDetail' })

    // Check that the contract data was passed to the modal correctly
    expect(contractDataModal.props('datas')).toEqual([{ key: 'costPerClick', value: '10' }])
    //expect(contractDataModal.props('datas')).toEqual([])
  })

  // it('renders polygonscan link correctly', () => {
  //   const wrapper = mount(TeamContracts, {
  //     props: { contracts, teamId: 'team1' },
  //     global: {
  //       plugins: [createPinia()]
  //     }
  //   })

  //   // Check that the polygonscan link for the first contract is rendered correctly
  //   const firstRow = wrapper.find('tbody tr')
  //   const link = firstRow.find('a')

  //   // Ensure the link contains the correct href for Polygonscan based on the contract address
  //   const expectedHref = `https://polygonscan.com/address/${contracts[0].address}`

  //   // Ensure TypeScript understands the link has an href attribute
  //   expect(link.attributes('href')).toBe(expectedHref)

  //   // Check the link text contains the abbreviated contract address
  //   expect(link.text()).toContain(
  //     `${contracts[0].address.slice(0, 6)}...${contracts[0].address.slice(-4)}`
  //   )
  // })

  // it('updates contracts when props.contracts change', async () => {
  //   const wrapper = mount(TeamContracts, {
  //     props: { contracts: contracts, teamId: 'team1' },
  //     global: {
  //       plugins: [createPinia()]
  //     }
  //   })

  //   const newContracts = [
  //     { type: 'Campaign', address: '0xcontract3', admins: ['0xadmin3'], deployer: '0xdeployer3' },
  //     { type: 'Campaign', address: '0xcontract4', admins: ['0xadmin4'], deployer: '0xdeployer4' }
  //   ]

  //   // Verify initial state
  //   expect(wrapper.vm.contracts).toEqual(contracts)

  //   // Update the contracts prop
  //   await wrapper.setProps({ contracts: newContracts })

  //   // Verify that contracts has updated correctly
  //   expect(wrapper.vm.contracts).toEqual(newContracts)
  // })

  it('renders modals correctly based on dialog states', async () => {
    const wrapper = mount(TeamContracts, {
      props: { contracts, teamId: 'team1' },
      global: {
        plugins: [createPinia()],
        components: {
          ModalComponent,
          TeamContractAdmins,
          TeamContractsDetail
        }
      }
    })

    // Verify that the initial dialog states are false
    const contractAdminDialog = (
      wrapper.vm as unknown as {
        contractAdminDialog: {
          show: boolean
          contract: { type: string; address: string; admins: string[]; deployer: string } | null
        }
      }
    ).contractAdminDialog

    const contractDataDialog = (
      wrapper.vm as unknown as {
        contractDataDialog: { show: boolean; datas: Array<{ key: string; value: string }> | null }
      }
    ).contractDataDialog

    expect(contractAdminDialog.show).toBe(false)
    expect(contractDataDialog.show).toBe(false)

    // Check if the ModalComponent is rendered but hidden
    const adminModal = wrapper.findComponent(ModalComponent)
    expect(adminModal.exists()).toBe(true)
    expect(adminModal.props('modelValue')).toBe(false) // Modal should be closed

    // Open the contract admin dialog
    contractAdminDialog.show = true
    contractAdminDialog.contract = contracts[0] // Set the contract data
    await wrapper.vm.$nextTick() // Wait for the DOM to update

    // Check that the contract admin modal is rendered
    expect(adminModal.props('modelValue')).toBe(true) // Check that the modal is open
    expect(wrapper.findComponent(TeamContractAdmins).props('contract')).toEqual(contracts[0])

    // Open the contract data dialog
    contractDataDialog.show = true
    contractDataDialog.datas = [{ key: 'Address', value: contracts[0].address }] // Set the data for the contract
    await wrapper.vm.$nextTick() // Wait for the DOM to update

    // Check that the contract data modal is rendered
    const dataModals = wrapper.findAllComponents(ModalComponent) // Get all ModalComponents
    const dataModal = dataModals.length > 1 ? dataModals.at(1) : undefined // Safely access the second ModalComponent

    // Ensure dataModal exists before making assertions
    if (dataModal) {
      expect(dataModal.props('modelValue')).toBe(true) // Check that the modal is open
      expect(wrapper.findComponent(TeamContractsDetail).props('datas')).toEqual(
        contractDataDialog.datas
      )
    } else {
      throw new Error('Data modal is not rendered as expected.')
    }
  })
})
