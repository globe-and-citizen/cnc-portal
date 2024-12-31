import { mount, enableAutoUnmount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import BankSection from '@/components/sections/SingleTeamView/BankSection.vue'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'
import type { Action, Team } from '@/types'
import type { ComponentPublicInstance } from 'vue'
import { useToastStore } from '@/stores/__mocks__/useToastStore'
import DepositBankForm from '@/components/forms/DepositBankForm.vue'
import TransferFromBankForm from '@/components/forms/TransferFromBankForm.vue'
import ModalComponent from '@/components/ModalComponent.vue'

interface BankSectionVM extends ComponentPublicInstance {
  tokenDepositModal: boolean
  tokenTransferModal: boolean
  depositModal: boolean
  pushTipModal: boolean
  transferModal: boolean
  tokenTipModal: boolean
  tokenAmount: string
  tokenAmountUSDC: string
  tokenRecipient: string
  usdcBalance: bigint | null
  depositError: unknown
  transferError: unknown
  tipError: unknown
}

vi.mock('@/stores/user', () => ({
  useUserDataStore: vi.fn(() => ({
    address: '0xaFeF48F7718c51fb7C6d1B314B3991D2e1d8421E'
  }))
}))

vi.mock('@/stores/useToastStore')

const team = {
  bankAddress: '0xd6307a4B12661a5254CEbB67eFA869E37d0421E6',
  ownerAddress: '0xaFeF48F7718c51fb7C6d1B314B3991D2e1d8421E',
  boardOfDirectorsAddress: '0xaFeF48F7718c51fb7C6d1B314B3991D2e1d8421E',
  members: []
}

const mockUseReadContract = {
  data: ref<string | null>(null),
  isLoading: ref(false),
  error: ref(null),
  refetch: vi.fn()
}

const mockUseWriteContract = {
  writeContract: vi.fn(),
  error: ref<Error | null>(null),
  isPending: ref(false),
  data: ref<`0x${string}` | null>(null)
}

const mockUseWaitForTransactionReceipt = {
  isLoading: ref(false),
  isSuccess: ref(false)
}

const mockUseSendTransaction = {
  isPending: ref(false),
  error: ref<Error | null>(null),
  data: ref<`0x${string}` | null>(null),
  sendTransaction: vi.fn()
}

const mockUseBalance = {
  data: ref<string | null>(null),
  isLoading: ref(false),
  error: ref(null),
  refetch: vi.fn()
}

const mockUseAddAction = {
  loadingContract: ref(false),
  actionCount: ref<BigInt | null>(null),
  team: ref<Partial<Team> | null>(null),
  action: ref<Partial<Action> | null>(null),
  executeAddAction: vi.fn(),
  addAction: vi.fn(),
  isSuccess: ref(false),
  isConfirming: ref(false),
  error: ref(null)
}

const createComponent = () => {
  return mount(BankSection, {
    props: {
      team
    }
  })
}

vi.mock('@/composables/bod', async (importOriginal) => {
  const actual: Object = await importOriginal()
  return {
    ...actual,
    useAddAction: vi.fn(() => mockUseAddAction)
  }
})

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

describe('BankSection', () => {
  let wrapper: ReturnType<typeof mount<typeof BankSection>>
  setActivePinia(createPinia())

  enableAutoUnmount(afterEach)
  beforeEach(() => {
    wrapper = mount(BankSection, {
      props: {
        team
      }
    })
  })
  describe('Render', () => {
    it('should show team bank address', () => {
      expect(wrapper.find('[data-test="team-bank-address"]').exists()).toBeTruthy()
      expect(wrapper.find('[data-test="team-bank-address"]').text()).toContain(team.bankAddress)
    })

    it('should show USDC balance', () => {
      expect(wrapper.text()).toContain('USDC:')
    })

    it('should show USDC related buttons', () => {
      const buttons = wrapper.findAll('button')
      expect(buttons.some((button) => button.text().includes('Deposit USDC'))).toBeTruthy()
      expect(buttons.some((button) => button.text().includes('Transfer USDC'))).toBeTruthy()
      expect(buttons.some((button) => button.text().includes('Tip USDC'))).toBeTruthy()
    })

    it('should render deposit modal', async () => {
      const depositButton = wrapper.find('button[data-test="deposit-button"]')
      await depositButton.trigger('click')

      expect((wrapper.vm as unknown as BankSectionVM).depositModal).toBeTruthy()
      expect(wrapper.findComponent(DepositBankForm).exists()).toBeTruthy()
    })

    it('should render push tip modal', async () => {
      const pushTipButton = wrapper.find('button[data-test="push-tip-button"]')
      await pushTipButton.trigger('click')

      expect((wrapper.vm as unknown as BankSectionVM).pushTipModal).toBeTruthy()
    })

    it('should render transfer modal', async () => {
      const transferButton = wrapper.find('button[data-test="transfer-button"]')
      await transferButton.trigger('click')

      expect((wrapper.vm as unknown as BankSectionVM).transferModal).toBeTruthy()
      expect(wrapper.findComponent(TransferFromBankForm).exists()).toBeTruthy()
    })

    it('should emit modal component v-model DepositModal', async () => {
      const depositButton = wrapper.find('button[data-test="deposit-button"]')
      await depositButton.trigger('click')

      expect((wrapper.vm as unknown as BankSectionVM).depositModal).toBeTruthy()

      const modalComponent = wrapper.findComponent(ModalComponent)
      modalComponent.vm.$emit('update:modelValue', false)

      expect((wrapper.vm as unknown as BankSectionVM).depositModal).toBeFalsy()
    })

    it('should render token deposit modal', async () => {
      const tokenDepositButton = wrapper.find(
        'button[data-test="deposit-usdc-button-bank-section"]'
      )
      await tokenDepositButton.trigger('click')

      expect((wrapper.vm as unknown as BankSectionVM).tokenDepositModal).toBeTruthy()
    })

    it('should render token transfer modal', async () => {
      const tokenTransferButton = wrapper.find(
        'button[data-test="transfer-usdc-button-bank-section"]'
      )
      await tokenTransferButton.trigger('click')
      expect((wrapper.vm as unknown as BankSectionVM).tokenTransferModal).toBeTruthy()
    })

    it('should render token tip modal', async () => {
      const tokenTipButton = wrapper.find('button[data-test="tip-usdc-button-bank-section"]')
      await tokenTipButton.trigger('click')
      expect((wrapper.vm as unknown as BankSectionVM).tokenTipModal).toBeTruthy()
    })

    it('should close deposit modal when DepositBankForm emit @close-modal', async () => {
      const depositButton = wrapper.find('button[data-test="deposit-button"]')
      await depositButton.trigger('click')

      expect((wrapper.vm as unknown as BankSectionVM).depositModal).toBeTruthy()

      const depositBankForm = wrapper.findComponent(DepositBankForm)
      depositBankForm.vm.$emit('close-modal')

      expect((wrapper.vm as unknown as BankSectionVM).depositModal).toBeFalsy()
    })

    it('should call sendTransaction when DepositBankForm emit @deposit', async () => {
      const depositButton = wrapper.find('button[data-test="deposit-button"]')
      await depositButton.trigger('click')

      const depositBankForm = wrapper.findComponent(DepositBankForm)
      depositBankForm.vm.$emit('deposit', '100')

      expect(mockUseSendTransaction.sendTransaction).toHaveBeenCalled()
    })

    it('should emit modal component v-model transfer modal', async () => {
      const transferButton = wrapper.find('button[data-test="transfer-button"]')
      await transferButton.trigger('click')

      expect((wrapper.vm as unknown as BankSectionVM).transferModal).toBeTruthy()

      const modalComponent = wrapper.findAllComponents(ModalComponent)[1]
      modalComponent.vm.$emit('update:modelValue', false)

      expect((wrapper.vm as unknown as BankSectionVM).transferModal).toBeFalsy()
    })

    it('should close transfer modal when TransferFromBankForm emit @close-modal', async () => {
      const transferButton = wrapper.find('button[data-test="transfer-button"]')
      await transferButton.trigger('click')

      expect((wrapper.vm as unknown as BankSectionVM).transferModal).toBeTruthy()

      const transferFromBankForm = wrapper.findComponent(TransferFromBankForm)
      transferFromBankForm.vm.$emit('close-modal')

      expect((wrapper.vm as unknown as BankSectionVM).transferModal).toBeFalsy()
    })

    it('should emit modal component v-model push tip modal', async () => {
      const pushTipButton = wrapper.find('button[data-test="push-tip-button"]')
      await pushTipButton.trigger('click')

      expect((wrapper.vm as unknown as BankSectionVM).pushTipModal).toBeTruthy()

      const modalComponent = wrapper.findAllComponents(ModalComponent)[2]
      modalComponent.vm.$emit('update:modelValue', false)

      expect((wrapper.vm as unknown as BankSectionVM).pushTipModal).toBeFalsy()
    })

    it('should emit modal component v-model token tip modal', async () => {
      const tipButton = wrapper
        .findAll('button')
        .find((button) => button.text().includes('Tip USDC'))
      await tipButton?.trigger('click')

      expect((wrapper.vm as unknown as BankSectionVM).tokenTipModal).toBeTruthy()

      const modalComponent = wrapper.findAllComponents(ModalComponent)[3]
      modalComponent.vm.$emit('update:modelValue', false)

      expect((wrapper.vm as unknown as BankSectionVM).tokenTipModal).toBeFalsy()
    })
  })

  describe('Methods', () => {
    it('should bind the tip amount input correctly', async () => {
      const input = wrapper.find('input')
      await input.setValue('10')
      expect(input.element.value).toBe('10')
    })

    it('should open token deposit modal on button click', async () => {
      const depositButton = wrapper
        .findAll('button')
        .find((button) => button.text().includes('Deposit USDC'))
      await depositButton?.trigger('click')
      expect((wrapper.vm as unknown as BankSectionVM).tokenDepositModal).toBe(true)
    })

    it('should open token transfer modal on button click', async () => {
      const transferButton = wrapper
        .findAll('button')
        .find((button) => button.text().includes('Transfer USDC'))
      await transferButton?.trigger('click')
      expect((wrapper.vm as unknown as BankSectionVM).tokenTransferModal).toBe(true)
    })

    it('should open token tip modal on button click', async () => {
      const tipButton = wrapper
        .findAll('button')
        .find((button) => button.text().includes('Tip USDC'))
      await tipButton?.trigger('click')
      expect((wrapper.vm as unknown as BankSectionVM).tokenTipModal).toBe(true)
    })

    it('should bind token amount input correctly in tip modal', async () => {
      const tipButton = wrapper
        .findAll('button')
        .find((button) => button.text().includes('Tip USDC'))
      await tipButton?.trigger('click')
      const input = wrapper.find('input[placeholder="Enter amount"]')
      await input.setValue('25')
      expect((wrapper.vm as unknown as BankSectionVM).tokenAmountUSDC).toBe(25)
    })

    it('should handle USDC balance updates', async () => {
      mockUseReadContract.data.value = '1000000' // 1 USDC (6 decimals)
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('USDC: 1')
    })
  })

  describe('Contract Interactions', () => {
    describe('error handling', () => {
      it('should handle transfer errors', async () => {
        const wrapper = createComponent()
        ;(wrapper.vm as unknown as BankSectionVM).transferError = new Error('Transfer failed')
        await wrapper.vm.$nextTick()

        const { addErrorToast } = useToastStore()
        expect(addErrorToast).toHaveBeenCalledWith('Failed to approve token spending')
      })

      it('should handle tip errors', async () => {
        const wrapper = createComponent()
        ;(wrapper.vm as unknown as BankSectionVM).tipError = new Error('Tip failed')
        await wrapper.vm.$nextTick()

        const { addErrorToast } = useToastStore()
        expect(addErrorToast).toHaveBeenCalledWith('Failed to approve token spending')
      })
    })
  })

  describe('Watch Functions', () => {
    it('should handle deposit confirmation', async () => {
      mockUseWaitForTransactionReceipt.isLoading.value = true
      mockUseWaitForTransactionReceipt.isSuccess.value = false
      const wrapper = createComponent()
      ;(wrapper.vm as unknown as BankSectionVM).depositModal = true
      mockUseWaitForTransactionReceipt.isLoading.value = false
      mockUseWaitForTransactionReceipt.isSuccess.value = true
      await wrapper.vm.$nextTick()

      const { addSuccessToast } = useToastStore()
      expect(addSuccessToast).toHaveBeenCalledWith('Deposited successfully')
      expect((wrapper.vm as unknown as BankSectionVM).depositModal).toBeFalsy()
    })

    it('should handle transfer confirmation', async () => {
      mockUseWaitForTransactionReceipt.isLoading.value = true
      mockUseWaitForTransactionReceipt.isSuccess.value = false
      const wrapper = createComponent()
      ;(wrapper.vm as unknown as BankSectionVM).transferModal = true
      mockUseWaitForTransactionReceipt.isLoading.value = false
      mockUseWaitForTransactionReceipt.isSuccess.value = true
      await wrapper.vm.$nextTick()

      const { addSuccessToast } = useToastStore()
      expect(addSuccessToast).toHaveBeenCalledWith('Transferred successfully')
      expect((wrapper.vm as unknown as BankSectionVM).transferModal).toBeFalsy()
    })

    it('should handle push tip confirmation', async () => {
      mockUseWaitForTransactionReceipt.isLoading.value = true
      mockUseWaitForTransactionReceipt.isSuccess.value = false
      const wrapper = createComponent()
      ;(wrapper.vm as unknown as BankSectionVM).pushTipModal = true
      mockUseWaitForTransactionReceipt.isLoading.value = false
      mockUseWaitForTransactionReceipt.isSuccess.value = true
      await wrapper.vm.$nextTick()

      const { addSuccessToast } = useToastStore()
      expect(addSuccessToast).toHaveBeenCalledWith('Tips pushed successfully')
      expect((wrapper.vm as unknown as BankSectionVM).pushTipModal).toBeFalsy()
    })

    it('should handle token deposit confirmation', async () => {
      mockUseWaitForTransactionReceipt.isLoading.value = true
      mockUseWaitForTransactionReceipt.isSuccess.value = false
      const wrapper = createComponent()
      ;(wrapper.vm as unknown as BankSectionVM).tokenDepositModal = true
      mockUseWaitForTransactionReceipt.isLoading.value = false
      mockUseWaitForTransactionReceipt.isSuccess.value = true
      await wrapper.vm.$nextTick()

      const { addSuccessToast } = useToastStore()
      expect(addSuccessToast).toHaveBeenCalledWith('Token deposited successfully')
      expect((wrapper.vm as unknown as BankSectionVM).tokenDepositModal).toBeFalsy()
    })

    it('should handle token transfer confirmation', async () => {
      mockUseWaitForTransactionReceipt.isLoading.value = true
      mockUseWaitForTransactionReceipt.isSuccess.value = false
      const wrapper = createComponent()
      ;(wrapper.vm as unknown as BankSectionVM).tokenTransferModal = true
      mockUseWaitForTransactionReceipt.isLoading.value = false
      mockUseWaitForTransactionReceipt.isSuccess.value = true
      await wrapper.vm.$nextTick()

      const { addSuccessToast } = useToastStore()
      expect(addSuccessToast).toHaveBeenCalledWith('Token transferred successfully')
      expect((wrapper.vm as unknown as BankSectionVM).tokenTransferModal).toBeFalsy()
    })

    it('should handle deposit error', async () => {
      mockUseSendTransaction.error.value = new Error('Deposit failed')
      const wrapper = createComponent()
      await wrapper.vm.$nextTick()

      const { addErrorToast } = useToastStore()
      expect(addErrorToast).toHaveBeenCalledWith('Failed to deposit')
    })

    it('should handle transfer error', async () => {
      mockUseWriteContract.error.value = new Error('Transfer failed')
      const wrapper = createComponent()
      await wrapper.vm.$nextTick()

      const { addErrorToast } = useToastStore()
      expect(addErrorToast).toHaveBeenCalledWith('Failed to transfer from bank')
    })

    it('should handle push tip error', async () => {
      mockUseWriteContract.error.value = new Error('Push tip failed')
      const wrapper = createComponent()
      await wrapper.vm.$nextTick()

      const { addErrorToast } = useToastStore()
      expect(addErrorToast).toHaveBeenCalledWith('Failed to push tip')
    })
  })
})
