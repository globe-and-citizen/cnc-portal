import { flushPromises, mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ExpenseAccountTable from '../ExpenseAccountTable.vue'
import TableComponent from '@/components/TableComponent.vue'
import { setActivePinia, createPinia } from 'pinia'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import { USDC_ADDRESS } from '@/constant'
import { zeroAddress } from 'viem'
import ButtonUI from '@/components/ButtonUI.vue'
import * as utils from '@/utils'
import { useGetExpensesQuery } from '@/queries'
import { mockToastStore } from '@/tests/mocks/store.mock'

const START_DATE = new Date().getTime() / 1000 + 60 * 60
const END_DATE = new Date().getTime() / 1000 + 2 * 60 * 60

const mockApprovals = [
  {
    approvedAddress: '0x1234567890123456789012345678901234567890',
    tokenAddress: USDC_ADDRESS,
    amount: 150,
    frequencyType: 0,
    customFrequency: 0,
    startDate: START_DATE,
    endDate: END_DATE,
    signature: `0xSignatureOne`,
    name: `Some One`,
    avatarUrl: null,
    balances: {
      0: `5`,
      1: `50`
    },
    status: 'enabled',
    user: {
      address: '0x1234567890123456789012345678901234567890',
      name: 'User One',
      avatarUrl: null
    }
  },
  {
    approvedAddress: '0x1234567890123456789012345678901234567890',
    tokenAddress: USDC_ADDRESS,
    amount: 500,
    frequencyType: 1,
    customFrequency: 0,
    startDate: START_DATE,
    endDate: END_DATE,
    signature: `0xSignaturTwo`,
    name: `Another One`,
    avatarUrl: null,
    balances: {
      0: `5`,
      1: `50`
    },
    status: 'disabled',
    user: {
      address: '0x1234567890123456789012345678901234567890',
      name: 'User Two',
      avatarUrl: null
    }
  },
  {
    approvedAddress: '0x1234567890123456789012345678901234567890',
    tokenAddress: zeroAddress,
    amount: 10,
    frequencyType: 4,
    customFrequency: 3 * 24 * 60 * 60,
    startDate: START_DATE,
    endDate: END_DATE,
    signature: `0xSignatureThree`,
    name: `Last One`,
    avatarUrl: null,
    balances: {
      0: `5`,
      1: `50`
    },
    status: 'expired',
    user: {
      address: '0x1234567890123456789012345678901234567890',
      name: 'User Three',
      avatarUrl: null
    }
  }
]

vi.mock('vue-router', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useRoute: vi.fn(() => ({ params: { id: 1 } }))
  }
})

const mockUseReadContractRefetch = vi.fn()
const mockUseReadContract = {
  data: ref<string | null>(null),
  isLoading: ref(false),
  error: ref(null),
  refetch: mockUseReadContractRefetch
}

const mockUseWriteContract = {
  writeContract: vi.fn(),
  error: ref(null),
  isPending: ref(false),
  data: ref(null)
}

const mockUseBalance = {
  data: ref(null),
  refetch: vi.fn(),
  error: ref(null),
  isLoading: ref(false)
}

const mockUseWaitForTransactionReceipt = {
  isLoading: ref(false),
  isSuccess: ref(false)
}

const mockUseSignTypedData = {
  error: ref<Error | null>(null),
  data: ref<string | undefined>('0xExpenseDataSignature'),
  signTypedData: vi.fn()
}

// Mocking wagmi functions
vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useReadContract: vi.fn(() => {
      return { ...mockUseReadContract, data: ref(`0xContractOwner`) }
    }),
    useWriteContract: vi.fn(() => mockUseWriteContract),
    useWaitForTransactionReceipt: vi.fn(() => mockUseWaitForTransactionReceipt),
    useBalance: vi.fn(() => mockUseBalance),
    useChainId: vi.fn(() => ref('0xChainId')),
    useSignTypedData: vi.fn(() => mockUseSignTypedData)
  }
})

vi.mock('viem', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    parseSignature: vi.fn(),
    hashTypedData: vi.fn(),
    keccak256: vi.fn()
  }
})

vi.mock('@/composables/useCustomFetch', () => {
  return {
    useCustomFetch: vi.fn()
  }
})

vi.mock('@/queries', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useGetExpensesQuery: vi.fn()
  }
})

describe('ExpenseAccountTable - Actions and Loading', () => {
  setActivePinia(createPinia())

  interface ComponentOptions {
    props?: Record<string, unknown>
    data?: () => Record<string, unknown>
    global?: Record<string, unknown>
  }

  const createComponent = ({
    props = {},
    data = () => ({}),
    global = {}
  }: ComponentOptions = {}) => {
    return mount(ExpenseAccountTable, {
      props: {
        ...props
      },
      data,
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              user: { address: '0xInitialUser' }
            }
          })
        ],
        ...global
      }
    })
  }

  beforeEach(() => {
    vi.mocked(useGetExpensesQuery).mockReturnValue({
      data: ref(mockApprovals),
      isLoading: ref(false)
    } as ReturnType<typeof useGetExpensesQuery>)
  })

  describe('Action Buttons and Loading States', () => {
    it('should show loading button if enabling approval', async () => {
      const wrapper = createComponent()
      wrapper.vm.contractOwnerAddress = '0xUserAddress'
      const statusDisabledInput = wrapper.find('[data-test="status-input-disabled"]')
      expect(statusDisabledInput.exists()).toBeTruthy()
      //@ts-expect-error: setChecked for setting the input to checked works instead of click
      await statusDisabledInput.setChecked()
      await flushPromises()
      expect(wrapper.vm.selectedRadio).toBe('disabled')
      const expenseAccountTable = wrapper.findComponent(TableComponent)
      expect(expenseAccountTable.exists()).toBeTruthy()
      expect(expenseAccountTable.find('[data-test="table"]').exists()).toBeTruthy()
      const firstRow = expenseAccountTable.find('[data-test="0-row"]')
      expect(firstRow.exists()).toBeTruthy()
      expect(firstRow.html()).toContain(mockApprovals[1].amount)
      // Set loading state and signature to update so button will show loading
      wrapper.vm.isLoadingSetStatus = true
      wrapper.vm.signatureToUpdate = mockApprovals[1].signature
      await flushPromises()
      // Find button again after state update to get updated reference
      const updatedFirstRow = expenseAccountTable.find('[data-test="0-row"]')
      const enableButton = updatedFirstRow.findComponent(ButtonUI)
      expect(enableButton.exists()).toBeTruthy()
      expect(enableButton.props('loading')).toBe(true)
    })

    it('should show loading button if disabling approvals', async () => {
      const wrapper = createComponent()
      const statusEnabledInput = wrapper.find('[data-test="status-input-enabled"]')
      expect(statusEnabledInput.exists()).toBeTruthy()
      //@ts-expect-error: setChecked for setting the input to checked works instead of click
      await statusEnabledInput.setChecked()
      await flushPromises()
      expect(wrapper.vm.selectedRadio).toBe('enabled')
      const expenseAccountTable = wrapper.findComponent(TableComponent)
      expect(expenseAccountTable.exists()).toBeTruthy()
      expect(expenseAccountTable.find('[data-test="table"]').exists()).toBeTruthy()
      const firstRow = expenseAccountTable.find('[data-test="0-row"]')
      expect(firstRow.exists()).toBeTruthy()
      expect(firstRow.html()).toContain(mockApprovals[0].amount)
      const enableButton = firstRow.findComponent(ButtonUI)
      expect(enableButton.exists()).toBeTruthy()
      enableButton.trigger('click')
      await flushPromises()
      expect(enableButton.props('loading')).toBe(true)
    })

    it('should disable action buttons if not contract owner', async () => {
      const wrapper = createComponent()
      await flushPromises()
      const expenseAccountTable = wrapper.findComponent(TableComponent)
      expect(expenseAccountTable.exists()).toBeTruthy()
      expect(expenseAccountTable.find('[data-test="table"]').exists()).toBeTruthy()
      const firstRow = expenseAccountTable.find('[data-test="0-row"]')
      expect(firstRow.exists()).toBeTruthy()
      const enableButton = firstRow.findComponent(ButtonUI)
      expect(enableButton.props('disabled')).toBe(true)
      const secondRow = expenseAccountTable.find('[data-test="1-row"]')
      expect(secondRow.exists()).toBeTruthy()
      const disableButton = secondRow.findComponent(ButtonUI)
      expect(disableButton.props('disabled')).toBe(true)
    })

    it('should notify success if activate successful', async () => {
      const wrapper = createComponent()
      wrapper.vm.isConfirmingActivate = true
      await flushPromises()
      wrapper.vm.isConfirmingActivate = false
      wrapper.vm.isConfirmedActivate = { value: true }
      await flushPromises()
      expect(mockToastStore.addSuccessToast).toBeCalledWith('Activate Successful')
    })

    it('should notify success if deactivate successful', async () => {
      const wrapper = createComponent()
      wrapper.vm.isConfirmingDeactivate = true
      await flushPromises()
      wrapper.vm.isConfirmingDeactivate = false
      wrapper.vm.isConfirmedDeactivate = { value: true }
      await flushPromises()
      expect(mockToastStore.addSuccessToast).toBeCalledWith('Deactivate Successful')
    })

    it('should notify error if error deactivate approval', async () => {
      const wrapper = createComponent()
      const logErrorSpy = vi.spyOn(utils.log, 'error')
      wrapper.vm.errorDeactivateApproval = new Error(`Error deactivating approval`)
      await flushPromises()
      expect(mockToastStore.addErrorToast).toBeCalledWith('Failed to deactivate approval')
      expect(logErrorSpy).toBeCalledWith('Error deactivating approval')
    })

    it('should notify error if error activate approval', async () => {
      const wrapper = createComponent()
      const logErrorSpy = vi.spyOn(utils.log, 'error')
      wrapper.vm.errorActivateApproval = new Error(`Error activating approval`)
      await flushPromises()
      expect(mockToastStore.addErrorToast).toBeCalledWith('Failed to activate approval')
      expect(logErrorSpy).toBeCalledWith('Error activating approval')
    })

    it('should notify error if error getting owner', async () => {
      const wrapper = createComponent()
      const logErrorSpy = vi.spyOn(utils.log, 'error')
      wrapper.vm.errorGetOwner = new Error(`Error getting owner`)
      await flushPromises()
      expect(mockToastStore.addErrorToast).toBeCalledWith('Error Getting Contract Owner')
      expect(logErrorSpy).toBeCalledWith('Error getting owner')
    })
  })
})
