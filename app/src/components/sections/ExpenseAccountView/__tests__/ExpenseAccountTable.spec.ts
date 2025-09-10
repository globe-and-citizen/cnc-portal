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
import { useTanstackQuery } from '@/composables'
import { mockToastStore } from '@/tests/mocks/store.mock'

const mocks = vi.hoisted(() => ({
  mockReadContract: vi.fn()
}))

const validExpiry = new Date().getTime() / 1000 + 60 * 60
const invalidExpiry = new Date().getTime() / 1000 - 60 * 60

const mockApprovals = [
  {
    approvedAddress: '0x1234567890123456789012345678901234567890',
    tokenAddress: USDC_ADDRESS,
    budgetData: [
      { budgetType: 0, value: 10 },
      { budgetType: 1, value: 100 },
      { budgetType: 2, value: 10 }
    ],
    expiry: validExpiry,
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
    budgetData: [
      { budgetType: 0, value: 11 },
      { budgetType: 1, value: 111 },
      { budgetType: 2, value: 11 }
    ],
    expiry: validExpiry,
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
    budgetData: [
      { budgetType: 0, value: 12 },
      { budgetType: 1, value: 123 },
      { budgetType: 2, value: 12 }
    ],
    expiry: invalidExpiry,
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
  refetch: mockUseReadContractRefetch //vi.fn()
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

vi.mock('@wagmi/core', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    readContract: mocks.mockReadContract
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

describe('ExpenseAccountTable', () => {
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
    //@ts-expect-error: fewer return values than original
    vi.mocked(useTanstackQuery).mockReturnValue({
      data: ref(mockApprovals),
      isLoading: ref(false)
    })
  })

  describe('Render', () => {
    it('should display filter radio buttons', async () => {
      const wrapper = createComponent()
      expect(wrapper.find('[data-test="status-input-all"]').exists()).toBeTruthy()
      expect(wrapper.find('[data-test="status-input-enabled"]').exists()).toBeTruthy()
      expect(wrapper.find('[data-test="status-input-disabled"]').exists()).toBeTruthy()
      expect(wrapper.find('[data-test="status-input-expired"]').exists()).toBeTruthy()
    })

    it('should filter all approvals', async () => {
      const wrapper = createComponent()
      await flushPromises()
      const expenseAccountTable = wrapper.findComponent(TableComponent)
      expect(expenseAccountTable.exists()).toBeTruthy()
      expect(expenseAccountTable.find('[data-test="table"]').exists()).toBeTruthy()
      const firstRow = expenseAccountTable.find('[data-test="0-row"]')
      expect(firstRow.exists()).toBeTruthy()
      expect(firstRow.findComponent({ name: 'UserComponent' })).toBeTruthy()
      expect(firstRow.html()).toContain(mockApprovals[0].user.name)
      const secondRow = expenseAccountTable.find('[data-test="1-row"]')
      expect(secondRow.exists()).toBeTruthy()
      expect(secondRow.html()).toContain(mockApprovals[1].user.name)
      const thirdRow = expenseAccountTable.find('[data-test="2-row"]')
      expect(thirdRow.exists()).toBeTruthy()
      expect(thirdRow.html()).toContain(mockApprovals[2].user.name)
      expect(expenseAccountTable.find('[data-test="disable-button"]').exists()).toBeTruthy()
      expect(expenseAccountTable.find('[data-test="enable-button"]').exists()).toBeTruthy()
    })

    it('should filter enabled approvals', async () => {
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
      expect(firstRow.html()).toContain(mockApprovals[0].budgetData[0].value)
      expect(expenseAccountTable.find('[data-test="1-row"]').exists()).toBeFalsy()
      expect(expenseAccountTable.find('[data-test="2-row"]').exists()).toBeFalsy()
      expect(expenseAccountTable.find('[data-test="disable-button"]').exists()).toBeTruthy()
      expect(expenseAccountTable.find('[data-test="enable-button"]').exists()).toBeFalsy()
    })

    it('should filter disabled approvals', async () => {
      const wrapper = createComponent()
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
      expect(firstRow.html()).toContain(mockApprovals[1].budgetData[0].value)
      expect(expenseAccountTable.find('[data-test="1-row"]').exists()).toBeFalsy()
      expect(expenseAccountTable.find('[data-test="2-row"]').exists()).toBeFalsy()
      expect(expenseAccountTable.find('[data-test="disable-button"]').exists()).toBeFalsy()
      expect(expenseAccountTable.find('[data-test="enable-button"]').exists()).toBeTruthy()
    })

    it('should filter expired approvals', async () => {
      const wrapper = createComponent()
      const statusExpiredInput = wrapper.find('[data-test="status-input-expired"]')
      expect(statusExpiredInput.exists()).toBeTruthy()
      //@ts-expect-error: setChecked for setting the input to checked works instead of click
      await statusExpiredInput.setChecked()
      await flushPromises()
      expect(wrapper.vm.selectedRadio).toBe('expired')
      const expenseAccountTable = wrapper.findComponent(TableComponent)
      expect(expenseAccountTable.exists()).toBeTruthy()
      expect(expenseAccountTable.find('[data-test="table"]').exists()).toBeTruthy()
      const firstRow = expenseAccountTable.find('[data-test="0-row"]')
      expect(firstRow.exists()).toBeTruthy()
      expect(firstRow.html()).toContain(mockApprovals[2].budgetData[0].value)
      expect(expenseAccountTable.find('[data-test="1-row"]').exists()).toBeFalsy()
      expect(expenseAccountTable.find('[data-test="2-row"]').exists()).toBeFalsy()
      expect(expenseAccountTable.find('[data-test="disable-button"]').exists()).toBeFalsy()
      expect(expenseAccountTable.find('[data-test="enable-button"]').exists()).toBeFalsy()
    })

    it('should show loading button if enabling approval', async () => {
      const wrapper = createComponent()
      wrapper.vm.contractOwnerAddress = '0xInitialUser'
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
      expect(firstRow.html()).toContain(mockApprovals[1].budgetData[0].value)
      const disableButton = firstRow.findComponent(ButtonUI)
      expect(disableButton.exists()).toBeTruthy()
      expect(disableButton.props('disabled')).toBe(false)
      disableButton.trigger('click')
      wrapper.vm.isLoadingDeactivateApproval = true
      await flushPromises()
      expect(disableButton.props('loading')).toBe(true)
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
      expect(firstRow.html()).toContain(mockApprovals[0].budgetData[0].value)
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
    it('should notify success if activate successful', async () => {
      const wrapper = createComponent()
      wrapper.vm.isConfirmingDeativate = true
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
