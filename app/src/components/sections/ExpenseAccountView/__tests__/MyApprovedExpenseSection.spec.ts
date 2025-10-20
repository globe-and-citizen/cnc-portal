import { flushPromises, mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ExpenseAccountSection from '@/components/sections/ExpenseAccountView/MyApprovedExpenseSection.vue'
import { ref } from 'vue'
import { NETWORK, USDC_ADDRESS } from '@/constant'
import { createTestingPinia } from '@pinia/testing'
import { useWriteContract } from '@wagmi/vue'
import ButtonUI from '@/components/ButtonUI.vue'
import * as util from '@/utils'
import * as mocks from './mock/MyApprovedExpenseSection.mock'
import { EXPENSE_ACCOUNT_EIP712_ABI } from '@/artifacts/abi/expense-account-eip712'
import * as viem from 'viem'
import { estimateGas, readContract } from '@wagmi/core'
import { mockToastStore } from '@/tests/mocks/store.mock'
import { mockUseCurrencyStore } from '@/tests/mocks/index.mock'

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
vi.mock('@/stores', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useExpenseDataStore: vi.fn(() => ({
      ...mocks.mockExpenseDataStore,
      myApprovedExpenses: ref(mocks.mockExpenseData)
    })),
    useTeamStore: vi.fn(() => ({
      ...mocks.mockTeamStore
    })),
    useUserDataStore: vi.fn(() => ({
      address: '0x0123456789012345678901234567890123456789'
    }))
  }
})
vi.mock('@/stores/currencyStore', async (importOriginal) => {
  const original: object = await importOriginal()
  return {
    ...original,
    useCurrencyStore: vi.fn(() => ({ ...mockUseCurrencyStore }))
  }
})

const mockUseQuery = {
  result: ref({
    transactions: [
      {
        amount: '7000000',
        blockNumber: '33',
        blockTimestamp: Math.floor(Date.now() / 1000).toString(),
        contractAddress: '0x552a6b9d3c6ef286fb40eeae9e8cfecdab468c0a',
        contractType: 'ExpenseAccountEIP712',
        from: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
        id: '0xe5a1940c7d5b338a4383fed25d08d338efe17a40cd94d66677f374a81c0d2d3a01000000',
        to: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
        tokenAddress: '0x59b670e9fa9d0a427751af201d676719a970857b',
        transactionHash: '0xe5a1940c7d5b338a4383fed25d08d338efe17a40cd94d66677f374a81c0d2d3a',
        transactionType: 'deposit',
        __typename: 'Transfer'
      }
    ]
  }),
  error: ref<Error | null>(),
  loading: ref(false)
}

vi.mock('@vue/apollo-composable', async (importOriginal) => {
  const original: object = await importOriginal()
  return {
    ...original,
    useQuery: vi.fn(() => ({ ...mockUseQuery }))
  }
})

describe('ExpenseAccountSection', () => {
  // setActivePinia(createPinia())

  interface ComponentOptions {
    global?: Record<string, unknown>
  }

  const createComponent = ({ global = {} }: ComponentOptions = {}) => {
    return mount(ExpenseAccountSection, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn
          })
        ],
        ...global
      }
    })
  }

  describe.skip('Render', () => {
    beforeEach(() => {})
    it("should show the current user's approval data in the approval table", async () => {
      const wrapper = createComponent()
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
    })
    it.skip('should transfer from expense account', async () => {
      const executeExpenseAccountTransfer = vi.fn()
      //@ts-expect-error: TypeScript expects exact return type as original
      vi.mocked(useWriteContract).mockReturnValue({
        ...mocks.mockUseWriteContract,
        writeContract: executeExpenseAccountTransfer
      })

      // Mount the component
      const wrapper = createComponent()

      // console.log('wrapper.vm', wrapper.html())

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
        abi: EXPENSE_ACCOUNT_EIP712_ABI,
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
    it.skip('should notify amount withdrawn error', async () => {
      const wrapper = createComponent()
      const logErrorSpy = vi.spyOn(util.log, 'error')
      //@ts-expect-error: not visible from vm
      wrapper.vm.errorTransfer = new Error('Error getting amount withdrawn')
      await flushPromises()

      expect(mockToastStore.addErrorToast).toBeCalledWith('Failed to transfer')
      expect(logErrorSpy).toBeCalledWith('Error getting amount withdrawn')
    })
    it.skip('should call correct logs when transferNativeToken fails', async () => {
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
    it.skip('should call correct logs when transferErc20Token fails', async () => {
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
