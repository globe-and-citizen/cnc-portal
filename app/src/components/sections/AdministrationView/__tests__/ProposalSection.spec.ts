// ProposalSection.spec.ts
import { it, expect, describe, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import ProposalSection from '@/components/sections/AdministrationView/ProposalSection.vue'
import type { Proposal } from '@/types'

vi.mock('vue-router', () => ({
  useRoute: vi.fn(() => ({ params: { id: '1' } }))
}))

vi.mock('@/stores/user', () => ({
  useUserDataStore: vi.fn(() => ({ name: 'Test User', address: '0xTestAddress' }))
}))

vi.mock('@/stores/useToastStore', () => ({
  useToastStore: vi.fn(() => ({
    addSuccessToast: vi.fn(),
    addErrorToast: vi.fn()
  }))
}))
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
interface ProposalSectionInstance {
  showModal: boolean
  showBoDModal: boolean
  showVotingControlModal: boolean
  tabs: string[]
  newProposalInput: Proposal
}
// Mocking wagmi functions
vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useReadContract: vi.fn(() => mockUseReadContract),
    useWriteContract: vi.fn(() => mockUseWriteContract),
    useWaitForTransactionReceipt: vi.fn(() => mockUseWaitForTransactionReceipt)
  }
})

describe.skip('ProposalSection.vue', () => {
  let wrapper: ReturnType<typeof mount>

  beforeEach(() => {
    wrapper = mount(ProposalSection, {
      props: {
        team: {
          name: 'Test Team',
          ownerAddress: '0xOwnerAddress',
          teamContracts: [
            {
              address: '0xcontractaddress',
              admins: [],
              type: 'Voting',
              deployer: '0xdeployeraddress'
            }
          ],
          members: [
            { name: 'Member 1', address: '0xMember1', teamId: 1, id: '1' },
            { name: 'Member 2', address: '0xMember2', teamId: 1, id: '1' }
          ]
        }
      }
    })
  })

  it('shows loading spinner when loadingGetProposals is true', async () => {
    wrapper = mount(ProposalSection, {
      props: {
        team: {
          name: 'Test Team',
          ownerAddress: '0xOwnerAddress',
          teamContracts: [
            {
              address: '0xcontractaddress',
              admins: [],
              type: 'Bank',
              deployer: '0xdeployeraddress'
            }
          ],
          members: [
            { name: 'Member 1', address: '0xMember1', teamId: 1, id: '1' },
            { name: 'Member 2', address: '0xMember2', teamId: 1, id: '1' }
          ]
        }
      }
    })
    await wrapper.vm.$nextTick()
    // expect(wrapper.find('span.loading').exists()).toBe(true)
    expect(wrapper.find('[data-test="parent-div"]').exists()).toBe(false)
  })

  it('renders create proposal button', () => {
    wrapper = mount(ProposalSection, {
      props: {
        team: {
          votingAddress: '0xVotingAddress',
          members: []
        }
      }
    })
    const createButton = wrapper.find('button[data-test="create-proposal"]')
    expect(createButton.exists()).toBe(true)
  })

  it('opens modal when create proposal button is clicked', async () => {
    wrapper = mount(ProposalSection, {
      props: {
        team: {
          votingAddress: '0xVotingAddress',
          members: []
        }
      }
    })
    const createButton = wrapper.find('button[data-test="create-proposal"]')
    await createButton.trigger('click')
    expect((wrapper.vm as unknown as ProposalSectionInstance).showModal).toBe(true)
  })

  it('shows View BoD button when boardOfDirectorsAddress exists', () => {
    wrapper = mount(ProposalSection, {
      props: {
        team: {
          votingAddress: '0xVotingAddress',
          boardOfDirectorsAddress: '0xBoDAddress',
          members: []
        }
      }
    })
    const bodButton = wrapper.find('button[data-test="view-bod"]')
    expect(bodButton.exists()).toBe(true)
  })

  it('does not show View BoD button when boardOfDirectorsAddress does not exist', () => {
    wrapper = mount(ProposalSection, {
      props: {
        team: {
          votingAddress: '0xVotingAddress',
          members: []
        }
      }
    })
    const bodButton = wrapper.find('button[data-test="view-bod"]')
    expect(bodButton.exists()).toBe(false)
  })

  it('opens BoD modal and fetches directors when View BoD button is clicked', async () => {
    wrapper = mount(ProposalSection, {
      props: {
        team: {
          votingAddress: '0xVotingAddress',
          boardOfDirectorsAddress: '0xBoDAddress',
          members: []
        }
      }
    })
    const bodButton = wrapper.find('button[data-test="view-bod"]')
    await bodButton.trigger('click')

    expect((wrapper.vm as unknown as ProposalSectionInstance).showBoDModal).toBe(true)
    expect(mockUseReadContract.refetch).toHaveBeenCalled()
  })

  it('shows manage button and opens voting management modal', async () => {
    wrapper = mount(ProposalSection, {
      props: {
        team: {
          votingAddress: '0xVotingAddress',
          members: []
        }
      }
    })
    const manageButton = wrapper.find('button[data-test="manage-voting"]')
    expect(manageButton.exists()).toBe(true)

    await manageButton.trigger('click')
    expect((wrapper.vm as unknown as ProposalSectionInstance).showVotingControlModal).toBe(true)
  })

  it('initializes with correct tabs', () => {
    wrapper = mount(ProposalSection, {
      props: {
        team: {
          votingAddress: '0xVotingAddress',
          members: []
        }
      }
    })
    const tabs = (wrapper.vm as unknown as ProposalSectionInstance).tabs
    expect(tabs).toEqual(['Ongoing', 'Done'])
  })

  it('initializes newProposalInput with correct default values', () => {
    wrapper = mount(ProposalSection, {
      props: {
        team: {
          votingAddress: '0xVotingAddress',
          members: []
        }
      }
    })
    expect((wrapper.vm as unknown as ProposalSectionInstance).newProposalInput).toEqual({
      title: '',
      description: '',
      isElection: false,
      voters: [],
      candidates: [],
      winnerCount: 0,
      teamId: 1
    })
  })
})
