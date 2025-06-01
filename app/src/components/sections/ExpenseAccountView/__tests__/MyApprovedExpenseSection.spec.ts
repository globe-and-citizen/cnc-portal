import { flushPromises, mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ExpenseAccountSection from '@/components/sections/ExpenseAccountView/MyApprovedExpenseSection.vue'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'
import { NETWORK, USDC_ADDRESS } from '@/constant'
import { createTestingPinia } from '@pinia/testing'
import { useWriteContract } from '@wagmi/vue'
import ButtonUI from '@/components/ButtonUI.vue'
import * as util from '@/utils'
import * as mocks from './mock/MyApprovedExpenseSection.mock'
import expenseAccountAbi from '@/artifacts/abi/expense-account-eip712.json'
import * as viem from 'viem'
import { estimateGas, readContract } from '@wagmi/core'
import { useExpenseDataStore, useTeamStore } from '@/stores'
import { mockToastStore } from '@/tests/mocks/store.mock'

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
    readContract: vi.fn(),
    estimateGas: vi.fn()
  }
})

vi.mock('viem', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    parseSignature: vi.fn(),
    hashTypedData: vi.fn(),
    keccak256: vi.fn(),
    encodeFunctionData: vi.fn()
  }
})

describe('ExpenseAccountSection', () => {
  setActivePinia(createPinia())

  interface ComponentOptions {
    global?: Record<string, unknown>
  }

  const createComponent = ({ global = {} }: ComponentOptions = {}) => {
    return mount(ExpenseAccountSection, {
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
    beforeEach(() => {
      //@ts-expect-error: TypeScript expects exact return type as original
      vi.mocked(useExpenseDataStore).mockReturnValue({ ...mocks.mockExpenseDataStore })
      //@ts-expect-error: TypeScript expects exact return type as original
      vi.mocked(useTeamStore).mockReturnValue({ ...mocks.mockTeamStore })
    })
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
      const spendButton = firstRow.findComponent(ButtonUI)
      expect(spendButton.exists()).toBeTruthy()
      expect(spendButton.props('disabled')).toBe(false)
      spendButton.trigger('click')
      await flushPromises()
      //@ts-expect-error: not visible from vm
      expect(wrapper.vm.signatureToTransfer).toBe('0xNativeTokenSignature')
      //@ts-expect-error: not visible from vm
      expect(wrapper.vm.tokens).toEqual([{ balance: '0', symbol: `${NETWORK.currencySymbol}` }])
    })
    it('should transfer from expense account', async () => {
      const executeExpenseAccountTransfer = vi.fn()
      //@ts-expect-error: TypeScript expects exact return type as original
      vi.mocked(useWriteContract).mockReturnValue({
        ...mocks.mockUseWriteContract,
        writeContract: executeExpenseAccountTransfer
      })

      // Mount the component
      const wrapper = createComponent()

      // Set up refs
      const vm = wrapper.vm
      //@ts-expect-error: not visible from vm
      vm.signatureToTransfer = '0xNativeTokenSignature'

      //@ts-expect-error: not visible from vm
      await vm.transferFromExpenseAccount('0xRecipientAddress', '1')

      //@ts-expect-error: not visible from vm
      expect(vm.tokenAmount).toBe('1')
      //@ts-expect-error: not visible from vm
      expect(vm.tokenRecipient).toBe('0xRecipientAddress')

      // Assert that executeExpenseAccountTransfer is called with correct arguments
      expect(executeExpenseAccountTransfer).toHaveBeenCalledWith({
        //@ts-expect-error: not visible from vm
        address: vm.expenseAccountEip712Address,
        args: [
          '0xRecipientAddress',
          viem.parseEther('1'), // Parsed amount
          {
            ...mocks.mockExpenseDataStore.myApprovedExpenses[0],
            budgetData: [
              { budgetType: 0, value: mocks.budgetData.txsPerPeriod },
              { budgetType: 1, value: viem.parseEther(`${mocks.budgetData.amountPerPeriod}`) },
              { budgetType: 2, value: viem.parseEther(`${mocks.budgetData.amountPerTransaction}`) }
            ]
          },
          '0xNativeTokenSignature'
        ],
        abi: expenseAccountAbi,
        functionName: 'transfer'
      })
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

      expect(mockToastStore.addErrorToast).toBeCalledWith('Failed to transfer')
      expect(logErrorSpy).toBeCalledWith('Error getting amount withdrawn')
    })
    it('should call correct logs when transferNativeToken fails', async () => {
      vi.mocked(estimateGas).mockRejectedValue(new Error('Error getting amount withdrawn'))
      const logErrorSpy = vi.spyOn(util.log, 'error')
      //@ts-expect-error: not visible from vm
      vi.mocked(useWriteContract).mockReturnValue(mocks.mockUseWriteContract)

      // Mount the component
      const wrapper = createComponent()

      // Set up refs
      const vm = wrapper.vm
      //@ts-expect-error: not visible from vm
      vm.signatureToTransfer = '0xNativeTokenSignature'
      //@ts-expect-error: not visible from vm
      await vm.transferFromExpenseAccount('0xRecipientAddress', '1')

      await flushPromises()
      expect(logErrorSpy).toBeCalledWith(
        'Error in transferNativeToken:',
        'Error getting amount withdrawn'
      )
      expect(mockToastStore.addErrorToast).toBeCalledWith('Failed to transfer')
      //@ts-expect-error: not visible from vm
      expect(vm.transferERC20loading).toBe(false)
      //@ts-expect-error: not visible from vm
      expect(vm.isLoadingTransfer).toBe(false)
    })
    it('should call correct logs when transferErc20Token fails', async () => {
      mocks.mockExpenseData[0].status = 'enabled'
      mocks.mockExpenseData[0].tokenAddress = USDC_ADDRESS
      vi.mocked(readContract).mockImplementation(async () => BigInt(2 * 1e6))
      vi.mocked(estimateGas).mockRejectedValue(new Error('Error getting erc20 allowance'))
      const logErrorSpy = vi.spyOn(util.log, 'error')
      //@ts-expect-error: not visible from vm
      vi.mocked(useWriteContract).mockReturnValue(mocks.mockUseWriteContract)

      // Mount the component
      const wrapper = createComponent()

      // Set up refs
      const vm = wrapper.vm
      //@ts-expect-error: not visible from vm
      vm.signatureToTransfer = '0xNativeTokenSignature'
      //@ts-expect-error: not visible from vm
      await vm.transferFromExpenseAccount('0xRecipientAddress', '1')

      await flushPromises()
      expect(logErrorSpy).toBeCalledWith(
        'Error in transferErc20Token:',
        new Error('Error getting erc20 allowance')
      )
      expect(mockToastStore.addErrorToast).toBeCalledWith('Failed to transfer')
      //@ts-expect-error: not visible from vm
      expect(vm.transferERC20loading).toBe(false)
      //@ts-expect-error: not visible from vm
      expect(vm.isLoadingTransfer).toBe(false)
    })
  })
})
