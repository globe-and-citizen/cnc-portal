import { it, expect, describe, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ProposalCard from '@/components/sections/SingleTeamView/ProposalCard.vue'
import { ref } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import VotingABI from '@/artifacts/abi/voting.json'
import { useToastStore } from '@/stores/__mocks__/useToastStore'
// Create a router instance
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: { template: '<div>Home</div>' } } // Basic route
  ] // Define your routes here if needed
})
interface ComponentData {
  showVoteModal: boolean
  showProposalDetailsModal: boolean
  showConcludeConfirmModal: boolean
  chartData: { value: number; name: string }[]
  voteInput: {
    title: string
    description: string
    candidates: [
      {
        name: string
        candidateAddress: string
      }
    ]
    isElection: boolean
  }
  directiveError: unknown
  electionError: unknown
}
vi.mock('../PieChart.vue', () => ({ default: { template: '<span>Success PieChart</span>' } }))

vi.mock('@/stores/useToastStore')

const mockUseReadContract = {
  data: ref<string | null>(null),
  isLoading: ref(false),
  error: ref(null),
  refetch: vi.fn()
}

const mockUseWriteContract = {
  writeContract: vi.fn(),
  error: ref(null),
  isPending: ref(false),
  data: ref(null)
}

const mockUseWaitForTransactionReceipt = {
  isLoading: ref(false),
  isSuccess: ref(false)
}
const mockUseSendTransaction = {
  isPending: ref(false),
  error: ref(false),
  data: ref<string>(''),
  sendTransaction: vi.fn()
}
const mockUseBalance = {
  data: ref<string | null>(null),
  isLoading: ref(false),
  error: ref(null),
  refetch: vi.fn()
}

// Mocking wagmi functions
vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: Object = await importOriginal()
  return {
    ...actual,
    useReadContract: vi.fn(() => mockUseReadContract),
    useWriteContract: vi.fn(() => mockUseWriteContract),
    useWaitForTransactionReceipt: vi.fn(() => mockUseWaitForTransactionReceipt),
    useSendTransaction: vi.fn(() => mockUseSendTransaction),
    useBalance: vi.fn(() => mockUseBalance)
  }
})

const proposalDirective = {
  id: 0,
  title: 'Directive',
  draftedBy: '0x1',
  description:
    'The Crypto Native Portal, an app that creates a mechanism to financially acknowledge the micro contributions of Open Source collaborators along with tools that promote effective governance.',
  isElection: false,
  votes: {
    yes: 10,
    no: 5,
    abstain: 3
  },
  candidates: []
}

const proposalElection = {
  id: 1,
  title: 'Election',
  draftedBy: '0x1',
  description:
    'The Crypto Native Portal, an app that creates a mechanism to financially acknowledge the micro contributions of Open Source collaborators along with tools that promote effective governance.',

  isElection: true,
  candidates: [
    { name: 'Ravioli', candidateAddress: '0x1', votes: 0 },
    { name: 'Herm', candidateAddress: '0x2', votes: 1 }
  ]
}

const createComponent = (props = {}) => {
  const defaultProps = {
    proposal: proposalDirective,
    team: {
      id: '1',
      name: 'team1',
      description: 'team1',
      bankAddress: '0x1',
      members: [
        {
          id: '1',
          name: 'member1',
          address: '0x1'
        }
      ],
      ownerAddress: '0x1',
      votingAddress: '0x1',
      boardOfDirectorsAddress: '0x1'
    },
    isDone: false
  }

  return mount(ProposalCard, {
    global: {
      plugins: [router]
    },
    props: {
      ...defaultProps,
      ...props
    }
  })
}

describe('ProposalCard.vue', () => {
  describe('render', () => {
    it('renders correctly for directive proposal', () => {
      const wrapper = createComponent()
      expect(wrapper.find('[data-test="proposal-title"]').text()).toBe(proposalDirective.title)
      expect(wrapper.find('[data-test="proposal-drafter"]').text()).toContain('member1')
      const expectedDescription =
        proposalDirective.description.length > 120
          ? proposalDirective.description.substring(0, 120) + '...'
          : proposalDirective.description
      expect(wrapper.find('[data-test="proposal-description"]').text()).toContain(
        expectedDescription
      )
      expect(wrapper.classes()).toContain('bg-blue-100') // blue background for directive
    })

    it('renders correctly for election proposal', () => {
      const wrapper = createComponent({ proposal: proposalElection })
      expect(wrapper.find('[data-test="proposal-title"]').text()).toBe(proposalElection.title)
      const expectedDescription =
        proposalDirective.description.length > 120
          ? proposalDirective.description.substring(0, 120) + '...'
          : proposalDirective.description
      expect(wrapper.find('[data-test="proposal-description"]').text()).toContain(
        expectedDescription
      )

      expect(wrapper.classes()).toContain('bg-green-100') // green background for election
    })
    it('has Vote and View buttons', () => {
      const wrapper = createComponent()
      const buttons = wrapper.findAll('button')
      expect(buttons[0].text()).toBe('Vote')
      expect(buttons[1].text()).toBe('View')
    })
  })

  describe('interactions', () => {
    it('opens vote modal when Vote button is clicked', async () => {
      const wrapper = createComponent()
      await wrapper.find('[data-test="vote-button"]').trigger('click')
      expect((wrapper.vm as unknown as ComponentData).showVoteModal).toBe(true)
    })

    it('opens conclude confirmation modal when Stop button is clicked', async () => {
      const wrapper = createComponent()
      await wrapper.find('[data-test="stop-button"]').trigger('click')
      expect((wrapper.vm as unknown as ComponentData).showConcludeConfirmModal).toBe(true)
    })
  })

  describe('watch handlers', () => {
    it('handles successful directive vote', async () => {
      const wrapper = createComponent()

      // Simulate successful vote confirmation
      mockUseWaitForTransactionReceipt.isLoading.value = false
      mockUseWaitForTransactionReceipt.isSuccess.value = true

      await wrapper.vm.$nextTick()
      expect((wrapper.vm as unknown as ComponentData).showVoteModal).toBe(false)
    })
  })

  describe('computed properties', () => {
    it('correctly formats chart data for directive proposals', () => {
      const wrapper = createComponent()

      const chartData = (wrapper.vm as unknown as ComponentData).chartData
      expect(chartData).toEqual([
        { value: 10, name: 'Yes' },
        { value: 5, name: 'No' },
        { value: 3, name: 'Abstain' }
      ])
    })

    it('correctly formats chart data for election proposals', () => {
      const wrapper = createComponent({ proposal: proposalElection })

      const chartData = (wrapper.vm as unknown as ComponentData).chartData
      expect(chartData).toEqual([
        { value: 0, name: 'member1' },
        { value: 1, name: 'Unknown' }
      ])
    })
  })

  describe('modal interactions', () => {
    it('handles vote modal and vote input correctly', async () => {
      const wrapper = createComponent()

      expect(wrapper.find('[data-test="vote-modal"]').exists()).toBe(true)

      await wrapper.find('[data-test="vote-button"]').trigger('click')
      expect((wrapper.vm as unknown as ComponentData).showVoteModal).toBe(true)
    })

    it('handles conclude modal correctly', async () => {
      const wrapper = createComponent()

      // Check initial state
      expect(wrapper.find('[data-test="conclude-modal"]').exists()).toBe(true)

      // Trigger conclude modal
      await wrapper.find('[data-test="stop-button"]').trigger('click')
      expect((wrapper.vm as unknown as ComponentData).showConcludeConfirmModal).toBe(true)

      // Test conclude confirmation
      const concludeButton = wrapper.find('[data-test="conclude-confirm-button"]')
      expect(concludeButton.exists()).toBe(true)
      await concludeButton.trigger('click')
      expect(mockUseWriteContract.writeContract).toHaveBeenCalledWith({
        address: '0x1',
        abi: VotingABI,
        functionName: 'concludeProposal',
        args: [0]
      })
    })

    it('shows loading button during conclude confirmation', async () => {
      const wrapper = createComponent()

      // Simulate loading state
      mockUseWriteContract.isPending.value = true
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="conclude-loading-button"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="conclude-confirm-button"]').exists()).toBe(false)
    })

    it('handles details modal active proposal correctly', async () => {
      const wrapper = createComponent()

      // Check initial state
      expect(wrapper.find('[data-test="details-modal"]').exists()).toBe(true)

      // Trigger details modal
      await wrapper.find('[data-test="view-active-button"]').trigger('click')
      expect((wrapper.vm as unknown as ComponentData).showProposalDetailsModal).toBe(true)
    })

    it('handles details modal concluded proposal correctly', async () => {
      const wrapper = createComponent({ isDone: true})

      // Check initial state
      expect(wrapper.find('[data-test="details-modal"]').exists()).toBe(true)

      // Trigger details modal
      await wrapper.find('button[data-test="view-concluded-button"]').trigger('click')
      expect((wrapper.vm as unknown as ComponentData).showProposalDetailsModal).toBe(true)
    })
  })

  describe('error handling', () => {
    it('should add error toast when election vote fails', async () => {
      const wrapper = createComponent({ proposal: proposalElection })
      ;(wrapper.vm as unknown as ComponentData).electionError = new Error('Election vote failed')
      await wrapper.vm.$nextTick()

      const { addErrorToast } = useToastStore()

      expect(addErrorToast).toHaveBeenCalled()
    })

    it('should add error toast when directive vote fails', async () => {
      const wrapper = createComponent()
      ;(wrapper.vm as unknown as ComponentData).directiveError = new Error('Directive vote failed')
      await wrapper.vm.$nextTick()

      const { addErrorToast } = useToastStore()

      expect(addErrorToast).toHaveBeenCalled()
    })

    it('should add error toast when conclude fails', async () => {
      const wrapper = createComponent()
      ;(wrapper.vm as unknown as ComponentData).directiveError = new Error('Conclude failed')
      await wrapper.vm.$nextTick()
      const { addErrorToast } = useToastStore()
      expect(addErrorToast).toHaveBeenCalled()
    })
  })

  describe('success handling', () => {
    it('should add success toast and emit getTeam when election vote succeeds', async () => {
      const wrapper = createComponent({ proposal: proposalElection })
      mockUseWaitForTransactionReceipt.isLoading.value = true
      mockUseWaitForTransactionReceipt.isSuccess.value = true
      await wrapper.vm.$nextTick()
      mockUseWaitForTransactionReceipt.isLoading.value = false
      await wrapper.vm.$nextTick()

      const { addSuccessToast } = useToastStore()
      expect(addSuccessToast).toHaveBeenCalled()
      expect(wrapper.emitted('getTeam')).toBeTruthy()
      expect((wrapper.vm as unknown as ComponentData).showVoteModal).toBe(false)
    })

    it('should add success toast and emit getTeam when directive vote succeeds', async () => {
      const wrapper = createComponent()
      mockUseWaitForTransactionReceipt.isLoading.value = true
      mockUseWaitForTransactionReceipt.isSuccess.value = true
      await wrapper.vm.$nextTick()
      mockUseWaitForTransactionReceipt.isLoading.value = false
      await wrapper.vm.$nextTick()

      const { addSuccessToast } = useToastStore()
      expect(addSuccessToast).toHaveBeenCalled()
      expect(wrapper.emitted('getTeam')).toBeTruthy()
      expect((wrapper.vm as unknown as ComponentData).showVoteModal).toBe(false)
    })

    it('should add success toast and emit getTeam when conclude succeeds', async () => {
      const wrapper = createComponent()
      mockUseWaitForTransactionReceipt.isLoading.value = true
      mockUseWaitForTransactionReceipt.isSuccess.value = true
      await wrapper.vm.$nextTick()
      mockUseWaitForTransactionReceipt.isLoading.value = false
      await wrapper.vm.$nextTick()

      const { addSuccessToast } = useToastStore()
      expect(addSuccessToast).toHaveBeenCalled()
      expect(wrapper.emitted('getTeam')).toBeTruthy()
      expect((wrapper.vm as unknown as ComponentData).showConcludeConfirmModal).toBe(false)
    })
  })
})
