import { it, expect, describe, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ProposalCard from '@/components/sections/SingleTeamView/ProposalCard.vue'
import { ref } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import VotingABI from '@/artifacts/abi/voting.json'

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
}
vi.mock('../PieChart.vue', () => ({ default: { template: '<span>Success PieChart</span>' } }))

vi.mock('@/stores/useToastStore', () => {
  return {
    useToastStore: vi.fn(() => ({
      addSuccessToast: vi.fn(),
      addErrorToast: vi.fn()
    }))
  }
})

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
describe('ProposalCard.vue', () => {
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
  describe('render', () => {
    it('renders correctly for directive proposal', () => {
      const wrapper = mount(ProposalCard, {
        global: {
          plugins: [router] // Provide the router instance
        },
        props: {
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
          }
        }
      })
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
      const wrapper = mount(ProposalCard, {
        global: {
          plugins: [router] // Provide the router instance
        },
        props: {
          proposal: proposalElection,
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
          }
        }
      })
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
      const wrapper = mount(ProposalCard, {
        global: {
          plugins: [router] // Provide the router instance
        },
        props: {
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
          }
        }
      })
      const buttons = wrapper.findAll('button')
      expect(buttons[0].text()).toBe('Vote')
      expect(buttons[1].text()).toBe('View')
    })
  })

  describe('interactions', () => {
    it('opens vote modal when Vote button is clicked', async () => {
      const wrapper = mount(ProposalCard, {
        global: {
          plugins: [router]
        },
        props: {
          proposal: proposalDirective,
          team: {
            id: '1',
            name: 'team1',
            description: 'team1',
            bankAddress: '0x1',
            members: [{ id: '1', name: 'member1', address: '0x1' }],
            ownerAddress: '0x1',
            votingAddress: '0x1',
            boardOfDirectorsAddress: '0x1'
          }
        }
      })

      await wrapper.find('[data-test="vote-button"]').trigger('click')
      expect((wrapper.vm as unknown as ComponentData).showVoteModal).toBe(true)
    })

    it('opens details modal when View button is clicked', async () => {
      const wrapper = mount(ProposalCard, {
        global: {
          plugins: [router]
        },
        props: {
          proposal: proposalDirective,
          team: {
            id: '1',
            name: 'team1',
            description: 'team1',
            bankAddress: '0x1',
            members: [{ id: '1', name: 'member1', address: '0x1' }],
            ownerAddress: '0x1',
            votingAddress: '0x1',
            boardOfDirectorsAddress: '0x1'
          }
        }
      })

      await wrapper.find('[data-test="view-button"]').trigger('click')
      expect((wrapper.vm as unknown as ComponentData).showProposalDetailsModal).toBe(true)
    })

    it('opens conclude confirmation modal when Stop button is clicked', async () => {
      const wrapper = mount(ProposalCard, {
        global: {
          plugins: [router]
        },
        props: {
          proposal: proposalDirective,
          team: {
            id: '1',
            name: 'team1',
            description: 'team1',
            bankAddress: '0x1',
            members: [{ id: '1', name: 'member1', address: '0x1' }],
            ownerAddress: '0x1',
            votingAddress: '0x1',
            boardOfDirectorsAddress: '0x1'
          }
        }
      })

      await wrapper.find('[data-test="stop-button"]').trigger('click')
      expect((wrapper.vm as unknown as ComponentData).showConcludeConfirmModal).toBe(true)
    })
  })

  describe('watch handlers', () => {
    it('handles successful directive vote', async () => {
      const wrapper = mount(ProposalCard, {
        global: {
          plugins: [router]
        },
        props: {
          proposal: proposalDirective,
          team: {
            id: '1',
            name: 'team1',
            description: 'team1',
            bankAddress: '0x1',
            members: [{ id: '1', name: 'member1', address: '0x1' }],
            ownerAddress: '0x1',
            votingAddress: '0x1',
            boardOfDirectorsAddress: '0x1'
          }
        }
      })

      // Simulate successful vote confirmation
      mockUseWaitForTransactionReceipt.isLoading.value = false
      mockUseWaitForTransactionReceipt.isSuccess.value = true

      await wrapper.vm.$nextTick()
      expect((wrapper.vm as unknown as ComponentData).showVoteModal).toBe(false)
    })
  })

  describe('computed properties', () => {
    it('correctly formats chart data for directive proposals', () => {
      const wrapper = mount(ProposalCard, {
        global: {
          plugins: [router]
        },
        props: {
          proposal: proposalDirective,
          team: {
            id: '1',
            name: 'team1',
            description: 'team1',
            bankAddress: '0x1',
            members: [{ id: '1', name: 'member1', address: '0x1' }],
            ownerAddress: '0x1',
            votingAddress: '0x1',
            boardOfDirectorsAddress: '0x1'
          }
        }
      })

      const chartData = (wrapper.vm as unknown as ComponentData).chartData
      expect(chartData).toEqual([
        { value: 10, name: 'Yes' },
        { value: 5, name: 'No' },
        { value: 3, name: 'Abstain' }
      ])
    })

    it('correctly formats chart data for election proposals', () => {
      const wrapper = mount(ProposalCard, {
        global: {
          plugins: [router]
        },
        props: {
          proposal: proposalElection,
          team: {
            id: '1',
            name: 'team1',
            description: 'team1',
            bankAddress: '0x1',
            members: [{ id: '1', name: 'member1', address: '0x1' }],
            ownerAddress: '0x1',
            votingAddress: '0x1',
            boardOfDirectorsAddress: '0x1'
          }
        }
      })

      const chartData = (wrapper.vm as unknown as ComponentData).chartData
      expect(chartData).toEqual([
        { value: 0, name: 'member1' },
        { value: 1, name: 'Unknown' }
      ])
    })
  })

  describe('modal interactions', () => {
    it('handles vote modal and vote input correctly', async () => {
      const wrapper = mount(ProposalCard, {
        global: {
          plugins: [router]
        },
        props: {
          proposal: proposalDirective,
          team: {
            id: '1',
            name: 'team1',
            description: 'team1',
            bankAddress: '0x1',
            members: [{ id: '1', name: 'member1', address: '0x1' }],
            ownerAddress: '0x1',
            votingAddress: '0x1',
            boardOfDirectorsAddress: '0x1'
          }
        }
      })

      expect(wrapper.find('[data-test="vote-modal"]').exists()).toBe(true)

      await wrapper.find('[data-test="vote-button"]').trigger('click')
      expect((wrapper.vm as unknown as ComponentData).showVoteModal).toBe(true)
    })

    it('handles conclude modal correctly', async () => {
      const wrapper = mount(ProposalCard, {
        global: {
          plugins: [router]
        },
        props: {
          proposal: proposalDirective,
          team: {
            id: '1',
            name: 'team1',
            description: 'team1',
            bankAddress: '0x1',
            members: [{ id: '1', name: 'member1', address: '0x1' }],
            ownerAddress: '0x1',
            votingAddress: '0x1',
            boardOfDirectorsAddress: '0x1'
          }
        }
      })

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
      const wrapper = mount(ProposalCard, {
        global: {
          plugins: [router]
        },
        props: {
          proposal: proposalDirective,
          team: {
            id: '1',
            name: 'team1',
            description: 'team1',
            bankAddress: '0x1',
            members: [{ id: '1', name: 'member1', address: '0x1' }],
            ownerAddress: '0x1',
            votingAddress: '0x1',
            boardOfDirectorsAddress: '0x1'
          }
        }
      })

      // Simulate loading state
      mockUseWriteContract.isPending.value = true
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="conclude-loading-button"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="conclude-confirm-button"]').exists()).toBe(false)
    })

    it('handles details modal correctly', async () => {
      const wrapper = mount(ProposalCard, {
        global: {
          plugins: [router]
        },
        props: {
          proposal: proposalDirective,
          team: {
            id: '1',
            name: 'team1',
            description: 'team1',
            bankAddress: '0x1',
            members: [{ id: '1', name: 'member1', address: '0x1' }],
            ownerAddress: '0x1',
            votingAddress: '0x1',
            boardOfDirectorsAddress: '0x1'
          }
        }
      })

      // Check initial state
      expect(wrapper.find('[data-test="details-modal"]').exists()).toBe(true)

      // Trigger details modal
      await wrapper.find('[data-test="view-button"]').trigger('click')
      expect((wrapper.vm as unknown as ComponentData).showProposalDetailsModal).toBe(true)
    })
  })
})
