import { ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import TeamContracts from '@/components/sections/ContractManagementView/TeamContracts.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import TeamContractAdmins from '@/components/sections/ContractManagementView/TeamContractAdmins.vue'
import TeamContractsDetail from '@/components/sections/ContractManagementView/TeamContractsDetail.vue'
import TeamContractEventList from '@/components/sections/ContractManagementView/TeamContractEventList.vue'
import { createConfig, http } from '@wagmi/core'
import { mainnet } from '@wagmi/core/chains'
import { createPinia, setActivePinia } from 'pinia'
import { useToastStore } from '@/stores/__mocks__/useToastStore'
import type { TeamContract } from '@/types/teamContract'

createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: http()
  }
})

const getEventsGroupedByCampaignCodeMock = vi.fn().mockResolvedValue({
  status: 'success',
  events: {}
})

vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: object = await importOriginal()

  const writeContractVueMock = vi.fn()

  return {
    ...actual,
    useWriteContract: () => ({
      writeContract: writeContractVueMock,
      isPending: ref(false),
      data: ref(null),
      error: ref(null)
    }),
    useWaitForTransactionReceipt: () => ({
      isLoading: ref(false),
      isSuccess: ref(true),
      isError: ref(false),
      error: ref(null)
    }),
    useReadContract: () => ({
      data: ref(['0xAdmin1']),
      refetch: vi.fn(),
      error: ref(null)
    }),
    useAccount: () => ({ address: ref('0xMockedAddress') }),
    useConfig: () => ({})
  }
})

vi.mock('@wagmi/core', async (importOriginal) => {
  const actual: object = await importOriginal()

  return {
    ...actual,
    writeContract: vi.fn().mockResolvedValue('0xMOCK_TX'),
    readContract: vi.fn().mockResolvedValue(BigInt('1000000000000000000')),
    waitForTransactionReceipt: vi.fn().mockResolvedValue({ status: 'success' }),
    getWalletClient: vi.fn().mockResolvedValue({
      deployContract: vi.fn().mockResolvedValue('0xMOCK_DEPLOYED'),
      account: { address: '0xMOCK_ACCOUNT' }
    }),
    getPublicClient: vi.fn().mockReturnValue({
      getBlockNumber: vi.fn().mockResolvedValue(100n)
    })
  }
})

vi.mock('@/stores/useToastStore')
vi.mock('@/services/AddCampaignService', () => ({
  AddCampaignService: vi.fn().mockImplementation(() => ({
    getContractData: vi.fn().mockResolvedValue([{ key: 'costPerClick', value: '10' }]),
    getEventsGroupedByCampaignCode: getEventsGroupedByCampaignCodeMock
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
  const contracts: TeamContract[] = [
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
  ]

  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    vi.clearAllMocks()
  })

  it('renders and opens modals correctly', async () => {
    const wrapper = mount(TeamContracts, {
      props: { contracts, teamId: 'team1' },
      global: { plugins: [createPinia()] }
    })

    const contractRows = wrapper.findAll('[data-test$="-row"]')
    expect(contractRows.length).toBe(contracts.length)

    const adminButton = wrapper.find('[data-test="open-admin-modal-btn"]')
    const detailButton = wrapper
      .findAll('button.btn-ghost')
      .find((btn) => btn.text().includes('View Details'))
    const eventButton = wrapper
      .findAll('button.btn-ghost')
      .find((btn) => btn.text().includes('View Events'))

    await adminButton?.trigger('click')
    expect(wrapper.findComponent(TeamContractAdmins).exists()).toBe(true)

    await detailButton?.trigger('click')
    await flushPromises()
    expect(wrapper.findComponent(TeamContractsDetail).exists()).toBe(true)

    await eventButton?.trigger('click')
    await flushPromises()
    expect(wrapper.findComponent(TeamContractEventList).exists()).toBe(true)
  })

  it('renders empty contract state properly', () => {
    const wrapper = mount(TeamContracts, {
      props: { contracts: [], teamId: 'team1' },
      global: { plugins: [createPinia()] }
    })

    const emptyRow = wrapper.find('[data-test="empty-state"]')
    expect(emptyRow.exists()).toBe(true)
  })

  it('groups events by campaignCode correctly', () => {
    const wrapper = mount(TeamContracts, {
      props: { contracts, teamId: 'team1' },
      global: { plugins: [createPinia()] }
    })

    const vm = wrapper.vm as unknown as {
      groupEventsByCampaignCode: (events: { campaignCode: string }[]) => Record<string, unknown[]>
    }

    const events = [{ campaignCode: 'A' }, { campaignCode: 'B' }, { campaignCode: 'A' }]
    const grouped = vm.groupEventsByCampaignCode(events)
    expect(grouped['A'].length).toBe(2)
    expect(grouped['B'].length).toBe(1)
  })

  it('opens contract data modal and resets correctly', async () => {
    const wrapper = mount(TeamContracts, {
      props: { contracts, teamId: 'team1' },
      global: { plugins: [createPinia()] }
    })

    const detailBtn = wrapper.findAll('button.btn-ghost')[1]
    await detailBtn.trigger('click')
    await flushPromises()

    const detailModal = wrapper.findComponent(TeamContractsDetail)
    await detailModal.vm.$emit('closeContractDataDialog')
    await wrapper.vm.$nextTick()

    await detailBtn.trigger('click')
    await flushPromises()
    expect(detailModal.exists()).toBe(true)
  })

  it('sets admin modal data via openAdminsModal()', async () => {
    const wrapper = mount(TeamContracts, {
      props: { contracts, teamId: 'team1' },
      global: { plugins: [createPinia()] }
    })

    const vm = wrapper.vm as unknown as {
      openAdminsModal: (c: TeamContract, r: number) => void
      contractAdminDialog: { show: boolean; contract: TeamContract; range: number }
    }

    vm.openAdminsModal(contracts[1], 99)
    await wrapper.vm.$nextTick()

    expect(vm.contractAdminDialog.show).toBe(true)
    expect(vm.contractAdminDialog.contract).toEqual(contracts[1])
    expect(vm.contractAdminDialog.range).toBe(99)
  })

  it('calls addErrorToast when events fail to load', async () => {
    const { addErrorToast } = useToastStore()
    getEventsGroupedByCampaignCodeMock.mockResolvedValueOnce({ status: 'error' })

    const wrapper = mount(TeamContracts, {
      props: { contracts, teamId: 'team1' },
      global: { plugins: [createPinia()] }
    })

    const vm = wrapper.vm as unknown as { openEventsModal: (addr: string) => Promise<void> }
    await vm.openEventsModal('0xBAD')

    expect(addErrorToast).toHaveBeenCalledWith('Failed to fetch events')
  })

  it('shows event modal even if empty list is returned', async () => {
    getEventsGroupedByCampaignCodeMock.mockResolvedValueOnce({ status: 'success', events: {} })

    const wrapper = mount(TeamContracts, {
      props: { contracts, teamId: 'team1' },
      global: { plugins: [createPinia()] }
    })

    const vm = wrapper.vm as unknown as {
      openEventsModal: (addr: string) => Promise<void>
      contractEventsDialog: { show: boolean }
    }

    await vm.openEventsModal('0x000')
    expect(vm.contractEventsDialog.show).toBe(true)
  })

  it('opens all modals and triggers their visibility', async () => {
    const wrapper = mount(TeamContracts, {
      props: { contracts, teamId: 'team1' },
      global: { plugins: [createPinia()] }
    })

    const vm = wrapper.vm as unknown as {
      openAdminsModal: (contract: TeamContract, range: number) => void
      openContractDataModal: (address: string) => Promise<void>
      openEventsModal: (address: string) => Promise<void>
      contractAdminDialog: { show: boolean }
      contractDataDialog: { show: boolean }
      contractEventsDialog: { show: boolean }
    }

    // Admins
    vm.openAdminsModal(contracts[0], 1)
    await wrapper.vm.$nextTick()
    expect(vm.contractAdminDialog.show).toBe(true)

    // Details
    await vm.openContractDataModal(contracts[0].address)
    expect(vm.contractDataDialog.show).toBe(true)

    // Events
    await vm.openEventsModal(contracts[0].address)
    expect(vm.contractEventsDialog.show).toBe(true)
  })

  it('toggles all modal visibility (admin, data, events)', async () => {
    const wrapper = mount(TeamContracts, {
      props: { contracts, teamId: 'team1' },
      global: { plugins: [createPinia()] }
    })

    const vm = wrapper.vm as unknown as {
      contractAdminDialog: { show: boolean }
      contractDataDialog: { show: boolean; key: number }
      contractEventsDialog: { show: boolean }
    }

    vm.contractAdminDialog.show = true
    vm.contractDataDialog.show = true
    vm.contractEventsDialog.show = true
    await wrapper.vm.$nextTick()

    const modalComponents = wrapper.findAllComponents(ModalComponent)
    expect(modalComponents.length).toBeGreaterThanOrEqual(3)

    modalComponents.forEach((modal) => {
      expect(modal.props('modelValue')).toBe(true)
    })
  })

  it('increments contractDataDialog.key when opening contract data modal', async () => {
    const wrapper = mount(TeamContracts, {
      props: { contracts, teamId: 'team1' },
      global: { plugins: [createPinia()] }
    })

    const vm = wrapper.vm as unknown as {
      contractDataDialog: { key: number }
      openContractDataModal: (addr: string) => Promise<void>
    }

    const oldKey = vm.contractDataDialog.key
    await vm.openContractDataModal(contracts[0].address)
    expect(vm.contractDataDialog.key).toBe(oldKey + 1)
  })

  it('opens all modals correctly via user actions', async () => {
    const wrapper = mount(TeamContracts, {
      props: { contracts, teamId: 'team1' },
      global: { plugins: [createPinia()] }
    })

    const buttons = wrapper.findAll('button.btn-ghost')

    // 1. Admins modal
    await buttons[0].trigger('click')
    expect(wrapper.findComponent(TeamContractAdmins).exists()).toBe(true)

    // 2. Details modal
    await buttons[1].trigger('click')
    await flushPromises()
    expect(wrapper.findComponent(TeamContractsDetail).exists()).toBe(true)

    // 3. Events modal
    await buttons[2].trigger('click')
    await flushPromises()
    const modalEvents = wrapper.findComponent({ name: 'TeamContractEventList' })
    expect(modalEvents.exists()).toBe(true)
  })

  it('flattens and assigns events correctly when events are present', async () => {
    getEventsGroupedByCampaignCodeMock.mockResolvedValueOnce({
      status: 'success',
      events: {
        CAMPAIGN1: [
          { campaignCode: 'CAMPAIGN1', eventName: 'E1' },
          { campaignCode: 'CAMPAIGN1', eventName: 'E2' }
        ],
        CAMPAIGN2: [{ campaignCode: 'CAMPAIGN2', eventName: 'E3' }]
      }
    })

    const wrapper = mount(TeamContracts, {
      props: { contracts, teamId: 'team1' },
      global: { plugins: [createPinia()] }
    })

    const vm = wrapper.vm as unknown as {
      openEventsModal: (addr: string) => Promise<void>
      contractEventsDialog: { events: unknown[]; show: boolean }
    }

    await vm.openEventsModal(contracts[0].address)

    expect(vm.contractEventsDialog.events.length).toBe(3)
    expect(vm.contractEventsDialog.show).toBe(true)
  })
})
