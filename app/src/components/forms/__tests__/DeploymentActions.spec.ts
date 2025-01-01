import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { mount } from '@vue/test-utils'
import DeploymentActions from '../DeploymentActions.vue'
import { useWriteContract } from '@wagmi/vue'
import { ref } from 'vue'
import ButtonUI from '@/components/ButtonUI.vue'

// Mock the stores and wagmi hooks
const mockToastStore = {
  addErrorToast: vi.fn(),
  addSuccessToast: vi.fn()
}
vi.mock('@/stores', () => ({
  useToastStore: () => mockToastStore
}))

vi.mock('@/stores/user', () => ({
  useUserDataStore: vi.fn(() => ({
    address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
  }))
}))

const mockUseReadContract = {
  data: ref<unknown | null>(null),
  isLoading: ref(false),
  error: ref(null),
  refetch: vi.fn()
}
const mockUseWatchContractEvent = {
  onLogs: vi.fn()
}
const mockUseWriteContract = {
  writeContract: vi.fn(),
  error: ref<unknown>(null),
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
const mockOfficerTeamData = ref(null)

vi.mock('@wagmi/vue', () => ({
  useReadContract: vi.fn(() => ({
    data: mockOfficerTeamData,
    isLoading: ref(false)
  }))
}))
vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: Object = await importOriginal()
  return {
    ...actual,
    useReadContract: vi.fn(() => mockUseReadContract),
    useWriteContract: vi.fn(() => mockUseWriteContract),
    useWaitForTransactionReceipt: vi.fn(() => mockUseWaitForTransactionReceipt),
    useSendTransaction: vi.fn(() => mockUseSendTransaction),
    useBalance: vi.fn(() => mockUseBalance),
    useWatchContractEvent: vi.fn(() => mockUseWatchContractEvent)
  }
})
describe('DeploymentActions', () => {
  const defaultProps = {
    team: {
      officerAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
    },
    founders: ['0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'],
    isBankDeployed: false,
    isVotingDeployed: false,
    isBoDDeployed: false,
    isExpenseDeployed: false,
    isExpenseEip712Deployed: false,
    isInvestorV1Deployed: false
  }

  const defaultTeam = {
    id: '1',
    name: 'Test Team',
    description: 'Test Description',
    bankAddress: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
    votingAddress: '0xdD2FD4581271e230360230F9337D5c0430Bf44C0',
    expenseAccountAddress: '0xbDA5747bFD65F08deb54cb465eB87D40e51B197E',
    expenseAccountEip712Address: '0x2546BcD3c84621e976D8185a91A922aE77ECEc30',
    officerAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    members: [],
    ownerAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    boardOfDirectorsAddress: '0xcd3B766CCDd6AE721141F452C550Ca635964ce71'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all deployment buttons when no contracts are deployed', () => {
    const wrapper = mount(DeploymentActions, {
      props: {
        ...defaultProps,
        isCashRemunerationEip712Deployed: false,
        team: defaultTeam
      }
    })

    expect(wrapper.text()).toContain('Deploy Bank')
    expect(wrapper.text()).toContain('Deploy Voting')
    expect(wrapper.text()).toContain('Deploy Expense')
    expect(wrapper.text()).toContain('Deploy Expense EIP712')
    expect(wrapper.text()).toContain('Deploy Cash Remuneration EIP712')
    expect(wrapper.text()).toContain('Deploy Investor V1')
    expect(wrapper.text()).toContain('Deploy All Contracts')
  })

  it('shows loading button when deployment is in progress', () => {
    vi.mocked(useWriteContract as Mock).mockReturnValue({
      writeContract: vi.fn(),
      isPending: ref(true),
      data: ref('0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199'),
      error: ref(null)
    })

    const wrapper = mount(DeploymentActions, {
      props: {
        ...defaultProps,
        isCashRemunerationEip712Deployed: false,
        team: defaultTeam
      }
    })

    expect(wrapper.findComponent(ButtonUI).props().loading).toBe(true)
  })

  it('displays 7 buttons when no contracts are deployed', () => {
    mockUseWriteContract.isPending.value = true

    const wrapper = mount(DeploymentActions, {
      props: {
        ...defaultProps,
        isCashRemunerationEip712Deployed: false,
        team: defaultTeam
      }
    })

    const buttons = wrapper.findAll('button')
    expect(buttons.length).toBe(7)
  })

  it('opens investor contract modal when deploying all contracts without investor', async () => {
    const wrapper = mount(DeploymentActions, {
      props: {
        ...defaultProps,
        isCashRemunerationEip712Deployed: false,
        isInvestorV1Deployed: false,
        team: defaultTeam
      }
    })

    await wrapper.find('[data-test="deploy-all-contracts"]').trigger('click')

    expect(wrapper.emitted()).toHaveProperty('openInvestorContractModal')
    expect(wrapper.emitted('openInvestorContractModal')?.[0]).toBeTruthy()
  })
})
