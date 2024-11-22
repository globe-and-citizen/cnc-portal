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

vi.mock('@wagmi/vue', () => ({
  useWriteContract: vi.fn(() => ({
    writeContract: vi.fn(),
    isPending: ref(false),
    data: ref('0x0'),
    error: ref(null),
    reset: vi.fn(),
    variables: ref({}),
    isError: false,
    isIdle: true,
    isLoading: false,
    isSuccess: false
  })),
  useWaitForTransactionReceipt: vi.fn(() => ({
    isLoading: false,
    isSuccess: false
  }))
}))

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
    isExpenseEip712Deployed: false
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
})
