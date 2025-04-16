import { flushPromises, mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import TeamContracts from '@/components/TeamContracts.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import TeamContractAdmins from '@/components/TeamContractAdmins.vue'
import TeamContractsDetail from '@/components/TeamContractsDetail.vue'
import type { TeamContract } from '@/types/teamContract'
import { useToastStore } from '@/stores/useToastStore'
import { ref } from 'vue'
import { createTestingPinia } from '@pinia/testing'

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
vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useWriteContract: vi.fn(() => ({
      writeContract: vi.fn(),
      hash: ref(null),
      isPending: ref(false),
      error: ref(null)
    })),
    useWaitForTransactionReceipt: vi.fn(() => ({
      isLoading: ref(false),
      isSuccess: ref(false)
    })),
    useReadContract: vi.fn(() => ({
      data: ref(null),
      isLoading: ref(false),
      isSuccess: ref(false)
    }))
  }
})

describe('TeamContracts.vue', () => {
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

  it.skip('renders contract rows correctly', () => {
    const wrapper = mount(TeamContracts, {
      props: { contracts, teamId: 'team1' },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })

    // Check that the rows match the number of contracts
    const rows = wrapper.findAll('tr').filter((row) => !row.element.closest('thead'))
    expect(rows.length).toBe(contracts.length)

    // Check that each row contains the correct contract data
    rows.forEach((row, index) => {
      const cells = row.findAll('td')
      expect(cells[1].text()).toBe(contracts[index].type)
      expect(cells[2].text()).toContain(contracts[index].address)
    })
  })

  it.skip('renders no rows when there are no contracts', () => {
    const wrapper = mount(TeamContracts, {
      props: { contracts: [], teamId: 'team1' },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })

    const rows = wrapper.findAll('tr').filter((row) => !row.element.closest('thead'))
    expect(rows.length).toBe(0)
  })

  it('opens the contract data modal with correct details', async () => {
    const wrapper = mount(TeamContracts, {
      props: { contracts, teamId: 'team1', reset: true },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })

    const firstRow = wrapper.findAll('tr').filter((row) => !row.element.closest('thead'))[0]
    const detailButton = firstRow.find('button:not([disabled])')
    await detailButton.trigger('click')
    await flushPromises()

    const contractDataModal = wrapper.findComponent({ name: 'TeamContractsDetail' })
    expect(contractDataModal.exists()).toBe(true)
  })

  it('opens events modal and displays events when View Events button is clicked', async () => {
    // Mock successful events response
    getEventsGroupedByCampaignCodeMock.mockResolvedValueOnce({
      status: 'success',
      events: {
        'CAMPAIGN-001': [
          { campaignCode: 'CAMPAIGN-001', eventType: 'CampaignCreated', data: {} },
          { campaignCode: 'CAMPAIGN-001', eventType: 'CampaignUpdated', data: {} }
        ]
      }
    })

    const wrapper = mount(TeamContracts, {
      props: { contracts, teamId: 'team1' },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })

    // Find and click the View Events button in the first row
    const firstRow = wrapper.findAll('tr').filter((row) => !row.element.closest('thead'))[0]
    const eventsButton = firstRow
      .findAll('button')
      .find((btn) => btn.text().includes('View Events'))
    await eventsButton?.trigger('click')
    await flushPromises()

    // Verify the events modal is shown
    const eventModals = wrapper.findAllComponents(ModalComponent)
    const eventModal = eventModals.find((modal) => modal.find('h3').text() === 'Contract Events')
    expect(eventModal?.exists()).toBe(true)

    // Verify the events list component is rendered with correct props
    const eventList = wrapper.findComponent({ name: 'TeamContractEventList' })
    expect(eventList.exists()).toBe(true)
    expect(eventList.props('eventsByCampaignCode')).toEqual({
      'CAMPAIGN-001': [
        { campaignCode: 'CAMPAIGN-001', eventType: 'CampaignCreated', data: {} },
        { campaignCode: 'CAMPAIGN-001', eventType: 'CampaignUpdated', data: {} }
      ]
    })
  })

  it.skip('shows error toast when no events are found', async () => {
    // Mock response with no events
    getEventsGroupedByCampaignCodeMock.mockResolvedValueOnce({
      status: 'success',
      events: {}
    })

    const toastStore = useToastStore()
    const addErrorToastSpy = vi.spyOn(toastStore, 'addErrorToast')

    const wrapper = mount(TeamContracts, {
      props: { contracts, teamId: 'team1' },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })

    // Find and click the View Events button
    const firstRow = wrapper.findAll('tr').filter((row) => !row.element.closest('thead'))[0]
    const eventsButton = firstRow
      .findAll('button')
      .find((btn) => btn.text().includes('View Events'))
    await eventsButton?.trigger('click')
    await flushPromises()

    // Verify error toast was shown
    expect(addErrorToastSpy).toHaveBeenCalledWith('No events found')
  })

  it('opens modal with contract details when a row is clicked', async () => {
    const wrapper = mount(TeamContracts, {
      props: { contracts, teamId: 'team1' },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
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

  it('opens the admins modal when the Admins button is clicked', async () => {
    const wrapper = mount(TeamContracts, {
      props: { contracts, teamId: 'team1' },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
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

  it('renders modals correctly based on dialog states', async () => {
    const wrapper = mount(TeamContracts, {
      props: { contracts, teamId: 'team1' },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
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
