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
  })
})
