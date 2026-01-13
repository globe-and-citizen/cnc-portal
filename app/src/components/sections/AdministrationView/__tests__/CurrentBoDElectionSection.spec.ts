// ElectionComponent.test.ts
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ElectionComponent from '@/components/sections/AdministrationView/CurrentBoDElectionSection.vue'
import CardComponent from '@/components/CardComponent.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import ElectionStatus from '@/components/sections/AdministrationView/ElectionStatus.vue'
import ElectionStats from '@/components/sections/AdministrationView/ElectionStats.vue'
import ElectionActions from '@/components/sections/AdministrationView/ElectionActions.vue'
import CurrentBoDElection404 from '../CurrentBoDElection404.vue'
import { simulateContract, writeContract, waitForTransactionReceipt } from '@wagmi/core'

// Mock dependencies
vi.mock('@/stores', () => ({
  useTeamStore: () => ({
    currentTeamId: 1,
    currentTeam: {
      members: [{ address: '0x123' }, { address: '0x456' }]
    }
  }),
  useToastStore: () => ({
    addSuccessToast: vi.fn(),
    addErrorToast: vi.fn()
  })
}))

const { useBoDElections: mockUseBoDElectionsImpl, useCustomFetch: mockUseCustomFetchImpl } =
  vi.hoisted(() => ({
    useBoDElections: vi.fn(() => ({
      electionsAddress: { value: '0x789' },
      formattedElection: { value: null }
    })),
    useCustomFetch: vi.fn((/* url, options */) => {
      const execute = vi.fn().mockResolvedValue({})
      const error = { value: null }

      // Create an object that matches the chaining pattern
      const mockInstance = {
        data: { value: null },
        isFetching: { value: false },
        error,
        execute,
        post: () => mockInstance,
        json: () => mockInstance
      }

      return mockInstance
    })
  }))

vi.mock('@/composables', () => ({
  useBoDElections: mockUseBoDElectionsImpl,
  useCustomFetch: mockUseCustomFetchImpl
}))

vi.mock('@wagmi/core', () => ({
  simulateContract: vi.fn(),
  writeContract: vi.fn(),
  waitForTransactionReceipt: vi.fn()
}))

vi.mock('@/wagmi.config', () => ({
  config: {}
}))

vi.mock('@/utils', () => ({
  log: {
    error: vi.fn()
  },
  parseError: vi.fn((error) => error.message)
}))

describe('ElectionComponent', () => {
  let wrapper: ReturnType<typeof mount> | undefined
  let mockUseBoDElections: Mock<
    () => { electionsAddress: { value: string }; formattedElection: { value: null } }
  >
  // let mockUseCustomFetch

  beforeEach(() => {
    setActivePinia(createPinia())

    // Reset mocks
    vi.clearAllMocks()

    mockUseBoDElections = mockUseBoDElectionsImpl

    // Default mock implementations
    mockUseBoDElections.mockReturnValue({
      electionsAddress: { value: '0x789' },
      formattedElection: { value: null }
    })

    // mockUseCustomFetch.mockReturnValue({
    //   error: { value: null },
    //   execute: vi.fn().mockResolvedValue({})
    // })

    // vi.mocked(useToastStore).mockImplementation(() => mockToastStore)
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  const createWrapper = (props = {}) => {
    return mount(ElectionComponent, {
      props: {
        electionId: 123n,
        isDetails: false,
        ...props
      },
      global: {
        stubs: {
          // CardComponent: true,
          ModalComponent: true,
          CreateElectionForm: true,
          ElectionStatus: true,
          ElectionStats: true,
          ElectionActions: true,
          CurrentBoDElection404: true
        }
      }
    })
  }

  describe('Rendering', () => {
    it('renders CardComponent with correct title', () => {
      wrapper = createWrapper()
      const card = wrapper.findComponent(CardComponent)
      expect(card.exists()).toBe(true)
      expect(card.props('title')).toBe('Current Election')
    })

    it('renders "Past Election" title when isDetails is true', () => {
      wrapper = createWrapper({ isDetails: true })
      const card = wrapper.findComponent(CardComponent)
      expect(card.props('title')).toBe('Past Election')
    })

    it('renders ElectionActions when not in details mode', () => {
      wrapper = createWrapper({ isDetails: false })
      const card = wrapper.findComponent(CardComponent)
      expect(card.exists()).toBe(true)
      // expect(card.find('[data-test="actions-slot"]').exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'ElectionActions' }).exists()).toBe(true)
    })

    it('does not render ElectionActions when in details mode', () => {
      wrapper = createWrapper({ isDetails: true })
      expect(wrapper.findComponent(ElectionActions).exists()).toBe(false)
    })

    it('renders ElectionStatus when formattedElection exists and results not published', async () => {
      mockUseBoDElections.mockReturnValue({
        electionsAddress: { value: '0x789' },
        formattedElection: {
          value: {
            title: 'Test Election',
            description: 'Test Description',
            resultsPublished: false
          }
        }
      })

      wrapper = createWrapper()
      await flushPromises()

      expect(wrapper.findComponent(ElectionStatus).exists()).toBe(true)
    })

    it('renders election content when formattedElection exists', async () => {
      const mockElection = {
        title: 'Test Election',
        description: 'Test Description',
        resultsPublished: false
      }

      mockUseBoDElections.mockReturnValue({
        electionsAddress: '0x789',
        formattedElection: mockElection
      })

      wrapper = createWrapper()
      await flushPromises()

      console.log('formattedElection: ', wrapper.vm.formattedElection)

      expect(wrapper.find('h2').text()).toBe('Test Election')
      expect(wrapper.find('h4').text()).toBe('Test Description')
      expect(wrapper.findComponent(ElectionStats).exists()).toBe(true)
    })

    it('renders CurrentBoDElection404 when no formattedElection exists', async () => {
      mockUseBoDElections.mockReturnValue({
        electionsAddress: '0x789',
        formattedElection: null
      })

      wrapper = createWrapper()
      await flushPromises()

      expect(wrapper.findComponent(CurrentBoDElection404).exists()).toBe(true)
    })

    it('renders CurrentBoDElection404 when results are published and not in details mode', async () => {
      mockUseBoDElections.mockReturnValue({
        electionsAddress: '0x789',
        formattedElection: {
          title: 'Test Election',
          description: 'Test Description',
          resultsPublished: true
        }
      })

      wrapper = createWrapper({ isDetails: false })
      await flushPromises()

      expect(wrapper.findComponent(CurrentBoDElection404).exists()).toBe(true)
    })
  })

  describe('Modal functionality', () => {
    it('does not mount ModalComponent initially', () => {
      wrapper = createWrapper()
      expect(wrapper.findComponent(ModalComponent).exists()).toBe(false)
    })

    // it('mounts ModalComponent when showCreateElectionModal.mount is true', async () => {
    //   wrapper = createWrapper()

    //   // Trigger modal opening (simulating ElectionActions event)
    //   await wrapper.setData({
    //     showCreateElectionModal: { mount: true, show: true }
    //   })

    //   expect(wrapper.findComponent(ModalComponent).exists()).toBe(true)
    //   expect(wrapper.findComponent(CreateElectionForm).exists()).toBe(true)
    // })

    // it('closes modal when CreateElectionForm emits close-modal', async () => {
    //   wrapper = createWrapper()

    //   // Open modal
    //   await wrapper.setData({
    //     showCreateElectionModal: { mount: true, show: true }
    //   })

    //   // Close via form event
    //   await wrapper.findComponent(CreateElectionForm).vm.$emit('close-modal')

    //   expect(wrapper.vm.showCreateElectionModal).toEqual({
    //     mount: false,
    //     show: false
    //   })
    // })

    // it('resets modal when ModalComponent emits reset', async () => {
    //   wrapper = createWrapper()

    //   // Open modal
    //   await wrapper.setData({
    //     showCreateElectionModal: { mount: true, show: true }
    //   })

    //   // Close via modal event
    //   await wrapper.findComponent(ModalComponent).vm.$emit('reset')

    //   expect(wrapper.vm.showCreateElectionModal).toEqual({
    //     mount: false,
    //     show: false
    //   })
    // })
  })

  describe('createElection function', () => {
    const mockElectionData = {
      title: 'New Election',
      description: 'Description',
      startDate: new Date(Date.now() + 86400000), // Tomorrow
      endDate: new Date(Date.now() + 172800000), // Day after tomorrow
      winnerCount: 3,
      candidates: [{ candidateAddress: '0xABC' }, { candidateAddress: '0xDEF' }]
    }

    beforeEach(() => {
      vi.mocked(simulateContract).mockResolvedValue({})
      vi.mocked(writeContract).mockResolvedValue('0xTXNHASH')
      vi.mocked(waitForTransactionReceipt).mockResolvedValue({})
    })

    // it('successfully creates an election', async () => {
    //   wrapper = createWrapper()

    //   await wrapper.vm.createElection(mockElectionData)

    //   expect(simulateContract).toHaveBeenCalledWith(config, {
    //     address: '0x789',
    //     abi: expect.any(Array),
    //     functionName: 'createElection',
    //     args: expect.any(Array)
    //   })

    //   expect(writeContract).toHaveBeenCalled()
    //   expect(waitForTransactionReceipt).toHaveBeenCalled()
    //   expect(mockToastStore.addSuccessToast).toHaveBeenCalledWith('Election created successfully!')

    //   // Modal should be closed
    //   expect(wrapper.vm.showCreateElectionModal).toEqual({
    //     mount: false,
    //     show: false
    //   })
    // })

    // it('handles missing elections address', async () => {
    //   mockUseBoDElections.mockReturnValue({
    //     electionsAddress: { value: null },
    //     formattedElection: { value: null }
    //   })

    //   wrapper = createWrapper()

    //   await wrapper.vm.createElection(mockElectionData)

    //   expect(mockToastStore.addErrorToast).toHaveBeenCalledWith('Elections contract address not found')
    //   expect(simulateContract).not.toHaveBeenCalled()
    // })

    it('handles past start date by adjusting to future', async () => {
      wrapper = createWrapper()

      const pastDate = new Date(Date.now() - 86400000) // Yesterday
      const mockPastElectionData = {
        ...mockElectionData,
        startDate: pastDate,
        endDate: new Date(Date.now() - 43200000) // 12 hours ago
      }

      await wrapper.vm.createElection(mockPastElectionData)

      const args = vi.mocked(simulateContract).mock.calls[0][1].args
      const startTime = args[2]
      const endTime = args[3]

      // Should adjust to current time + 60 seconds
      expect(startTime).toBeGreaterThan(Math.floor(Date.now() / 1000))
      expect(endTime).toBeGreaterThan(startTime)
    })

    // it('handles contract simulation error', async () => {
    //   const mockError = new Error('Simulation failed')
    //   vi.mocked(simulateContract).mockRejectedValue(mockError)

    //   wrapper = createWrapper()

    //   await wrapper.vm.createElection(mockElectionData)

    //   expect(mockToastStore.addErrorToast).toHaveBeenCalled()
    //   expect(writeContract).not.toHaveBeenCalled()
    // })

    // it('handles write contract error', async () => {
    //   const mockError = new Error('Write failed')
    //   vi.mocked(writeContract).mockRejectedValue(mockError)

    //   wrapper = createWrapper()

    //   await wrapper.vm.createElection(mockElectionData)

    //   expect(mockToastStore.addErrorToast).toHaveBeenCalled()
    //   expect(waitForTransactionReceipt).not.toHaveBeenCalled()
    // })

    // it('handles notification error after successful creation', async () => {
    //   const mockError = new Error('Notification failed')
    //   const mockExecute = vi.fn().mockRejectedValue(mockError)

    //   mockUseCustomFetch.mockReturnValue({
    //     error: { value: null },
    //     execute: mockExecute
    //   })

    //   wrapper = createWrapper()

    //   await wrapper.vm.createElection(mockElectionData)

    //   expect(mockToastStore.addSuccessToast).toHaveBeenCalled()
    //   expect(mockExecute).toHaveBeenCalled()
    // })
  })

  // describe('Watchers', () => {
  //   it('handles election notification error', async () => {
  //     const mockError = { message: 'Notification failed' }
  //     const mockErrorRef = { value: mockError }
  //     const mockExecute = vi.fn()

  //     mockUseCustomFetch.mockReturnValue({
  //       error: mockErrorRef,
  //       execute: mockExecute
  //     })

  //     wrapper = createWrapper()

  //     // Trigger watcher by updating the error ref
  //     mockErrorRef.value = mockError
  //     await wrapper.vm.$nextTick()

  //     expect(mockToastStore.addErrorToast).toHaveBeenCalledWith('Failed to send election notifications')
  //   })
  // })

  // describe('Props', () => {
  //   it('accepts and uses electionId prop', () => {
  //     wrapper = createWrapper({ electionId: 999n })
  //     expect(wrapper.vm.currentElectionId).toBe(999n)
  //   })

  //   it('defaults isDetails to false', () => {
  //     wrapper = createWrapper()
  //     expect(wrapper.props('isDetails')).toBe(false)
  //   })
  // })
})
