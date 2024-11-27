import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { mount } from '@vue/test-utils'
import DeploymentActions from '../DeploymentActions.vue'

import { useWriteContract } from '@wagmi/vue'
import { ref } from 'vue'

// Mock the stores and wagmi hooks
vi.mock('@/stores', () => ({
  useToastStore: vi.fn(() => ({
    addErrorToast: vi.fn(),
    addSuccessToast: vi.fn()
  }))
}))

vi.mock('@/stores/user', () => ({
  useUserDataStore: vi.fn(() => ({
    address: '0x123'
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
      officerAddress: '0x456'
    },
    founders: ['0x123'],
    isBankDeployed: false,
    isVotingDeployed: false,
    isBoDDeployed: false,
    isExpenseDeployed: false,
    isExpenseEip712Deployed: false,
    isInvestorV1Deployed: false
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all deployment buttons when no contracts are deployed', () => {
    const wrapper = mount(DeploymentActions, {
      props: {
        ...defaultProps,
        team: {
          id: '1',
          name: 'Test Team',
          description: 'Test Description',
          bankAddress: '0x0',
          votingAddress: '0x0',
          expenseAccountAddress: '0x0',
          expenseAccountEip712Address: '0x0',
          officerAddress: '0x456',
          members: [],
          ownerAddress: '0x789',
          boardOfDirectorsAddress: '0x0'
        }
      }
    })

    expect(wrapper.text()).toContain('Deploy Bank')
    expect(wrapper.text()).toContain('Deploy Voting')
    expect(wrapper.text()).toContain('Deploy Expense')
    expect(wrapper.text()).toContain('Deploy Expense EIP712')
    expect(wrapper.text()).toContain('Deploy Investor V1')
    expect(wrapper.text()).toContain('Deploy All Contracts')
  })

  it('hides individual buttons when contracts are deployed', () => {
    const wrapper = mount(DeploymentActions, {
      props: {
        ...defaultProps,
        isBankDeployed: true,
        isVotingDeployed: true,
        team: {
          id: '1',
          name: 'Test Team',
          description: 'Test Description',
          bankAddress: '0x0',
          votingAddress: '0x0',
          expenseAccountAddress: '0x0',
          expenseAccountEip712Address: '0x0',
          officerAddress: '0x456',
          members: [],
          ownerAddress: '0x789',
          boardOfDirectorsAddress: '0x0'
        }
      }
    })

    expect(wrapper.text()).not.toContain('Deploy Bank')
    expect(wrapper.text()).not.toContain('Deploy Voting')
    expect(wrapper.text()).toContain('Deploy Expense')
    expect(wrapper.text()).toContain('Deploy Expense EIP712')
  })

  it('hides "Deploy All Contracts" when all contracts are deployed', () => {
    const wrapper = mount(DeploymentActions, {
      props: {
        ...defaultProps,
        isBankDeployed: true,
        isVotingDeployed: true,
        isBoDDeployed: true,
        isExpenseDeployed: true,
        isExpenseEip712Deployed: true,
        isInvestorV1Deployed: true,
        team: {
          id: '1',
          name: 'Test Team',
          description: 'Test Description',
          bankAddress: '0x0',
          votingAddress: '0x0',
          expenseAccountAddress: '0x0',
          expenseAccountEip712Address: '0x0',
          officerAddress: '0x456',
          members: [],
          ownerAddress: '0x789',
          boardOfDirectorsAddress: '0x0'
        }
      }
    })

    expect(wrapper.text()).not.toContain('Deploy All Contracts')
  })

  it('shows loading button when deployment is in progress', () => {
    vi.mocked(useWriteContract as Mock).mockReturnValue({
      writeContract: vi.fn(),
      isPending: ref(true),
      data: ref('0x0'),
      error: ref(null)
    })

    const wrapper = mount(DeploymentActions, {
      props: {
        ...defaultProps,
        team: {
          id: '1',
          name: 'Test Team',
          description: 'Test Description',
          bankAddress: '0x0',
          votingAddress: '0x0',
          expenseAccountAddress: '0x0',
          expenseAccountEip712Address: '0x0',
          officerAddress: '0x456',
          members: [],
          ownerAddress: '0x789',
          boardOfDirectorsAddress: '0x0'
        }
      }
    })

    expect(wrapper.findComponent({ name: 'LoadingButton' }).exists()).toBe(true)
  })

  it('displays 5 buttons when no contracts are deployed', () => {
    mockUseWriteContract.isPending.value = true

    const wrapper = mount(DeploymentActions, {
      props: {
        ...defaultProps,
        team: {
          id: '1',
          name: 'Test Team',
          description: 'Test Description',
          bankAddress: '0x0',
          votingAddress: '0x0',
          expenseAccountAddress: '0x0',
          expenseAccountEip712Address: '0x0',
          officerAddress: '0x456',
          members: [],
          ownerAddress: '0x789',
          boardOfDirectorsAddress: '0x0'
        }
      }
    })

    const buttons = wrapper.findAll('button')
    expect(buttons.length).toBe(6)
  })
})
