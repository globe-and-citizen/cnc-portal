import { flushPromises, mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import ExpenseAccountSection from '@/components/sections/ExpenseAccountView/MyApprovedExpenseSection.vue'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'
import { NETWORK /*, USDC_ADDRESS*/ } from '@/constant'
import { createTestingPinia } from '@pinia/testing'
// import TransferForm from '@/components/forms/TransferForm.vue'
// import * as viem from 'viem'
import ButtonUI from '@/components/ButtonUI.vue'
import * as util from '@/utils'
import * as mocks from './mock/MyApprovedExpenseSection.mock'

const _mocks = vi.hoisted(() => ({
  mockUseToastStore: {
    addErrorToast: vi.fn()
  },
  mockReadContract: vi.fn()
}))

vi.mock('@/stores', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useToastStore: vi.fn(() => ({ addErrorToast: _mocks.mockUseToastStore.addErrorToast })),
    useTeamStore: vi.fn(() => ({ ...mocks.mockTeamStore })),
    useExpenseDataStore: vi.fn(() => ({ ...mocks.mockExpenseDataStore })),
    useCryptoPrice: vi.fn(),
    useCurrencyStore: vi.fn(() => ({
      currency: {
        code: 'USD',
        symbol: '$'
      }
    }))
  }
})

// Mocking wagmi functions
vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useReadContract: vi.fn(() => {
      return { ...mocks.mockUseReadContract, data: ref(`0xContractOwner`) }
    }),
    useWriteContract: vi.fn(() => mocks.mockUseWriteContract),
    useWaitForTransactionReceipt: vi.fn(() => mocks.mockUseWaitForTransactionReceipt),
    useBalance: vi.fn(() => mocks.mockUseBalance),
    useChainId: vi.fn(() => ref('0xChainId')),
    useSignTypedData: vi.fn(() => mocks.mockUseSignTypedData)
  }
})

vi.mock('@wagmi/core', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    readContract: _mocks.mockReadContract
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

describe('ExpenseAccountSection', () => {
  setActivePinia(createPinia())

  interface ComponentOptions {
    global?: Record<string, unknown>
  }

  const createComponent = ({ global = {} }: ComponentOptions = {}) => {
    return mount(ExpenseAccountSection, {
      // data,
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              user: { address: '0x0123456789012345678901234567890123456789' }
            }
          })
        ],
        ...global
      }
    })
  }

  describe('Render', () => {
    it("should show the current user's approval data in the approval table", async () => {
      const wrapper = createComponent()
      await flushPromises()

      await flushPromises()
      const expenseAccountTable = wrapper.findComponent({ name: 'TableComponent' })
      expect(expenseAccountTable.exists()).toBeTruthy()
      expect(expenseAccountTable.find('[data-test="table"]').exists()).toBeTruthy()
      const firstRow = expenseAccountTable.find('[data-test="0-row"]')
      expect(firstRow.exists()).toBeTruthy()

      expect(firstRow.html()).toContain(
        `${mocks.budgetData.amountPerTransaction} ${NETWORK.currencySymbol}`
      )
      expect(firstRow.html()).toContain('Spend')
    })
    it('should disable the transfer button if the approval is disapproved', async () => {
      mocks.mockExpenseData[0].status = 'disabled'
      const wrapper = createComponent()
      await flushPromises()

      const expenseAccountTable = wrapper.findComponent({ name: 'TableComponent' })
      expect(expenseAccountTable.exists()).toBeTruthy()
      expect(expenseAccountTable.find('[data-test="table"]').exists()).toBeTruthy()
      const firstRow = expenseAccountTable.find('[data-test="0-row"]')
      expect(firstRow.exists()).toBeTruthy()

      expect(firstRow.html()).toContain('20')

      const spendButton = firstRow.findComponent(ButtonUI)
      expect(spendButton.exists()).toBeTruthy()
      expect(spendButton.props('disabled')).toBe(true)
    })
    it('should notify amount withdrawn error', async () => {
      const wrapper = createComponent()
      const logErrorSpy = vi.spyOn(util.log, 'error')
      //@ts-expect-error: not visible from vm
      wrapper.vm.errorTransfer = new Error('Error getting amount withdrawn')
      await flushPromises()

      expect(_mocks.mockUseToastStore.addErrorToast).toBeCalledWith('Failed to transfer')
      expect(logErrorSpy).toBeCalledWith('Error getting amount withdrawn')
    })
  })
})
