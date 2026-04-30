import { flushPromises, mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ExpenseAccountTable from '../ExpenseAccountTable.vue'
import { setActivePinia, createPinia } from 'pinia'
import { createTestingPinia } from '@pinia/testing'
import { USDC_ADDRESS } from '@/constant'
import { zeroAddress } from 'viem'
import * as utils from '@/utils'
import {
  createMockQueryResponse,
  mockUseBalance,
  mockUseReadContract,
  mockUseSignTypedData,
  mockUseWaitForTransactionReceipt
} from '@/tests/mocks'
import { useGetExpensesQuery } from '@/queries/expense.queries'

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
    mockUseReadContract.data.value = '0xContractOwner'
    mockUseReadContract.error.value = null
    mockUseBalance.data.value = null
    mockUseSignTypedData.data.value = '0xExpenseDataSignature'
    mockUseSignTypedData.error.value = null
    mockUseWaitForTransactionReceipt.isLoading.value = false
    mockUseWaitForTransactionReceipt.isSuccess.value = false

    vi.mocked(useGetExpensesQuery).mockReturnValue(
      createMockQueryResponse(mockApprovals) as ReturnType<typeof useGetExpensesQuery>
    )
  })

  describe('Action Buttons and Loading States', () => {
    it('should notify success if activate successful', async () => {
      const wrapper = createComponent()
      wrapper.vm.isConfirmingActivate = true
      await flushPromises()
      wrapper.vm.isConfirmingActivate = false
      wrapper.vm.isConfirmedActivate = { value: true }
      await flushPromises()
    })

    it('should notify success if deactivate successful', async () => {
      const wrapper = createComponent()
      wrapper.vm.isConfirmingDeactivate = true
      await flushPromises()
      wrapper.vm.isConfirmingDeactivate = false
      wrapper.vm.isConfirmedDeactivate = { value: true }
      await flushPromises()
    })

    it('should notify error if error deactivate approval', async () => {
      const wrapper = createComponent()
      const logErrorSpy = vi.spyOn(utils.log, 'error')
      wrapper.vm.errorDeactivateApproval = new Error(`Error deactivating approval`)
      await flushPromises()
      expect(logErrorSpy).toBeCalledWith('Parsed error message')
    })

    it('should notify error if error activate approval', async () => {
      const wrapper = createComponent()
      const logErrorSpy = vi.spyOn(utils.log, 'error')
      wrapper.vm.errorActivateApproval = new Error(`Error activating approval`)
      await flushPromises()
      expect(logErrorSpy).toBeCalledWith('Parsed error message')
    })

    it('should notify error if error getting owner', async () => {
      const wrapper = createComponent()
      const logErrorSpy = vi.spyOn(utils.log, 'error')
      wrapper.vm.errorGetOwner = new Error(`Error getting owner`)
      await flushPromises()
      expect(logErrorSpy).toBeCalledWith('Parsed error message')
    })
  })
})
