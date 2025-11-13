import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import { config } from '@/wagmi.config'
import { log } from '@/utils'
import { parseError } from '@/utils'
import { CASH_REMUNERATION_EIP712_ABI } from '@/artifacts/abi/cash-remuneration-eip712'
import CRWithdrawClaim from '../CRWithdrawClaim.vue'
import { mockToastStore, mockTeamStore } from '@/tests/mocks/store.mock'
import { getBalance } from 'viem/actions'
import type { WeeklyClaim } from '@/types'
import { parseEther, type Address } from 'viem'
import { useTeamStore } from '@/stores'

// Mock the dependencies
vi.mock('@/wagmi.config', () => ({
  config: {
    getClient: vi.fn()
  }
}))

const { addErrorToast: addErrorToastMock, addSuccessToast: addSuccessToastMock } = mockToastStore

const { useWriteContract, simulateContractMock, waitForTransactionReceiptMock } = vi.hoisted(
  () => ({
    useWriteContract: vi.fn(),
    simulateContractMock: vi.fn(),
    waitForTransactionReceiptMock: vi.fn()
  })
)

vi.mock('@wagmi/vue', () => ({
  useWriteContract: useWriteContract
}))

vi.mock('@wagmi/core', () => ({
  simulateContract: simulateContractMock,
  waitForTransactionReceipt: waitForTransactionReceiptMock
}))

vi.mock('@/utils', () => ({
  log: {
    error: vi.fn()
  },
  parseError: vi.fn(() => 'Parsed error message')
}))

vi.mock('@/composables', () => ({
  useCustomFetch: vi.fn(() => ({
    put: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnValue({
      execute: vi.fn().mockResolvedValue({}),
      error: ref(null)
    })
  }))
}))

vi.mock('@tanstack/vue-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn()
  })
}))

vi.mock('viem/actions', () => ({
  getBalance: vi.fn()
}))

// Mock the component
const MockButtonUI = {
  template: '<button @click="$emit(\'click\')"><slot></slot></button>'
}

const mockWeeklyClaim: WeeklyClaim = {
  id: 1,
  status: 'signed',
  weekStart: new Date().toISOString(),
  data: {
    ownerAddress: '0xOwnerAddress' as Address
  },
  memberAddress: '0xEmployeeAddress' as Address,
  teamId: 1,
  signature: '0xSignature',
  wageId: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  hoursWorked: 40,
  wage: {
    id: 1,
    teamId: 1,
    userAddress: '0xEmployeeAddress' as Address,
    ratePerHour: [
      {
        type: 'native' as const,
        amount: 0.1
      }
    ],
    maximumHoursPerWeek: 40,
    nextWageId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  claims: [
    {
      id: 1,
      hoursWorked: 8,
      dayWorked: new Date().toISOString(),
      memo: 'Worked on project',
      wageId: 1,
      wage: {
        id: 1,
        teamId: 1,
        userAddress: '0xEmployeeAddress' as Address,
        ratePerHour: [
          {
            type: 'native' as const,
            amount: 0.1
          }
        ],
        maximumHoursPerWeek: 40,
        nextWageId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]
}

describe('WithdrawComponent', () => {
  let wrapper
  let logErrorMock: unknown

  // Component factory function
  const createComponent = (props = {}) => {
    return mount(CRWithdrawClaim, {
      global: {
        components: {
          ButtonUI: MockButtonUI
        }
      },
      props: {
        weeklyClaim: mockWeeklyClaim,
        disabled: false,
        ...props
      }
    })
  }

  // Mock setup function
  const setupMocks = (
    options: {
      writeContractAsync?: (...args: unknown[]) => Promise<unknown>
      getBalanceValue?: string
      waitForReceiptStatus?: string
      updateClaimError?: unknown
    } = {}
  ) => {
    const {
      writeContractAsync = vi.fn().mockResolvedValue('0xTransactionHash'),
      getBalanceValue = '100', // Sufficient balance
      waitForReceiptStatus = 'success'
    } = options

    useWriteContract.mockReturnValue({
      writeContractAsync
    })

    vi.mocked(getBalance).mockResolvedValue(parseEther(getBalanceValue))

    waitForTransactionReceiptMock.mockResolvedValue({
      status: waitForReceiptStatus
    })

    // Get mock references
    logErrorMock = vi.spyOn(log, 'error')
  }

  beforeEach(async () => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    setupMocks()
  })

  it('should call simulateContract with correct arguments when withdrawing claim', async () => {
    wrapper = createComponent()

    // Trigger the withdraw function
    //@ts-expect-error not visible on wrapper.vm
    await wrapper.vm.withdrawClaim()

    // Check that simulateContract was called with correct arguments
    expect(simulateContractMock).toHaveBeenCalledWith(config, {
      abi: CASH_REMUNERATION_EIP712_ABI,
      functionName: 'withdraw',
      address: expect.any(String), // cashRemunerationEip712Address value
      args: [
        {
          hoursWorked: 40,
          employeeAddress: '0xEmployeeAddress',
          date: expect.any(BigInt),
          wages: [
            {
              hourlyRate: parseEther('0.1'), // BigInt(100000000000000000), // 0.1 ETH in wei
              tokenAddress: '0x0000000000000000000000000000000000000000'
            }
          ]
        },
        '0xSignature'
      ]
    })
  })

  it('should log error and parse error when withdraw fails', async () => {
    const mockError = new Error('Withdraw failed')
    simulateContractMock.mockRejectedValue(mockError)

    wrapper = createComponent()

    // Trigger the withdraw function which should fail
    //@ts-expect-error not visible on wrapper.vm
    await wrapper.vm.withdrawClaim()

    // Check that log.error was called with the error
    expect(logErrorMock).toHaveBeenCalledWith('Withdraw error', mockError)

    // Check that parseError was called with correct arguments
    expect(parseError).toHaveBeenCalledWith(mockError, CASH_REMUNERATION_EIP712_ABI)
  })

  it('should show generic error toast when withdraw fails with non-specific error', async () => {
    const mockError = new Error('Some generic error')
    simulateContractMock.mockRejectedValue(mockError)

    wrapper = createComponent()

    // Trigger the withdraw function which should fail
    //@ts-expect-error not visible on wrapper.vm
    await wrapper.vm.withdrawClaim()

    // Check that generic error toast was shown
    expect(addErrorToastMock).toHaveBeenCalledWith('Parsed error message')
    simulateContractMock.mockReset()
  })

  it('should show insufficient balance error when contract has insufficient funds', async () => {
    // Mock insufficient balance
    setupMocks({ getBalanceValue: '0.001' }) // Very low balance
    wrapper = createComponent()

    // Trigger the withdraw function
    //@ts-expect-error not visible on wrapper.vm
    await wrapper.vm.withdrawClaim()

    // Should show insufficient balance error and not call simulateContract
    expect(addErrorToastMock).toHaveBeenCalledWith('Insufficient balance')
    expect(simulateContractMock).not.toHaveBeenCalled()
  })

  it('should handle transaction failure after successful simulation', async () => {
    // Mock transaction failure
    setupMocks({ waitForReceiptStatus: 'reverted' })

    wrapper = createComponent()

    // Trigger the withdraw function
    //@ts-expect-error not visible on wrapper.vm
    await wrapper.vm.withdrawClaim()

    // Should show transaction failed error
    expect(addErrorToastMock).toHaveBeenCalledWith('Transaction failed: Failed to withdraw claim')
  })

  it('should handle update claim status error after successful withdrawal', async () => {
    // Mock update claim error
    const { useCustomFetch } = await import('@/composables')
    //@ts-expect-error only mocking required values
    vi.mocked(useCustomFetch).mockReturnValue({
      put: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnValue({
        execute: vi.fn().mockResolvedValue({}),
        error: ref(new Error('Update failed'))
      })
    })

    wrapper = createComponent()

    // Trigger the withdraw function
    //@ts-expect-error not visible on wrapper.vm
    await wrapper.vm.withdrawClaim()

    // Should show update claim status error
    expect(addErrorToastMock).toHaveBeenCalledWith('Failed to update Claim status')
    expect(addSuccessToastMock).toHaveBeenCalledWith('Claim withdrawn')
  })

  it('should handle missing team contract address gracefully', async () => {
    //@ts-expect-error only mocking required values
    vi.mocked(useTeamStore).mockReturnValue({
      ...mockTeamStore,
      getContractAddressByType: vi.fn().mockReturnValue(undefined)
    })
    wrapper = createComponent()

    // Trigger the withdraw function
    //@ts-expect-error not visible on wrapper.vm
    await wrapper.vm.withdrawClaim()

    // Should log error about missing contract address
    expect(addErrorToastMock).toHaveBeenCalledWith(
      'Cash Remuneration EIP712 contract address not found'
    )
    //@ts-expect-error not visible on wrapper.vm
    expect(wrapper.vm.isLoading).toBe(false)
  })
})
