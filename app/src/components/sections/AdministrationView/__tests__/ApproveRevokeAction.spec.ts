import { shallowMount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import ApproveRevokeAction from '@/components/sections/AdministrationView/forms/ApproveRevokeAction.vue'
import { createTestingPinia } from '@pinia/testing'
import { useApprovalCount, useApproveAction } from '@/composables/__mocks__/bod'
import { useBankGetFunction } from '@/composables/__mocks__/bank'
import { useExpenseGetFunction } from '@/composables/__mocks__/useExpenseAccount'
import { useUserDataStore } from '@/stores'
import { ref } from 'vue'
import { useReadContract } from '@wagmi/vue'
import SkeletonLoading from '@/components/SkeletonLoading.vue'

vi.mock('@/composables/bod')
vi.mock('@/composables/bank')
vi.mock('@/composables/useExpenseAccount')
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
describe('ApproveRevokeAction', () => {
  const createComponent = () => {
    return shallowMount(ApproveRevokeAction, {
      props: {
        action: {
          id: 1,
          description: 'Transfer 1000 to user',
          actionId: 1,
          isExecuted: false,
          data: '0x0',
          targetAddress: '0xBank',
          teamId: 1,
          userAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
        },
        boardOfDirectors: [
          '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
          '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
        ],
        team: {
          id: '1',
          teamContracts: [
            {
              address: '0xBank',
              type: 'Bank',
              deployer: '0x709979',
              admins: []
            },
            {
              address: '0xExp',
              type: 'ExpenseAccount',
              deployer: '0x709979',
              admins: []
            },
            {
              address: '0xBoD',
              type: 'BoardOfDirectors',
              deployer: '0x709979',
              admins: []
            }
          ],
          members: [
            {
              id: '1',
              address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
              name: 'John Doe',
              teamId: 1
            }
          ]
        }
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })
  }

  describe('Renders', () => {
    it('should render the title correctly', () => {
      const wrapper = createComponent()
      expect(wrapper.find("[data-test='action-title']").text()).toBe('Action #1')
    })

    it('should render the description correctly', async () => {
      const wrapper = createComponent()

      // set isApprovalLoading to false
      const { isLoading } = useApprovalCount()
      isLoading.value = false

      await wrapper.vm.$nextTick()
      expect(wrapper.find("[data-test='action-description']").text()).toBe(
        'Description: Transfer 1000 to user'
      )
    })

    it('should render the target address correctly', () => {
      const wrapper = createComponent()
      expect(wrapper.find("[data-test='action-target-address']").text()).toBe(
        'Target Address: 0xBank (Bank)'
      )
    })

    it('should render the target address correctly if it is expense account', async () => {
      const wrapper = createComponent()
      await wrapper.setProps({
        ...wrapper.props(),
        action: {
          id: 1,
          description: 'Transfer',
          actionId: 1,
          isExecuted: false,
          data: '0x0',
          targetAddress: '0xExp',
          teamId: 1,
          userAddress: '0x70997970C'
        }
      })
      const { isLoading } = useApproveAction()
      isLoading.value = false
      expect(wrapper.find("[data-test='action-target-address']").text()).toBe(
        'Target Address: 0xExp (Expense Account)'
      )
    })

    it('should render the target address unknown if it is not bank or expense account', async () => {
      const wrapper = createComponent()
      await wrapper.setProps({
        ...wrapper.props(),
        action: {
          id: 1,
          description: 'Transfer',
          actionId: 1,
          isExecuted: false,
          data: '0x0',
          targetAddress: '0xUnknown',
          teamId: 1,
          userAddress: '0x70997970C'
        }
      })
      const { isLoading } = useApproveAction()
      isLoading.value = false
      expect(wrapper.find("[data-test='action-target-address']").text()).toBe(
        'Target Address: 0xUnknown (Unknown)'
      )
    })

    it('should render function name correctly', async () => {
      const wrapper = createComponent()
      const { data } = useBankGetFunction()
      data.value = 'transfer'

      await wrapper.vm.$nextTick()
      expect(wrapper.find("[data-test='action-function-name']").text()).toBe(
        'Function Name: transfer'
      )
    })

    it('should render expense function name correctly', async () => {
      const wrapper = createComponent()
      await wrapper.setProps({
        ...wrapper.props(),
        action: {
          id: 1,
          description: 'Transfer',
          actionId: 1,
          isExecuted: false,
          data: '0x0',
          targetAddress: '0xExp',
          teamId: 1,
          userAddress: '0x70997970C'
        }
      })
      const { data } = useExpenseGetFunction()
      data.value = 'transfer'

      await wrapper.vm.$nextTick()
      expect(wrapper.find("[data-test='action-function-name']").text()).toBe(
        'Function Name: transfer'
      )
    })

    it('should render function name unknown if function name is not found', async () => {
      const wrapper = createComponent()
      await wrapper.setProps({
        ...wrapper.props(),
        action: {
          id: 1,
          description: 'Transfer',
          actionId: 1,
          isExecuted: false,
          data: '0x0',
          targetAddress: '0xUnknown',
          teamId: 1,
          userAddress: '0x70997970C'
        }
      })

      await wrapper.vm.$nextTick()
      expect(wrapper.find("[data-test='action-function-name']").text()).toBe(
        'Function Name: Unknown'
      )
    })

    it('should render parameters correctly for bank', async () => {
      const wrapper = createComponent()
      const { inputs, args } = useBankGetFunction()
      inputs.value = ['to', 'amount']
      args.value = ['0xUser', 1]

      await wrapper.vm.$nextTick()
      expect(wrapper.find("[data-test='action-parameters-title']").text()).toBe('Parameters:')
      expect(wrapper.find("[data-test='action-parameters-bank']").exists()).toBeTruthy()
      wrapper.findAll("[data-test='bank-params").forEach((param, index) => {
        expect(param.text()).toBe(`  - ${inputs.value[index]}: ${args.value[index]}`)
      })
    })

    it('should render parameters correctly for expense account', async () => {
      const wrapper = createComponent()
      await wrapper.setProps({
        ...wrapper.props(),
        action: {
          id: 1,
          description: 'setMaxLimit',
          actionId: 1,
          isExecuted: false,
          data: '0x0',
          targetAddress: '0xExp',
          teamId: 1,
          userAddress: '0x70997970C'
        }
      })
      const { inputs, args } = useExpenseGetFunction()
      inputs.value = ['amount']
      args.value = [1]

      await wrapper.vm.$nextTick()
      expect(wrapper.find("[data-test='action-parameters-title']").text()).toBe('Parameters:')
      expect(wrapper.find("[data-test='action-parameters-expense']").exists()).toBeTruthy()
      wrapper.findAll("[data-test='expense-params").forEach((param, index) => {
        expect(param.text()).toBe(`  - ${inputs.value[index]}: ${args.value[index]}`)
      })
    })

    it('should render action executed state', async () => {
      const wrapper = createComponent()
      await wrapper.setProps({
        ...wrapper.props(),
        action: {
          id: 1,
          description: 'setMaxLimit',
          actionId: 1,
          isExecuted: true,
          data: '0x0',
          targetAddress: '0xExp',
          teamId: 1,
          userAddress: '0x70997970C'
        }
      })

      expect(wrapper.find("[data-test='action-is-executed']").text()).toBe('Is Executed: true')
    })

    it('should render action approval count correctly', async () => {
      const wrapper = createComponent()
      const { data } = useApprovalCount()
      data.value = 1

      await wrapper.vm.$nextTick()
      expect(wrapper.find("[data-test='action-approval-count']").text()).toBe(
        'Approvals /2 board of directors approved'
      )
    })

    it('should render created by correctly', () => {
      const wrapper = createComponent()
      expect(wrapper.find("[data-test='action-created-by']").text()).toBe(
        'Created By: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 John Doe'
      )
      const user = useUserDataStore()
      user.address = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
    })

    it('should not render approve button if user is not in board of directors', async () => {
      const wrapper = createComponent()
      await wrapper.setProps({
        ...wrapper.props(),
        action: {
          ...wrapper.props().action,
          isExecuted: false
        },
        boardOfDirectors: ['0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266']
      })
      const user = useUserDataStore()
      user.address = '0xNotInBoD'

      await wrapper.vm.$nextTick()
      expect(wrapper.find("[data-test='approve-revoke-button']").exists()).toBeFalsy()

      user.address = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
    })

    it('should not render approve button if action is executed', async () => {
      const wrapper = createComponent()
      await wrapper.setProps({
        ...wrapper.props(),
        action: {
          ...wrapper.props().action,
          isExecuted: true
        }
      })

      await wrapper.vm.$nextTick()
      expect(wrapper.find("[data-test='approve-revoke-button']").exists()).toBeFalsy()
    })
  })

  describe('Button States and Actions', () => {
    it('should disable button when loading approve', async () => {
      const wrapper = createComponent()
      mockUseWriteContract.isPending.value = true

      await wrapper.vm.$nextTick()
      const button = wrapper.find("[data-test='approve-revoke-button']")
      expect(button.attributes('disabled')).toBeDefined()
    })

    it('should disable button when confirming transaction', async () => {
      const wrapper = createComponent()
      mockUseWaitForTransactionReceipt.isLoading.value = true

      await wrapper.vm.$nextTick()
      const button = wrapper.find("[data-test='approve-revoke-button']")
      expect(button.attributes('disabled')).toBeDefined()
    })
  })

  describe('Loading States', () => {
    it('should show skeleton loading when isApproved is loading', async () => {
      const wrapper = createComponent()
      mockUseReadContract.isLoading.value = true

      await wrapper.vm.$nextTick()
      expect(wrapper.findComponent(SkeletonLoading).exists()).toBeTruthy()
    })
  })

  describe('Status Badge', () => {
    it('should show Approved by You when approved', async () => {
      const wrapper = createComponent()
      const { data: isApproved } = useReadContract()
      isApproved.value = true

      await wrapper.vm.$nextTick()
      const badge = wrapper.find("[data-test='action-status']")
      expect(badge.text()).toBe('Approved by You')
      expect(badge.classes()).toContain('badge-primary')
    })

    it('should show Waiting for your approval when not approved', async () => {
      const wrapper = createComponent()
      const { data: isApproved } = useReadContract()
      isApproved.value = false

      await wrapper.vm.$nextTick()
      const badge = wrapper.find("[data-test='action-status']")
      expect(badge.text()).toBe('Waiting for your approval')
      expect(badge.classes()).toContain('badge-secondary')
    })
  })
})
