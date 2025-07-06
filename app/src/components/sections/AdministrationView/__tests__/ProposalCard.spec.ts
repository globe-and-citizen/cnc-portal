import { it, expect, describe, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ProposalCard from '@/components/sections/AdministrationView/ProposalCard.vue'
import { ref } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import VotingABI from '@/artifacts/abi/voting.json'
import { useToastStore } from '@/stores/__mocks__/useToastStore'
import { createTestingPinia } from '@pinia/testing'
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
interface ModalComponentData {
  vm: {
    $emit: (event: string, ...args: unknown[]) => void
  }
}
vi.mock('@/components/PieChart.vue', () => ({
  default: { template: '<span>Success PieChart</span>' }
}))

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
  const actual: object = await importOriginal()
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
      plugins: [router, createTestingPinia({ createSpy: vi.fn() })]
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
    it('opens vote modal when Vote button is clicked', async () => {
      const wrapper = createComponent()
      await wrapper.find('[data-test="vote-button"]').trigger('click')
      expect((wrapper.vm as unknown as ComponentData).showVoteModal).toBe(true)
      expect(wrapper.find('[data-test="vote-modal"]').exists()).toBe(true)
    })

    it('opens conclude confirmation modal when Stop button is clicked', async () => {
      const wrapper = createComponent()
      await wrapper.find('[data-test="stop-button"]').trigger('click')
      expect((wrapper.vm as unknown as ComponentData).showConcludeConfirmModal).toBe(true)
    })

    it.skip('handles conclude modal correctly', async () => {
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
      const wrapper = createComponent({ isDone: true })

      // Check initial state
      expect(wrapper.find('[data-test="details-modal"]').exists()).toBe(true)

      // Trigger details modal
      await wrapper.find('button[data-test="view-concluded-button"]').trigger('click')
      expect((wrapper.vm as unknown as ComponentData).showProposalDetailsModal).toBe(true)
    })

    it('handles vote modal v-model binding', async () => {
      const wrapper = createComponent()

      // Open modal
      await wrapper.find('[data-test="vote-button"]').trigger('click')
      expect((wrapper.vm as unknown as ComponentData).showVoteModal).toBe(true)

      // Simulate modal close through v-model
      const voteModal = wrapper.findComponent('[data-test="vote-modal"]')
      await (voteModal as unknown as ModalComponentData).vm.$emit('update:modelValue', false)

      expect((wrapper.vm as unknown as ComponentData).showVoteModal).toBe(false)
    })

    it('handles proposal details modal v-model binding', async () => {
      const wrapper = createComponent()

      // Open modal
      await wrapper.find('[data-test="view-active-button"]').trigger('click')
      expect((wrapper.vm as unknown as ComponentData).showProposalDetailsModal).toBe(true)

      // Simulate modal close through v-model
      const detailsModal = wrapper.findComponent('[data-test="details-modal"]')
      await (detailsModal as unknown as ModalComponentData).vm.$emit('update:modelValue', false)

      expect((wrapper.vm as unknown as ComponentData).showProposalDetailsModal).toBe(false)
    })

    it('handles conclude modal v-model binding', async () => {
      const wrapper = createComponent()

      // Open modal
      await wrapper.find('[data-test="stop-button"]').trigger('click')
      expect((wrapper.vm as unknown as ComponentData).showConcludeConfirmModal).toBe(true)

      // Simulate modal close through v-model
      const concludeModal = wrapper.findComponent('[data-test="conclude-modal"]')
      await (concludeModal as unknown as ModalComponentData).vm.$emit('update:modelValue', false)

      expect((wrapper.vm as unknown as ComponentData).showConcludeConfirmModal).toBe(false)
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

  describe('voting interactions', () => {
    it.skip('handles election vote submission correctly', async () => {
      const wrapper = createComponent({ proposal: proposalElection })

      // Open vote modal
      await wrapper.find('[data-test="vote-button"]').trigger('click')

      // Simulate vote submission from VoteForm
      const voteForm = wrapper.findComponent({ name: 'VoteForm' })
      await voteForm.vm.$emit('voteElection', {
        proposalId: 1,
        candidateAddress: '0x2'
      })

      // Verify contract interaction
      expect(mockUseWriteContract.writeContract).toHaveBeenCalledWith({
        address: '0x1',
        abi: VotingABI,
        functionName: 'voteElection',
        args: [1, '0x2']
      })
    })

    it('handles directive vote submission correctly', async () => {
      const wrapper = createComponent({ proposal: proposalDirective })

      // Open vote modal
      await wrapper.find('[data-test="vote-button"]').trigger('click')

      // Simulate vote submission from VoteForm
      const voteForm = wrapper.findComponent({ name: 'VoteForm' })
      await voteForm.vm.$emit('voteDirective', {
        proposalId: 0,
        option: 1 // Yes vote
      })

      // Verify contract interaction
      expect(mockUseWriteContract.writeContract).toHaveBeenCalledWith({
        address: '0x1',
        abi: VotingABI,
        functionName: 'voteDirective',
        args: [0, 1]
      })
    })

    it('shows loading state during vote submission', async () => {
      const wrapper = createComponent()

      // Open vote modal
      await wrapper.find('[data-test="vote-button"]').trigger('click')

      // Simulate loading state
      mockUseWriteContract.isPending.value = true
      await wrapper.vm.$nextTick()

      // Verify VoteForm receives correct loading prop
      const voteForm = wrapper.findComponent({ name: 'VoteForm' })
      expect(voteForm.props('isLoading')).toBe(true)
    })

    it('handles vote confirmation states correctly', async () => {
      const wrapper = createComponent()

      // Open vote modal
      await wrapper.find('[data-test="vote-button"]').trigger('click')

      // Simulate transaction confirmation flow
      mockUseWaitForTransactionReceipt.isLoading.value = true
      await wrapper.vm.$nextTick()

      // Verify loading state is passed to VoteForm
      const voteForm = wrapper.findComponent({ name: 'VoteForm' })
      expect(voteForm.props('isLoading')).toBe(true)

      // Simulate successful confirmation
      mockUseWaitForTransactionReceipt.isLoading.value = false
      mockUseWaitForTransactionReceipt.isSuccess.value = true
      await wrapper.vm.$nextTick()

      // Verify modal closes and success toast is shown
      expect((wrapper.vm as unknown as ComponentData).showVoteModal).toBe(false)
      const { addSuccessToast } = useToastStore()
      expect(addSuccessToast).toHaveBeenCalled()
    })

    it('maintains vote input state through v-model', async () => {
      const wrapper = createComponent()

      // Open vote modal
      await wrapper.find('[data-test="vote-button"]').trigger('click')

      // Simulate v-model update from VoteForm
      const testVoteInput = {
        title: 'Test Vote',
        description: 'Test Description',
        candidates: [{ name: 'Test Candidate', candidateAddress: '0x3' }],
        isElection: true
      }

      const voteForm = wrapper.findComponent({ name: 'VoteForm' })
      await voteForm.vm.$emit('update:modelValue', testVoteInput)

      // Verify the component's voteInput is updated
      expect((wrapper.vm as unknown as ComponentData).voteInput).toEqual(testVoteInput)
    })
  })
})
