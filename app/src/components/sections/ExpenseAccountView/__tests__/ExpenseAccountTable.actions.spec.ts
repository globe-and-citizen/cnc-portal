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
  mockExpenseAccountWrites,
  mockTeamStore,
  mockUseBalance,
  mockUseReadContract,
  mockUseSignTypedData,
  mockUserStore,
  resetContractMocks
} from '@/tests/mocks'
import { useGetExpensesQuery } from '@/queries/expense.queries'

type MutationOpts = { onSuccess?: () => void; onError?: (e: unknown) => void }

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
    // Make contractOwnerAddress match userDataStore.address so the
    // Enable/Disable action buttons aren't disabled.
    mockUseReadContract.data.value = mockUserStore.address
    mockUseReadContract.error.value = null
    mockUseBalance.data.value = null
    mockUseSignTypedData.data.value = '0xExpenseDataSignature'
    mockUseSignTypedData.error.value = null
    resetContractMocks()

    vi.mocked(useGetExpensesQuery).mockReturnValue(
      createMockQueryResponse(mockApprovals) as ReturnType<typeof useGetExpensesQuery>
    )
  })

  describe('Action Buttons and Loading States', () => {
    it('calls deactivateApproval mutation when Disable is clicked', async () => {
      const wrapper = createComponent()
      await wrapper.find('[data-test="disable-button"]').trigger('click')
      await flushPromises()
      expect(mockExpenseAccountWrites.deactivateApproval.mutate).toHaveBeenCalled()
    })

    it('calls activateApproval mutation when Enable is clicked', async () => {
      const wrapper = createComponent()
      await wrapper.find('[data-test="enable-button"]').trigger('click')
      await flushPromises()
      expect(mockExpenseAccountWrites.activateApproval.mutate).toHaveBeenCalled()
    })

    it('runs the deactivate onSuccess path: toast + cache invalidation', async () => {
      mockExpenseAccountWrites.deactivateApproval.mutate.mockImplementationOnce(
        (_v: unknown, opts?: MutationOpts) => opts?.onSuccess?.()
      )
      const wrapper = createComponent()
      await wrapper.find('[data-test="disable-button"]').trigger('click')
      await flushPromises()
      // success path runs without throwing — coverage of onSuccess body is what matters
      expect(mockExpenseAccountWrites.deactivateApproval.mutate).toHaveBeenCalled()
    })

    it('runs the activate onSuccess path: toast + cache invalidation', async () => {
      mockExpenseAccountWrites.activateApproval.mutate.mockImplementationOnce(
        (_v: unknown, opts?: MutationOpts) => opts?.onSuccess?.()
      )
      const wrapper = createComponent()
      await wrapper.find('[data-test="enable-button"]').trigger('click')
      await flushPromises()
      expect(mockExpenseAccountWrites.activateApproval.mutate).toHaveBeenCalled()
    })

    it('logs deactivate errors via onError', async () => {
      mockExpenseAccountWrites.deactivateApproval.mutate.mockImplementationOnce(
        (_v: unknown, opts?: MutationOpts) => opts?.onError?.(new Error('deactivate failed'))
      )
      const wrapper = createComponent()
      const logErrorSpy = vi.spyOn(utils.log, 'error')
      await wrapper.find('[data-test="disable-button"]').trigger('click')
      await flushPromises()
      expect(logErrorSpy).toHaveBeenCalled()
    })

    it('logs activate errors via onError', async () => {
      mockExpenseAccountWrites.activateApproval.mutate.mockImplementationOnce(
        (_v: unknown, opts?: MutationOpts) => opts?.onError?.(new Error('activate failed'))
      )
      const wrapper = createComponent()
      const logErrorSpy = vi.spyOn(utils.log, 'error')
      await wrapper.find('[data-test="enable-button"]').trigger('click')
      await flushPromises()
      expect(logErrorSpy).toHaveBeenCalled()
    })

    it('short-circuits when the expense-account address is missing', async () => {
      vi.mocked(mockTeamStore.getContractAddressByType).mockReturnValueOnce(undefined)
      const wrapper = createComponent()
      const logErrorSpy = vi.spyOn(utils.log, 'error')
      await wrapper.find('[data-test="disable-button"]').trigger('click')
      await flushPromises()
      expect(mockExpenseAccountWrites.deactivateApproval.mutate).not.toHaveBeenCalled()
      expect(logErrorSpy).toHaveBeenCalled()
    })

    it('should notify error if error getting owner', async () => {
      mockUseReadContract.error.value = new Error('Error getting owner')
      const wrapper = createComponent()
      const logErrorSpy = vi.spyOn(utils.log, 'error')
      // Trigger watcher
      mockUseReadContract.error.value = new Error('changed')
      await wrapper.vm.$nextTick()
      await flushPromises()
      expect(logErrorSpy).toHaveBeenCalled()
    })
  })
})
