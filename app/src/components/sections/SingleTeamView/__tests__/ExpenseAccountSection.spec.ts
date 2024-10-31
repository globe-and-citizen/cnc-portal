import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import ExpenseAccountSection from '@/components/sections/SingleTeamView/ExpenseAccountSection.vue'
import { ClipboardDocumentListIcon, ClipboardDocumentCheckIcon } from '@heroicons/vue/24/outline'
import { setActivePinia, createPinia } from 'pinia'
import { ref, type Ref } from 'vue'
// import { NETWORK } from '@/constant'
import { createTestingPinia } from '@pinia/testing'
import TransferFromBankForm from '@/components/forms/TransferFromBankForm.vue'
import SetLimitForm from '../forms/SetLimitForm.vue'
import ApproveUsersForm from '../forms/ApproveUsersForm.vue'
import type { User } from '@/types'

interface ComponentData {
  transferModal: boolean
  setLimitModal: boolean
  approveUsersModal: boolean
  approvedAddresses: Set<string>
  unapprovedAddresses: Set<string>
  foundUsers: User[]
  action: string
  transferFromExpenseAccount: (to: string, amount: string) => Promise<void>
  setExpenseAccountLimit: (amount: Ref) => Promise<void>
  approveAddress: (address: string) => Promise<void>
  disapproveAddress: (address: string) => Promise<void>
  isBodAction: () => boolean
  init: () => Promise<void>
}
const mockUseReadContract = {
  data: ref<string | null>(null),
  isLoading: ref(false),
  error: ref(null),
  refetch: vi.fn()
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
const mockUseSendTransaction = {
  isPending: ref(false),
  error: ref(false),
  data: ref<string>(''),
  sendTransaction: vi.fn()
}
const mockUseBalance = {
  data: ref<string | null>(null),
  isLoading: ref(false),
  error: ref(null),
  refetch: vi.fn()
}

// Mocking wagmi functions
vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: Object = await importOriginal()
  return {
    ...actual,
    useReadContract: vi.fn(() => mockUseReadContract),
    useWriteContract: vi.fn(() => mockUseWriteContract),
    useWaitForTransactionReceipt: vi.fn(() => mockUseWaitForTransactionReceipt),
    useSendTransaction: vi.fn(() => mockUseSendTransaction),
    useBalance: vi.fn(() => mockUseBalance)
  }
})
vi.mock('@/services/expenseAccountService', async (importOriginal) => {
  const actual: Object = await importOriginal()

  const ExpenseAccountService = vi.fn()
  ExpenseAccountService.prototype.getFunctionSignature = vi.fn()
  return {
    ...actual,
    ExpenseAccountService
  }
})

vi.mock('@/adapters/web3LibraryAdapter', async (importOriginal) => {
  const actual: Object = await importOriginal()

  // Step 2: Mock the class itself and its instance methods
  const EthersJsAdapter = vi.fn()
  EthersJsAdapter.prototype.parseEther = vi.fn((amount: string) => `${amount}*10^18`)

  // Step 3: Mock the static method getInstance
  //@ts-ignore
  EthersJsAdapter['getInstance'] = vi.fn()

  return { ...actual, EthersJsAdapter }
})

const mockCopy = vi.fn()
const mockClipboard = {
  copy: mockCopy,
  copied: ref(false),
  isSupported: ref(true)
}

vi.mock('@vueuse/core', async (importOriginal) => {
  const actual: Object = await importOriginal()
  return {
    ...actual,
    useClipboard: vi.fn(() => mockClipboard)
  }
})

const mockDeployExpenseAccount = {
  data: ref<string | null>(null),
  isLoading: ref(false),
  isSuccess: ref(false),
  error: ref(null),
  execute: vi.fn()
}

const mockExpenseAccountGetBalance = {
  data: ref<string | null>(null),
  isLoading: ref(false),
  isSuccess: ref(false),
  error: ref(null),
  execute: vi.fn()
}

const mockExpenseAccountGetMaxLimit = {
  data: ref<string | null>(null),
  isLoading: ref(false),
  isSuccess: ref(false),
  error: ref(null),
  execute: vi.fn()
}

const mockExpenseAccountIsApprovedAddress = {
  data: ref<boolean>(false),
  isLoading: ref(false),
  isSuccess: ref(false),
  error: ref(null),
  execute: vi.fn((expenseAccountAddress: string, memberAddress: string) => {
    if (
      expenseAccountAddress === '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' && // Expense Account Address
      memberAddress === '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199' // Approved Address
    ) {
      mockExpenseAccountIsApprovedAddress.data.value = true
    } else {
      mockExpenseAccountIsApprovedAddress.data.value = false
    }
  })
}

const mockExpenseAccountGetOwner = {
  data: ref<string | null>(null),
  loading: ref(false),
  error: ref(null),
  isSuccess: ref(false),
  execute: vi.fn(() => {
    mockExpenseAccountGetOwner.data.value = `0xContractOwner`
  })
}

const mockExpenseAccountSetMaxLimit = {
  isLoading: ref(false),
  error: ref<unknown>(null),
  isSuccess: ref(false),
  execute: vi.fn((expenseAccountAddress: string, amount: string) => {
    if (expenseAccountAddress && !isNaN(Number(amount)))
      mockExpenseAccountSetMaxLimit.isSuccess.value = true
    else mockExpenseAccountSetMaxLimit.error.value = 'An error has occured'
  })
}

vi.mock('@/composables/useExpenseAccount', async (importOriginal) => {
  const actual: Object = await importOriginal()
  return {
    ...actual,
    useExpenseAccountGetMaxLimit: vi.fn(() => mockExpenseAccountGetMaxLimit),
    useExpenseAccountGetBalance: vi.fn(() => mockExpenseAccountGetBalance),
    useDeployExpenseAccountContract: vi.fn(() => mockDeployExpenseAccount),
    useExpenseAccountIsApprovedAddress: vi.fn(() => mockExpenseAccountIsApprovedAddress),
    useExpenseAccountGetOwner: vi.fn(() => mockExpenseAccountGetOwner),
    useExpenseAccountSetLimit: vi.fn(() => mockExpenseAccountSetMaxLimit)
  }
})

const mockGetBoardOfDirectors = {
  boardOfDirectors: ref<string[] | null>(null),
  execute: vi.fn()
}

const mockAddAction = {
  isLoading: ref(false),
  error: ref<unknown>(null),
  isSuccess: ref(true),
  execute: vi.fn()
}

vi.mock('@/composables/bod', async (importOriginal) => {
  const actual: Object = await importOriginal()
  return {
    ...actual,
    useGetBoardOfDirectors: vi.fn(() => mockGetBoardOfDirectors),
    useAddAction: vi.fn(() => mockAddAction)
  }
})

describe('ExpenseAccountSection', () => {
  setActivePinia(createPinia())

  interface Props {
    team?: {}
  }

  interface ComponentOptions {
    props?: Props
    data?: () => Record<string, unknown>
    global?: Record<string, unknown>
  }

  const createComponent = ({
    props = {},
    data = () => ({}),
    global = {}
  }: ComponentOptions = {}) => {
    return mount(ExpenseAccountSection, {
      props: {
        team: {
          expenseAccountAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // Expense Account Address
          ownerAddress: '0xOwner',
          boardOfDirectorsAddress: null,
          ...props?.team
        },
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

  describe('Render', () => {
    it('should show expense account if expense account address exists', () => {
      const team = { expenseAccountAddress: '0x123' }
      const wrapper = createComponent({
        props: {
          team: {
            ...team
          }
        }
      })

      expect(wrapper.find('[data-test="expense-account-address"]').exists()).toBeTruthy()
      expect(wrapper.find('[data-test="expense-account-address"]').text()).toBe(
        team.expenseAccountAddress
      )

      // ToolTip
      const expenseAccountAddressTooltip = wrapper
        .find('[data-test="expense-account-address-tooltip"]')
        .findComponent({ name: 'ToolTip' })
      expect(expenseAccountAddressTooltip.exists()).toBeTruthy()
      expect(expenseAccountAddressTooltip.props().content).toBe(
        'Click to see address in block explorer'
      )
    })

    it('should hide create button if contract is being deployed', async () => {
      const team = { expenseAccountAddress: null }
      const wrapper = createComponent({
        props: {
          team: {
            ...team
          }
        }
      })

      mockDeployExpenseAccount.isLoading.value = true
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="create-expense-account"]').exists()).toBeFalsy()
    })
    it('should show copy to clipboard icon with tooltip if expense account address exists', () => {
      const wrapper = createComponent()

      expect(wrapper.findComponent(ClipboardDocumentListIcon).exists()).toBe(true)

      // ToolTip
      const copyAddressTooltip = wrapper.find('[data-test="copy-address-tooltip"]').findComponent({
        name: 'ToolTip'
      })
      expect(copyAddressTooltip.exists()).toBeTruthy()
      expect(copyAddressTooltip.props().content).toBe('Click to copy address')
    })
    it('should not show copy to clipboard icon if copy not supported', async () => {
      const wrapper = createComponent()

      // mock clipboard
      mockClipboard.isSupported.value = false
      await wrapper.vm.$nextTick()

      expect(wrapper.findComponent(ClipboardDocumentListIcon).exists()).toBe(false)
    })

    it('should change the copy icon when copied', async () => {
      const wrapper = createComponent()

      // mock clipboard
      mockClipboard.isSupported.value = false
      mockClipboard.copied.value = true
      await wrapper.vm.$nextTick()

      expect(wrapper.findComponent(ClipboardDocumentCheckIcon).exists()).toBe(true)
    })
    it('should change tooltip text to be "Copied!" when copied', async () => {
      const wrapper = createComponent()

      // mock clipboard
      mockClipboard.isSupported.value = false
      mockClipboard.copied.value = true
      await wrapper.vm.$nextTick()

      const copyAddressTooltip = wrapper.find('[data-test="copy-address-tooltip"]').findComponent({
        name: 'ToolTip'
      })
      expect(copyAddressTooltip.props().content).toBe('Copied!')
    })
    it('should show animation if balance loading', async () => {
      const wrapper = createComponent()

      mockExpenseAccountGetBalance.isLoading.value = true
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="balance-loading"]').exists()).toBeTruthy()
    })
    it('should show animation if balance not present', async () => {
      const wrapper = createComponent()

      mockExpenseAccountGetBalance.data.value = null
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="balance-loading"]').exists()).toBeTruthy()
    })

    it('should show animation if max limit loading', async () => {
      const wrapper = createComponent()

      mockExpenseAccountGetMaxLimit.isLoading.value = true
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="max-limit-loading"]').exists()).toBeTruthy()
    })
    it('should show animation if max limit not present', async () => {
      const wrapper = createComponent()

      mockExpenseAccountGetMaxLimit.isLoading.value = false
      mockExpenseAccountGetMaxLimit.data.value = null
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="max-limit-loading"]').exists()).toBeTruthy()
    })
    // it('should show max limit amount', async () => {
    //   const wrapper = createComponent()

    //   const maxLimit = '0.0'
    //   mockExpenseAccountGetMaxLimit.data.value = maxLimit
    //   await wrapper.vm.$nextTick()

    //   expect(wrapper.find('[data-test="max-limit"]').text()).toBe(
    //     `${maxLimit} ${NETWORK.currencySymbol}`
    //   )
    // })
    it('should disable the transfer button if user not approved', async () => {
      const wrapper = createComponent()

      const button = wrapper.find('[data-test="transfer-button"]')
      expect(button.exists()).toBeTruthy()
      expect((button.element as HTMLButtonElement).disabled).toBe(true) // Button should be disabled
    })
    it('should enable the transfer button if user approved', async () => {
      const wrapper = createComponent()

      ;(wrapper.vm as unknown as ComponentData).approvedAddresses = new Set(['0xInitialUser'])

      await wrapper.vm.$nextTick()

      const button = wrapper.find('[data-test="transfer-button"]')
      expect(button.exists()).toBeTruthy()

      // Cast to HTMLButtonElement
      expect(button.attributes().disabled).toBeUndefined() // Button should be enabled
    })
    it('should show the set limit button if is the owner', async () => {
      const wrapper = createComponent({
        global: {
          plugins: [
            createTestingPinia({
              createSpy: vi.fn,
              initialState: {
                user: { address: null }
              }
            })
          ]
        }
      })
      const button = wrapper.find('[data-test="set-limit-button"]')
      expect(button.exists()).toBeTruthy()
    })
    it('should hide the set limit button if is not the owner', async () => {
      const wrapper = createComponent()
      const button = wrapper.find('[data-test="set-limit-button"]')
      expect(button.exists()).toBeFalsy()
    })
    it('should show the approve users button if is the owner', async () => {
      const wrapper = createComponent({
        global: {
          plugins: [
            createTestingPinia({
              createSpy: vi.fn,
              initialState: {
                user: { address: null }
              }
            })
          ]
        }
      })
      const button = wrapper.find('[data-test="approve-users-button"]')
      expect(button.exists()).toBeTruthy()
    })
    it('should hide the approve users button if is not the owner', async () => {
      const wrapper = createComponent()
      const button = wrapper.find('[data-test="approve-users-button"]')
      expect(button.exists()).toBeFalsy()
    })
    it('should show transfer modal', async () => {
      const wrapper = createComponent()

      ;(wrapper.vm as unknown as ComponentData).approvedAddresses = new Set(['0xInitialUser'])

      await wrapper.vm.$nextTick()

      const transferButton = wrapper.find('[data-test="transfer-button"]')

      await transferButton.trigger('click')
      await wrapper.vm.$nextTick()
      expect((wrapper.vm as unknown as ComponentData).transferModal).toBeTruthy()

      const transferFromBankForm = wrapper.findComponent(TransferFromBankForm)
      expect(transferFromBankForm.exists()).toBe(true)
    })
    it('should show set limit modal', async () => {
      const wrapper = createComponent({
        global: {
          plugins: [
            createTestingPinia({
              createSpy: vi.fn,
              initialState: {
                user: { address: null }
              }
            })
          ]
        }
      })

      const setLimitButton = wrapper.find('[data-test="set-limit-button"]')

      await setLimitButton.trigger('click')
      await wrapper.vm.$nextTick()
      expect((wrapper.vm as unknown as ComponentData).setLimitModal).toBeTruthy()
      expect(wrapper.findComponent(SetLimitForm).exists()).toBe(true)
    })
    it('should show approve users modal', async () => {
      const wrapper = createComponent({
        global: {
          plugins: [
            createTestingPinia({
              createSpy: vi.fn,
              initialState: {
                user: { address: null }
              }
            })
          ]
        }
      })

      const approveUsersButton = wrapper.find('[data-test="approve-users-button"]')

      await approveUsersButton.trigger('click')
      await wrapper.vm.$nextTick()
      expect((wrapper.vm as unknown as ComponentData).approveUsersModal).toBeTruthy()
      expect(wrapper.findComponent(ApproveUsersForm).exists()).toBe(true)
    })
    describe('TransferFromBankForm', async () => {
      const wrapper = createComponent()
      ;(wrapper.vm as unknown as ComponentData).transferModal = true

      it('should pass corrent props to TransferFromBankForm', async () => {
        ;(wrapper.vm as unknown as ComponentData).foundUsers = [
          { name: 'John Doe', address: '0x1234' }
        ]
        await wrapper.vm.$nextTick()

        const transferFromBankForm = wrapper.findComponent(TransferFromBankForm)
        expect(transferFromBankForm.exists()).toBe(true)
        expect(transferFromBankForm.props()).toEqual({
          filteredMembers: [{ name: 'John Doe', address: '0x1234' }],
          service: 'Expense Account',
          bankBalance: 'undefined',
          loading: false,
          asBod: false
        })
      })
      it('should call transferFromExpenseAccount when @transfer is emitted', async () => {
        const transferForm = wrapper.findComponent(TransferFromBankForm)
        const transferFromBankForm = wrapper.findComponent(TransferFromBankForm)
        expect(transferFromBankForm.exists()).toBe(true)

        const spy = vi.spyOn(wrapper.vm as unknown as ComponentData, 'transferFromExpenseAccount')

        transferForm.vm.$emit('transfer', '0xRecipientAddress', '500')
        expect(spy).toHaveBeenCalledWith('0xRecipientAddress', '500')
      })
      it('should close the modal when TransferFromBankForm @close-modal is emitted', async () => {
        const transferForm = wrapper.findComponent(TransferFromBankForm)

        transferForm.vm.$emit('closeModal')
        expect((wrapper.vm as unknown as ComponentData).transferModal).toBe(false)
      })
    })

    describe('SetLimitForm', async () => {
      const wrapper = createComponent()

      ;(wrapper.vm as unknown as ComponentData).setLimitModal = true

      // it('should pass corrent props to TransferFromBankForm', async () => {
      //   await wrapper.vm.$nextTick()

      //   const setLimitForm = wrapper.findComponent(SetLimitForm)
      //   expect(setLimitForm.exists()).toBe(true)
      //   expect(setLimitForm.props()).toEqual({
      //     isBodAction: false,
      //     loading: false
      //   })

      //   mockExpenseAccountSetMaxLimit.isLoading.value = true
      //   await wrapper.vm.$nextTick()
      //   expect(setLimitForm.props('loading')).toBe(true)
      //   expect(setLimitForm.props('isBodAction')).toBe(false)
      // })
      // it('should call setExpenseAccountLimit when @set-limit is emitted', async () => {
      //   const setLimitForm = wrapper.findComponent(SetLimitForm)
      //   expect(setLimitForm.exists()).toBe(true)

      //   setLimitForm.vm.$emit('setLimit', '20', 'test description')

      //   expect(setLimitForm.emitted('setLimit')).toStrictEqual([['20', 'test description']])
      //   await wrapper.vm.$nextTick()
      //   expect(mockExpenseAccountSetMaxLimit.isSuccess.value).toBe(true)
      // })

      it('should close the modal when SetLimitForm @close-modal is emitted', async () => {
        ;(wrapper.vm as unknown as ComponentData).setLimitModal = true
        await wrapper.vm.$nextTick()
        const setLimitForm = wrapper.findComponent(SetLimitForm)
        expect(setLimitForm.exists()).toBe(true)

        setLimitForm.vm.$emit('closeModal')
        expect((wrapper.vm as unknown as ComponentData).setLimitModal).toBe(false)
      })
    })

    describe('ApproveUsersForm', async () => {
      const wrapper = createComponent()

      ;(wrapper.vm as unknown as ComponentData).approveUsersModal = true

      it('should pass corrent props to ApproveUsersForm', async () => {
        await wrapper.vm.$nextTick()

        expect((wrapper.vm as unknown as ComponentData).approveUsersModal).toBe(true)
        const approveUsersForm = wrapper.findComponent(ApproveUsersForm)
        expect(approveUsersForm.exists()).toBe(true)
        expect(approveUsersForm.props()).toEqual({
          loadingApprove: false,
          isBodAction: false,
          loadingDisapprove: false,
          approvedAddresses: new Set(),
          unapprovedAddresses: new Set()
        })
      })
      it('should call approveAddress when @approve-address is emitted', async () => {
        const approveUsersForm = wrapper.findComponent(ApproveUsersForm)
        expect(approveUsersForm.exists()).toBe(true)

        approveUsersForm.vm.$emit('approveAddress', '0x123')

        expect(approveUsersForm.emitted('approveAddress')).toStrictEqual([['0x123']])
      })
      it('should call disapproveAddress when @disapprove-address is emitted', async () => {
        const approveUsersForm = wrapper.findComponent(ApproveUsersForm)
        expect(approveUsersForm.exists()).toBe(true)

        approveUsersForm.vm.$emit('disapproveAddress', '0x123')

        expect(approveUsersForm.emitted('disapproveAddress')).toStrictEqual([['0x123']])
      })
      it('should close the modal when ApproveUsersForm @close-modal is emitted', async () => {
        const approveUsersForm = wrapper.findComponent(ApproveUsersForm)
        expect(approveUsersForm.exists()).toBe(true)

        approveUsersForm.vm.$emit('closeModal')
        expect((wrapper.vm as unknown as ComponentData).approveUsersModal).toBe(false)
      })
    })
  })

  // describe('Methods', () => {
  //   // it('should call the correct function depending on for set limit', async () => {
  //   //   const team = {
  //   //     expenseAccountAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // Expense Account Address
  //   //     ownerAddress: '0xInitialUser',
  //   //     boardOfDirectorsAddress: '0xBoardOfDirectors'
  //   //   }
  //   //   const _wrapper = createComponent({
  //   //     props: {
  //   //       team: {
  //   //         ...team
  //   //       }
  //   //     }
  //   //   })
  //   //   mockGetBoardOfDirectors.boardOfDirectors.value = ['0xInitialUser']
  //   //   mockExpenseAccountGetOwner.data.value = '0xBoardOfDirectors'
  //   //   ;(_wrapper.vm as unknown as ComponentData).setLimitModal = true
  //   //   await _wrapper.vm.$nextTick()
  //   //   expect((_wrapper.vm as unknown as ComponentData).isBodAction()).toBe(true)
  //   //   const setLimitForm = _wrapper.findComponent(SetLimitForm)
  //   //   expect(setLimitForm.exists()).toBe(true)
  //   //   const amount = '20'
  //   //   const description = 'test description'
  //   //   setLimitForm.vm.$emit('setLimit', amount, description)
  //   //   await _wrapper.vm.$nextTick()
  //   //   expect((_wrapper.vm as unknown as ComponentData).action).toBe('set-max-limit')
  //   //   expect(ExpenseAccountService.prototype.getFunctionSignature).toBeCalledWith(
  //   //     '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // Expense Account Address
  //   //     'setMaxLimit',
  //   //     [`${amount}*10^18`]
  //   //   )
  //   //   expect(EthersJsAdapter.prototype.parseEther).toBeCalledWith(amount)
  //   //   expect(mockAddAction.execute).toBeCalledWith(_wrapper.props('team'), {
  //   //     data: undefined,
  //   //     description,
  //   //     targetAddress: _wrapper.props('team').expenseAccountAddress
  //   //   })
  //   // })
  //   // it('should call the correct function depending approve user', async () => {
  //   //   const team = {
  //   //     expenseAccountAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // Expense Account Address
  //   //     ownerAddress: '0xInitialUser',
  //   //     boardOfDirectorsAddress: '0xBoardOfDirectors'
  //   //   }
  //   //   const _wrapper = createComponent({
  //   //     props: {
  //   //       team: {
  //   //         ...team
  //   //       }
  //   //     }
  //   //   })
  //   //   mockGetBoardOfDirectors.boardOfDirectors.value = ['0xInitialUser']
  //   //   mockExpenseAccountGetOwner.data.value = '0xBoardOfDirectors'
  //   //   ;(_wrapper.vm as unknown as ComponentData).approveUsersModal = true
  //   //   await _wrapper.vm.$nextTick()
  //   //   expect((_wrapper.vm as unknown as ComponentData).isBodAction()).toBe(true)
  //   //   const approveUsersForm = _wrapper.findComponent(ApproveUsersForm)
  //   //   expect(approveUsersForm.exists()).toBe(true)
  //   //   const addressToApprove = '0xTestUser'
  //   //   const description = 'test description'
  //   //   approveUsersForm.vm.$emit('approveAddress', addressToApprove, description)
  //   //   await _wrapper.vm.$nextTick()
  //   //   expect((_wrapper.vm as unknown as ComponentData).action).toBe('approve-users')
  //   //   expect(ExpenseAccountService.prototype.getFunctionSignature).toBeCalledWith(
  //   //     '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // Expense Account Address
  //   //     'approveAddress',
  //   //     [addressToApprove]
  //   //   )
  //   //   //expect(EthersJsAdapter.prototype.parseEther).toBeCalledWith(amount)
  //   //   expect(mockAddAction.execute).toBeCalledWith(_wrapper.props('team'), {
  //   //     data: undefined,
  //   //     description,
  //   //     targetAddress: _wrapper.props('team').expenseAccountAddress
  //   //   })
  //   // })
  //   // it('should call the correct function depending disapprove user', async () => {
  //   //   const team = {
  //   //     expenseAccountAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // Expense Account Address
  //   //     ownerAddress: '0xInitialUser',
  //   //     boardOfDirectorsAddress: '0xBoardOfDirectors'
  //   //   }
  //   //   const _wrapper = createComponent({
  //   //     props: {
  //   //       team: {
  //   //         ...team
  //   //       }
  //   //     }
  //   //   })
  //   //   mockGetBoardOfDirectors.boardOfDirectors.value = ['0xInitialUser']
  //   //   mockExpenseAccountGetOwner.data.value = '0xBoardOfDirectors'
  //   //   ;(_wrapper.vm as unknown as ComponentData).approveUsersModal = true
  //   //   await _wrapper.vm.$nextTick()
  //   //   expect((_wrapper.vm as unknown as ComponentData).isBodAction()).toBe(true)
  //   //   const approveUsersForm = _wrapper.findComponent(ApproveUsersForm)
  //   //   expect(approveUsersForm.exists()).toBe(true)
  //   //   const addressToApprove = '0xTestUser'
  //   //   const description = 'test description'
  //   //   approveUsersForm.vm.$emit('disapproveAddress', addressToApprove, description)
  //   //   await _wrapper.vm.$nextTick()
  //   //   expect((_wrapper.vm as unknown as ComponentData).action).toBe('approve-users')
  //   //   expect(ExpenseAccountService.prototype.getFunctionSignature).toBeCalledWith(
  //   //     '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // Expense Account Address
  //   //     'approveAddress',
  //   //     [addressToApprove]
  //   //   )
  //   //   //expect(EthersJsAdapter.prototype.parseEther).toBeCalledWith(amount)
  //   //   expect(mockAddAction.execute).toBeCalledWith(_wrapper.props('team'), {
  //   //     data: undefined,
  //   //     description,
  //   //     targetAddress: _wrapper.props('team').expenseAccountAddress
  //   //   })
  //   // })
  //   // it('should check approved users correctly', async () => {
  //   //   const team = {
  //   //     expenseAccountAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // Expense Account Address
  //   //     ownerAddress: '0xInitialUser',
  //   //     boardOfDirectorsAddress: '0xBoardOfDirectors',
  //   //     members: [
  //   //       { address: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199' }, // Approved Address
  //   //       { address: '0xDisapprovedAddress' }
  //   //     ]
  //   //   }
  //   //   const _wrapper = createComponent({
  //   //     props: {
  //   //       team: {
  //   //         ...team
  //   //       }
  //   //     }
  //   //   })
  //   //   await (_wrapper.vm as unknown as ComponentData).init()
  //   //   await _wrapper.vm.$nextTick()
  //   //   expect(mockExpenseAccountIsApprovedAddress.execute).toBeCalledWith(
  //   //     _wrapper.props('team').expenseAccountAddress,
  //   //     '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199' // Approved Address
  //   //   )
  //   //   expect(mockExpenseAccountIsApprovedAddress.execute).toBeCalledWith(
  //   //     _wrapper.props('team').expenseAccountAddress,
  //   //     '0xDisapprovedAddress'
  //   //   )
  //   //   //expect((_wrapper.vm as unknown as ComponentData).unapprovedAddresses).toBe(new Set(['0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199']))
  //   // })
  // })
})
