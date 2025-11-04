import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import { config } from '@/wagmi.config'
import { readContract } from '@wagmi/core'
import { log } from '@/utils'
import { parseError } from '@/utils'
import { EXPENSE_ACCOUNT_EIP712_ABI } from '@/artifacts/abi/expense-account-eip712'
import TransferAction from '../TransferAction.vue'
import { mockToastStore } from '@/tests/mocks/store.mock'

// Mock the dependencies
vi.mock('@/wagmi.config', () => ({
  config: {}
}))

const { addErrorToast: addErrorToastMock } = mockToastStore

const { useWaitForTransactionReceipt, useWriteContract, simulateContractMock } = vi.hoisted(() => ({
  useWaitForTransactionReceipt: vi.fn(),
  useWriteContract: vi.fn(),
  simulateContractMock: vi.fn(),
  addErrorToastMock: vi.fn()
}))

vi.mock('@wagmi/vue', () => ({
  useWaitForTransactionReceipt: useWaitForTransactionReceipt,
  useWriteContract: useWriteContract
}))

vi.mock('@/utils', () => ({
  log: {
    error: vi.fn()
  },
  parseError: vi.fn(() => `Parsed error:`),
  getTokens: vi.fn(() => [])
}))

vi.mock('@/composables', () => ({
  useContractBalance: () => ({
    balances: ref({})
  })
}))

vi.mock('@tanstack/vue-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn()
  })
}))

vi.mock('@wagmi/core', () => ({
  simulateContract: simulateContractMock,
  readContract: vi.fn(),
  estimateGas: vi.fn()
}))

// Mock the components
const MockButtonUI = {
  template: '<button @click="$emit(\'click\')"><slot></slot></button>'
}

const MockModalComponent = {
  template: '<div v-if="modelValue"><slot></slot></div>',
  props: ['modelValue']
}

const MockTransferForm = {
  template: '<div></div>',
  props: ['tokens', 'loading', 'modelValue'],
  emits: ['transfer', 'closeModal']
}

describe('TransferComponent', () => {
  let wrapper
  let logErrorMock: unknown

  // Component factory function
  const createComponent = (props: { row?: Record<string, unknown> } = {}) => {
    return mount(TransferAction, {
      global: {
        components: {
          ButtonUI: MockButtonUI,
          ModalComponent: MockModalComponent,
          TransferForm: MockTransferForm
        },
        stubs: ['teleport']
      },
      props: {
        row: {
          status: 'enabled',
          signature: '0xSignature',
          data: {
            tokenAddress: '0xTokenAddress',
            budgetData: []
          },
          balances: {},
          ...(props.row ?? {})
        },
        ...props
      }
    })
  }

  // Mock setup function
  const setupMocks = (
    options: {
      writeContractError?: Error | null
      writeContractPending?: boolean
      writeContractData?: unknown
      waitForReceiptError?: Error | null
      waitForReceiptLoading?: boolean
      waitForReceiptSuccess?: boolean
    } = {}
  ) => {
    const {
      writeContractError = null,
      writeContractPending = false,
      writeContractData = null,
      waitForReceiptError = null,
      waitForReceiptLoading = false,
      waitForReceiptSuccess = false
    } = options

    useWriteContract.mockReturnValue({
      writeContract: vi.fn(),
      isPending: ref(writeContractPending),
      error: ref(writeContractError),
      data: ref(writeContractData)
    })

    useWaitForTransactionReceipt.mockReturnValue({
      isLoading: ref(waitForReceiptLoading),
      isSuccess: ref(waitForReceiptSuccess),
      error: ref(waitForReceiptError)
    })

    // Get mock references
    logErrorMock = vi.spyOn(log, 'error')
  }

  beforeEach(async () => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    setupMocks()
  })

  it('should call simulateContract with correct arguments when transferring ERC20 token', async () => {
    vi.mocked(readContract).mockResolvedValue(BigInt(200 * 1e6))
    wrapper = createComponent()
    //@ts-expect-error not visible on wrapper.vm
    wrapper.vm.tokenAmount = '100'
    //@ts-expect-error not visible on wrapper.vm
    wrapper.vm.tokenRecipient = '0xRecipientAddress'
    //@ts-expect-error not visible on wrapper.vm
    await wrapper.vm.transferErc20Token()

    // Check that simulateContract was called with correct arguments
    expect(simulateContractMock).toHaveBeenCalledWith(config, {
      abi: EXPENSE_ACCOUNT_EIP712_ABI,
      functionName: 'transfer',
      address: '0xTeamContractAddress',
      args: [
        '0xRecipientAddress',
        100000000n,
        {
          budgetData: [],
          tokenAddress: '0xTokenAddress'
        },
        '0xSignature'
      ]
    })
  })

  it('should log error and show toast when errorTransfer value changes', async () => {
    const mockError = new Error('Transfer failed')
    wrapper = createComponent()
    //@ts-expect-error not visible on wrapper.vm
    wrapper.vm.errorTransfer = mockError

    // Wait for next tick to ensure watcher runs
    await wrapper.vm.$nextTick()

    // Check that log.error was called with parsed error
    expect(logErrorMock).toHaveBeenCalledWith(parseError(mockError, EXPENSE_ACCOUNT_EIP712_ABI))
    // Check that error toast was shown
    expect(addErrorToastMock).toHaveBeenCalledWith('Failed to transfer')
  })

  it('should handle confirming transfer error and show appropriate error message', async () => {
    const mockError = new Error('Confirmation failed')

    wrapper = createComponent()

    //@ts-expect-error not visible on wrapper.vm
    wrapper.vm.confirmingTransferError = mockError

    await wrapper.vm.$nextTick()

    expect(logErrorMock).toHaveBeenCalledWith(parseError(mockError, EXPENSE_ACCOUNT_EIP712_ABI))
    expect(addErrorToastMock).toHaveBeenCalledWith('Failed to transfer after approval')
  })

  it('should reset loading states when confirming transfer error occurs', async () => {
    const mockError = new Error('Confirmation failed')
    wrapper = createComponent()

    //@ts-expect-error not visible on wrapper.vm
    wrapper.vm.transferERC20loading = true
    //@ts-expect-error not visible on wrapper.vm
    wrapper.vm.isLoadingTransfer = true

    await flushPromises()
    //@ts-expect-error not visible on wrapper.vm
    wrapper.vm.confirmingTransferError = mockError

    await flushPromises()

    //@ts-expect-error not visible on wrapper.vm
    expect(wrapper.vm.transferERC20loading).toBe(false)
    //@ts-expect-error not visible on wrapper.vm
    expect(wrapper.vm.isLoadingTransfer).toBe(false)
  })
})
