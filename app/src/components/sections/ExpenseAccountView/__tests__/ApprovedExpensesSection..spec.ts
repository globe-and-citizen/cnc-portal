import { flushPromises, mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { createTestingPinia } from '@pinia/testing'
import ApprovedExpensesSection from '@/components/sections/ExpenseAccountView/ApprovedExpensesSection.vue'
import { ref } from 'vue'
import * as utils from '@/utils'
import { USDC_ADDRESS } from '@/constant'
import { parseEther, zeroAddress } from 'viem'

const DATE = new Date()

const mockExpenseDataStore = {
  allExpenseDataParsed: /*computed(() => (*/ [
    {
      signature: '0xSignature',
      approvedAddress: '0x123',
      budgetData: [
        { budgetType: 0, value: 10 },
        { budgetType: 1, value: 100 },
        { budgetType: 2, value: 10 }
      ],
      tokenAddress: USDC_ADDRESS,
      expiry: Math.floor(DATE.getTime() / 1000),
      status: 'enabled',
      id: 1,
      balances: {
        0: '0',
        1: '0',
        2: 0
      }
    }
  ] /*))*/,
  fetchAllExpenseData: vi.fn()
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

const mockUseReadContract = {
  data: ref('0xContractOwner'),
  error: ref<Error | null>(null),
  refetch: vi.fn()
}

const mockUseSignTypedData = {
  data: ref('0xSignature'),
  error: ref<Error | null>(null),
  signTypedDataAsync: vi.fn()
}

vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useReadContract: vi.fn(() => ({ ...mockUseReadContract })),
    useSignTypedData: vi.fn(() => ({ ...mockUseSignTypedData })),
    useChainId: vi.fn(() => ref(1)),
    useWriteContract: vi.fn(() => mockUseWriteContract),
    useWaitForTransactionReceipt: vi.fn(() => mockUseWaitForTransactionReceipt)
  }
})

vi.mock('vue-router', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useRoute: vi.fn(() => ({ params: { id: 1 } }))
  }
})

vi.mock('@/stores', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useTeamStore: vi.fn(() => ({
      team: {
        expenseAccountEip712Address: '0xExpenseAccount',
        ownerAddress: '0xOwner',
        boardOfDirectorsAddress: null
      },
      getTeam: vi.fn()
    })),
    useExpenseDataStore: vi.fn(() => ({
      ...mockExpenseDataStore
    }))
  }
})

vi.mock('@/composables/useCustomFetch', () => {
  return {
    useCustomFetch: vi.fn((url) => {
      const data = ref<unknown>(null)
      const error = ref(null)
      const isFetching = ref(false)
      const response = ref<Response | null>(null)

      const execute = vi.fn(() => {
        // Conditionally update `data` based on the URL argument
        // if (url === `teams/1`) {
        //   console.log(`[GET] team`)
        // } else if ()

        switch (url) {
          case 'teams/1':
            console.log(`[GET] team`)
            break
          case 'user/search':
            console.log(`[GET] user-search`)
            break
          case 'expense':
            console.log('[POST] expense-data')
            break
        }
      })

      const get = vi.fn(() => ({ get, json, execute, data, error, isFetching, response }))
      const json = vi.fn(() => ({ get, json, execute, data, error, isFetching, response }))
      const post = vi.fn(() => ({ get, json, execute, data, error, isFetching, response }))

      return { post, get, json, error, isFetching, execute, data, response }
    })
  }
})

describe.skip('ApprovedExpensesSection', () => {
  setActivePinia(createPinia())

  interface ComponentOptions {
    data?: () => Record<string, unknown>
    global?: Record<string, unknown>
  }

  const createComponent = ({ data = () => ({}), global = {} }: ComponentOptions = {}) => {
    return mount(ApprovedExpensesSection, {
      data,
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              user: { address: '0xContractOwner' }
            }
          })
        ],
        ...global
      }
    })
  }
  describe('Render', () => {
    it('should disable approve button if not contract owner', async () => {
      const wrapper = createComponent({
        global: {
          plugins: [
            createTestingPinia({
              createSpy: vi.fn,
              initialState: {
                user: { address: '0xInitialUser' }
              }
            })
          ]
        }
      })

      const approveUserButton = wrapper.findComponent({ name: 'ButtonUI' })
      expect(approveUserButton.exists()).toBeTruthy()
      expect(approveUserButton.props('disabled')).toBe(true)
    })

    it('should show appprove modal if approve button is clicked', async () => {
      const wrapper = createComponent()

      const approveUserButton = wrapper.findComponent({ name: 'ButtonUI' })
      expect(approveUserButton.exists()).toBeTruthy()
      expect(approveUserButton.props('disabled')).toBe(false)

      expect(wrapper.findComponent({ name: 'ApproveUsersEIP712Form' }).exists()).toBe(false)
      approveUserButton.trigger('click')

      await flushPromises()
      //@ts-expect-error: not visible on wrapper
      expect(wrapper.vm.approveUsersModal).toBe(true)
      const approveUsersForm = wrapper.findComponent({ name: 'ApproveUsersEIP712Form' })
      expect(approveUsersForm.exists()).toBe(true)
      const approvalModal = wrapper.findComponent({ name: 'ModalComponent' })
      expect(approvalModal.exists()).toBeTruthy()
      approvalModal.vm.toggleOpen = false
      await flushPromises()
      //@ts-expect-error: not visible on wrapper
      expect(wrapper.vm.approveUsersModal).toBe(false)
    })
  })
  describe('ApproveUsersForm', async () => {
    const wrapper = createComponent()
    const wrapperVm = wrapper.vm
    //@ts-expect-error: not visible in wrapper
    wrapperVm.team = {
      expenseAccountEip712Address: '0xExpenseAccount',
      ownerAddress: '0xOwner',
      boardOfDirectorsAddress: null
    }
    it('should pass corrent props to ApproveUsersForm', async () => {
      const approveUsersButton = wrapper.find('[data-test="approve-users-button"]')
      expect(approveUsersButton.exists()).toBe(true)
      expect((approveUsersButton.element as HTMLInputElement).disabled).toBe(false)
      approveUsersButton.trigger('click')
      await flushPromises()
      const approveUsersForm = wrapper.findComponent({ name: 'ApproveUsersEIP712Form' })
      expect(approveUsersForm.exists()).toBe(true)
      expect(approveUsersForm.props()).toEqual({
        formData: [{ name: '', address: '', isValid: false }],
        isBodAction: false,
        loadingApprove: false,
        users: []
      })
    })
    it('should approve user', async () => {
      mockUseSignTypedData.signTypedDataAsync.mockClear()
      const approveUsersForm = wrapper.findComponent({ name: 'ApproveUsersEIP712Form' })
      expect(approveUsersForm.exists()).toBe(true)

      const expiry = Math.floor(new Date().getTime() / 1000)

      const data = {
        approvedAddress: '0x123',
        budgetData: [
          { budgetType: 0, value: 10 },
          { budgetType: 1, value: 100 },
          { budgetType: 2, value: 10 }
        ],
        tokenAddress: USDC_ADDRESS,
        expiry
      }

      approveUsersForm.vm.$emit('approveUser', data)
      expect(approveUsersForm.emitted('approveUser')).toBeTruthy()
      await flushPromises()
      //@ts-expect-error: not visible from wrapper
      expect(wrapper.vm.expenseAccountData).toEqual({
        expenseAccountData: data,
        signature: '0xSignature'
      })

      const domain = {
        name: 'CNCExpenseAccount',
        version: '1',
        chainId: 1,
        verifyingContract: '0xExpenseAccount'
      }
      const types = {
        BudgetData: [
          { name: 'budgetType', type: 'uint8' },
          { name: 'value', type: 'uint256' }
        ],
        BudgetLimit: [
          { name: 'approvedAddress', type: 'address' },
          { name: 'budgetData', type: 'BudgetData[]' },
          { name: 'expiry', type: 'uint256' },
          { name: 'tokenAddress', type: 'address' }
        ]
      }
      const message = {
        ...data,
        budgetData: data.budgetData?.map((item) => ({
          ...item,
          value:
            item.budgetType === 0
              ? item.value
              : data.tokenAddress === zeroAddress
                ? parseEther(`${item.value}`)
                : BigInt(Number(item.value) * 1e6)
        }))
      }
      expect(mockUseSignTypedData.signTypedDataAsync).toBeCalledWith({
        types,
        primaryType: 'BudgetLimit',
        message,
        domain
      })
    })
    it('should give an error notification if sign typed data error occurs', async () => {
      const logErrorSpy = vi.spyOn(utils.log, 'error')
      mockUseSignTypedData.error.value = new Error('Error signing typed data')
      await flushPromises()
      //@ts-expect-error: not visible in wrapper
      expect(wrapper.vm.signTypedDataError).toEqual(new Error('Error signing typed data'))
      await flushPromises()
      expect(logErrorSpy).toBeCalledWith('signTypedDataError.value', 'Error signing typed data')
    })
  })
})
