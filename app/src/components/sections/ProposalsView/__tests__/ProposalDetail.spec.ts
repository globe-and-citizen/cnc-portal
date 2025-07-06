import { flushPromises, mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ProposalDetail from '../ProposalDetail.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import { ref } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import { ProposalState } from '@/types'
import type { Proposal, ProposalVoteEvent } from '@/types'

// Mock data
const mockProposal = {
  id: BigInt(1),
  title: 'Test Proposal',
  description: 'This is a test proposal description',
  proposalType: 'Governance',
  startDate: BigInt(Math.floor(Date.now() / 1000) - 86400), // 1 day ago
  endDate: BigInt(Math.floor(Date.now() / 1000) + 86400), // 1 day from now
  creator: '0x1234567890123456789012345678901234567890',
  voteCount: BigInt(3),
  totalVoters: BigInt(5),
  yesCount: BigInt(2),
  noCount: BigInt(1),
  abstainCount: BigInt(0),
  state: ProposalState.Active
}

const mockRecentVotes: ProposalVoteEvent[] = [
  {
    proposalId: BigInt(1),
    voter: '0x1234567890123456789012345678901234567890',
    vote: 'yes',
    timestamp: 'December 6, 2024'
  },
  {
    proposalId: BigInt(1),
    voter: '0x9876543210987654321098765432109876543210',
    vote: 'no',
    timestamp: 'December 5, 2024'
  }
]

const mockTeamMembers = [
  {
    address: '0x1234567890123456789012345678901234567890',
    name: 'Alice Chen'
  },
  {
    address: '0x9876543210987654321098765432109876543210',
    name: 'Bob Martinez'
  }
]

// Mock wagmi composables
const mockUseReadContract = {
  data: ref<Proposal | undefined>(mockProposal),
  error: ref<unknown>(null),
  isLoading: ref(false),
  queryKey: ['proposalDetail']
}

const mockUseReadContractHasVoted = {
  data: ref(false),
  queryKey: ['hasVoted']
}

const mockUseWriteContract = {
  writeContract: vi.fn(),
  isPending: ref(false),
  error: ref<unknown>(null),
  data: ref<unknown>(null)
}

const mockUseWaitForTransactionReceipt = {
  isLoading: ref(false),
  isSuccess: ref(false),
  error: ref<unknown>(null)
}

const mockUseQueryClient = {
  invalidateQueries: vi.fn()
}

// Mock stores
const mockTeamStore = {
  getContractAddressByType: vi.fn(() => '0xProposalsContract'),
  currentTeam: {
    members: mockTeamMembers
  }
}

const mockToastStore = {
  addErrorToast: vi.fn(),
  addSuccessToast: vi.fn()
}

const mockUserDataStore = {
  address: '0x1234567890123456789012345678901234567890'
}

// Mock vue-router
const mockRoute = {
  params: {
    proposalId: '1'
  }
}

// Mock viem actions
const mockCreateEventFilter = vi.fn()
const mockGetFilterLogs = vi.fn(() =>
  Promise.resolve([
    {
      args: {
        proposalId: BigInt(1),
        voter: '0x1234567890123456789012345678901234567890',
        vote: 0, // yes
        timestamp: BigInt(Math.floor(Date.now() / 1000))
      }
    },
    {
      args: {
        proposalId: BigInt(1),
        voter: '0x9876543210987654321098765432109876543210',
        vote: 2, // no
        timestamp: BigInt(Math.floor(Date.now() / 1000) - 3600)
      }
    }
  ])
)

// Mocking modules
vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useReadContract: vi.fn((config) => {
      if (config.functionName === 'hasVoted') {
        return mockUseReadContractHasVoted
      }
      return mockUseReadContract
    }),
    useWriteContract: vi.fn(() => mockUseWriteContract),
    useWaitForTransactionReceipt: vi.fn(() => mockUseWaitForTransactionReceipt)
  }
})

vi.mock('@tanstack/vue-query', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useQueryClient: vi.fn(() => mockUseQueryClient)
  }
})

vi.mock('@/stores', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useTeamStore: vi.fn(() => mockTeamStore),
    useToastStore: vi.fn(() => mockToastStore),
    useUserDataStore: vi.fn(() => mockUserDataStore)
  }
})

vi.mock('vue-router', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useRoute: vi.fn(() => mockRoute)
  }
})

vi.mock('viem/actions', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    createEventFilter: mockCreateEventFilter,
    getFilterLogs: mockGetFilterLogs
  }
})

vi.mock('viem', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    parseAbiItem: vi.fn(() => ({}))
  }
})

vi.mock('@/wagmi.config', () => ({
  config: {
    getClient: vi.fn(() => ({}))
  }
}))

describe('ProposalDetail', () => {
  const createComponent = (props = {}) => {
    return mount(ProposalDetail, {
      props,
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          ButtonUI: true
        }
      }
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset reactive refs
    mockUseReadContract.data.value = mockProposal
    mockUseReadContract.error.value = null
    mockUseReadContract.isLoading.value = false
    mockUseReadContractHasVoted.data.value = false
    mockUseWriteContract.isPending.value = false
    mockUseWriteContract.error.value = null
    mockUseWaitForTransactionReceipt.isLoading.value = false
    mockUseWaitForTransactionReceipt.isSuccess.value = false
  })

  describe('Render', () => {
    it('should render loading state', async () => {
      mockUseReadContract.isLoading.value = true
      mockUseReadContract.data.value = undefined

      const wrapper = createComponent()
      await flushPromises()

      expect(wrapper.text()).toContain('Loading...')
    })

    it('should render error state', async () => {
      mockUseReadContract.error.value = new Error('Test error')
      mockUseReadContract.data.value = undefined

      const wrapper = createComponent()
      await flushPromises()

      expect(wrapper.text()).toContain('Error: Error: Test error')
    })

    it('should render no proposal found state', async () => {
      mockUseReadContract.data.value = undefined
      mockUseReadContract.error.value = null
      mockUseReadContract.isLoading.value = false

      const wrapper = createComponent()
      await flushPromises()

      expect(wrapper.text()).toContain('No proposal found')
    })

    it('should render proposal details correctly', async () => {
      const wrapper = createComponent()
      await flushPromises()

      expect(wrapper.text()).toContain('Test Proposal')
      expect(wrapper.text()).toContain('This is a test proposal description')
      expect(wrapper.text()).toContain('Governance')
      expect(wrapper.text()).toContain('Active')
      expect(wrapper.text()).toContain('Alice Chen')
    })

    it('should render proposal status badge with correct styling', async () => {
      const wrapper = createComponent()
      await flushPromises()

      const statusBadge = wrapper.find('.bg-purple-600')
      expect(statusBadge.exists()).toBe(true)
      expect(statusBadge.text()).toBe('Active')
    })

    it('should display vote counts and percentages correctly', async () => {
      const wrapper = createComponent()
      await flushPromises()

      expect(wrapper.text()).toContain('3/5') // vote count
      expect(wrapper.text()).toContain('2 (67%)') // yes votes
      expect(wrapper.text()).toContain('1 (33%)') // no votes
    })

    it('should render voting buttons when user has not voted', async () => {
      mockUseReadContractHasVoted.data.value = false

      const wrapper = createComponent()
      await flushPromises()

      const voteButtons = wrapper.findAllComponents(ButtonUI)
      expect(voteButtons.length).toBeGreaterThanOrEqual(3)

      const buttonTexts = voteButtons.map((button) => button.text())
      expect(buttonTexts).toContain('Vote for yes')
      expect(buttonTexts).toContain('Vote for no')
      expect(buttonTexts).toContain('Vote for abstain')
    })

    it('should not render voting buttons when user has already voted', async () => {
      mockUseReadContractHasVoted.data.value = true

      const wrapper = createComponent()
      await flushPromises()

      const voteForYesButton = wrapper.findComponent('[data-test="vote-yes"]')
      expect(voteForYesButton.exists()).toBe(false)
    })

    it('should display recent votes with voter names', async () => {
      const wrapper = createComponent()
      await flushPromises()

      expect(wrapper.text()).toContain('Recent Votes')
      expect(wrapper.text()).toContain('Alice Chen')
      expect(wrapper.text()).toContain('For')
    })

    it('should display no recent votes message when empty', async () => {
      mockGetFilterLogs.mockResolvedValueOnce([])

      const wrapper = createComponent()
      await flushPromises()

      expect(wrapper.text()).toContain('No recent votes to display')
    })
  })

  describe('Voting functionality', () => {
    it('should call vote function with correct parameters for yes vote', async () => {
      const wrapper = createComponent()
      await flushPromises()

      const yesButton = wrapper.findComponent({ name: 'ButtonUI' })
      await yesButton.trigger('click')

      expect(mockUseWriteContract.writeContract).toHaveBeenCalledWith({
        address: '0xProposalsContract',
        abi: expect.any(Array),
        functionName: 'castVote',
        args: [BigInt(1), 0] // yes vote = 0
      })
    })

    it('should disable voting buttons while voting is in progress', async () => {
      mockUseWriteContract.isPending.value = true

      const wrapper = createComponent()
      await flushPromises()

      const voteButtons = wrapper.findAllComponents(ButtonUI)
      voteButtons.forEach((button) => {
        expect(button.props('disabled')).toBe(true)
      })
    })

    it('should disable voting buttons while confirming vote', async () => {
      mockUseWaitForTransactionReceipt.isLoading.value = true

      const wrapper = createComponent()
      await flushPromises()

      const voteButtons = wrapper.findAllComponents(ButtonUI)
      voteButtons.forEach((button) => {
        expect(button.props('disabled')).toBe(true)
      })
    })

    it('should emit proposal-voted event after successful vote', async () => {
      const wrapper = createComponent()
      await flushPromises()

      // Simulate successful vote confirmation
      mockUseWaitForTransactionReceipt.isSuccess.value = true
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('proposal-voted')).toBeTruthy()
    })

    it('should invalidate queries after successful vote', async () => {
      const wrapper = createComponent()
      await flushPromises()

      // Simulate successful vote confirmation
      mockUseWaitForTransactionReceipt.isSuccess.value = true
      await wrapper.vm.$nextTick()

      expect(mockUseQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: [['proposalDetail'], ['hasVoted']]
      })
    })

    it('should show success toast after successful vote', async () => {
      const wrapper = createComponent()
      await flushPromises()

      // Simulate successful vote confirmation
      mockUseWaitForTransactionReceipt.isSuccess.value = true
      await wrapper.vm.$nextTick()

      expect(mockToastStore.addSuccessToast).toHaveBeenCalledWith('Vote cast successfully!')
    })

    it('should show error toast when vote fails', async () => {
      const wrapper = createComponent()
      await flushPromises()

      // Simulate vote error
      mockUseWriteContract.error.value = new Error('Vote failed')
      await wrapper.vm.$nextTick()

      expect(mockToastStore.addErrorToast).toHaveBeenCalledWith('Failed to cast vote')
    })

    it('should show error toast when vote confirmation fails', async () => {
      const wrapper = createComponent()
      await flushPromises()

      // Simulate confirmation error
      mockUseWaitForTransactionReceipt.error.value = new Error('Confirmation failed')
      await wrapper.vm.$nextTick()

      expect(mockToastStore.addErrorToast).toHaveBeenCalledWith('Failed to confirm vote')
    })
  })

  describe('Helper functions', () => {
    it('should format dates correctly', async () => {
      const wrapper = createComponent()
      await flushPromises()

      // Check if dates are formatted properly in the UI
      expect(wrapper.text()).toMatch(/\w+ \d{1,2}, \d{4}/) // Date format like "December 6, 2024"
    })

    it('should calculate vote percentages correctly', async () => {
      // Test with 2 yes, 1 no, 0 abstain = 67% yes, 33% no
      const wrapper = createComponent()
      await flushPromises()

      expect(wrapper.text()).toContain('67%')
      expect(wrapper.text()).toContain('33%')
    })

    it('should handle zero votes correctly', async () => {
      mockUseReadContract.data.value = {
        ...mockProposal,
        yesCount: BigInt(0),
        noCount: BigInt(0),
        abstainCount: BigInt(0)
      }

      const wrapper = createComponent()
      await flushPromises()

      // Should not crash and should show 0%
      expect(wrapper.text()).toContain('0 (0%)')
    })
  })

  describe('Different proposal states', () => {
    it('should render approved proposal correctly', async () => {
      mockUseReadContract.data.value = {
        ...mockProposal,
        state: ProposalState.Approved
      }

      const wrapper = createComponent()
      await flushPromises()

      const statusBadge = wrapper.find('.bg-green-500')
      expect(statusBadge.exists()).toBe(true)
      expect(statusBadge.text()).toBe('Approved')
    })

    it('should render rejected proposal correctly', async () => {
      mockUseReadContract.data.value = {
        ...mockProposal,
        state: ProposalState.Rejected
      }

      const wrapper = createComponent()
      await flushPromises()

      const statusBadge = wrapper.find('.bg-red-500')
      expect(statusBadge.exists()).toBe(true)
      expect(statusBadge.text()).toBe('Rejected')
    })

    it('should render tied proposal correctly', async () => {
      mockUseReadContract.data.value = {
        ...mockProposal,
        state: ProposalState.Tied
      }

      const wrapper = createComponent()
      await flushPromises()

      const statusBadge = wrapper.find('.bg-gray-300')
      expect(statusBadge.exists()).toBe(true)
      expect(statusBadge.text()).toBe('Tied')
    })
  })

  describe('Recent votes functionality', () => {
    it('should fetch recent votes on mount', async () => {
      const wrapper = createComponent()
      await flushPromises()

      expect(mockCreateEventFilter).toHaveBeenCalled()
      expect(mockGetFilterLogs).toHaveBeenCalled()
    })

    it('should map vote values correctly', async () => {
      const wrapper = createComponent()
      await flushPromises()

      // Check that vote values are mapped correctly (0=yes, 2=no, 1=abstain)
      expect(wrapper.text()).toContain('For') // for yes vote
    })

    it('should display unknown voter when member not found', async () => {
      mockGetFilterLogs.mockResolvedValueOnce([
        {
          args: {
            proposalId: BigInt(1),
            voter: '0xUnknownAddress',
            vote: 0,
            timestamp: BigInt(Math.floor(Date.now() / 1000))
          }
        }
      ])

      const wrapper = createComponent()
      await flushPromises()

      expect(wrapper.text()).toContain('Unknown')
    })
  })
})
