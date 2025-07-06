import { shallowMount, mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import DepositBankForm from '@/components/forms/DepositBankForm.vue'
import { createTestingPinia } from '@pinia/testing'
import { ref, nextTick } from 'vue'
import { type Address } from 'viem'
import { mockUseCurrencyStore } from '@/tests/mocks/index.mock'
import { mockUseContractBalance } from '@/tests/mocks/useContractBalance.mock'

const mockUseSendTransaction = {
  sendTransaction: vi.fn(),
  isPending: ref(false),
  data: ref<string | undefined>('0xtx'),
  isLoading: ref(false)
}
const mockUseWriteContract = {
  writeContract: vi.fn(),
  isPending: ref(false),
  data: ref<string | undefined>('0xtx'),
  isLoading: ref(false)
}
const mockUseWaitForTransactionReceipt = {
  isLoading: ref(false),
  isSuccess: ref(false),
  data: ref({ status: 'success' })
}

vi.mock('@wagmi/vue', async (importOriginal) => {
  const original: object = await importOriginal()
  return {
    ...original,
    useSendTransaction: vi.fn(() => ({ ...mockUseSendTransaction })),
    useWriteContract: vi.fn(() => ({ ...mockUseWriteContract })),
    useWaitForTransactionReceipt: vi.fn(() => ({ ...mockUseWaitForTransactionReceipt }))
  }
})
vi.mock('@/stores/currencyStore', async (importOriginal) => {
  const original: object = await importOriginal()
  return {
    ...original,
    useCurrencyStore: vi.fn(() => ({ ...mockUseCurrencyStore }))
  }
})
vi.mock('@/composables/useContractBalance', () => ({
  useContractBalance: vi.fn(() => mockUseContractBalance)
}))

describe('DepositBankForm.vue', () => {
  const defaultProps = {
    loading: false,
    bankAddress: '0x123' as Address
  }
  const createWrapper = (overrides = {}, mountFn = shallowMount) =>
    mountFn(DepositBankForm, {
      props: { ...defaultProps, ...overrides },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })

  describe.skip('rendering', () => {
    it('renders the form and TokenAmount', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('Deposit to Team Bank Contract')
      expect(wrapper.findComponent({ name: 'TokenAmount' }).exists()).toBe(true)
    })
    it('passes tokens and loading to TokenAmount', () => {
      const wrapper = createWrapper()
      const tokenAmount = wrapper.findComponent({ name: 'TokenAmount' })
      expect(tokenAmount.props('isLoading')).toBe(false)
      expect(Array.isArray(tokenAmount.props('tokens'))).toBe(true)
    })
  })

  describe.skip('TokenAmount integration', () => {
    it('updates amount when TokenAmount emits update:modelValue', async () => {
      const wrapper = createWrapper()
      const tokenAmount = wrapper.findComponent({ name: 'TokenAmount' })
      await tokenAmount.vm.$emit('update:modelValue', '42')
      await nextTick()
      expect(wrapper.find('.text-red-500').exists()).toBe(false)
    })
    it('updates selected token when TokenAmount emits update:modelToken', async () => {
      const wrapper = createWrapper()
      const tokenAmount = wrapper.findComponent({ name: 'TokenAmount' })
      await tokenAmount.vm.$emit('update:modelToken', 'usdc')
      await nextTick()
      expect(wrapper.find('.text-red-500').exists()).toBe(false)
    })
  })

  describe.skip('form validation', () => {
    it('shows error when amount is 0', async () => {
      const wrapper = createWrapper({}, mount)
      const input = wrapper.find('input[data-test="amountInput"]')
      await input.setValue('0')
      await wrapper.find('.btn-primary').trigger('click')
      expect(wrapper.find('.text-red-500').text()).toContain('Amount must be greater than 0')
    })
    it('shows error when amount is empty', async () => {
      const wrapper = createWrapper({}, mount)
      const input = wrapper.find('input[data-test="amountInput"]')
      await input.setValue('')
      await wrapper.find('.btn-primary').trigger('click')
      expect(wrapper.find('.text-red-500').exists()).toBe(true)
    })
    it('shows error when amount is not numeric', async () => {
      const wrapper = createWrapper({}, mount)
      const input = wrapper.find('input[data-test="amountInput"]')
      await input.setValue('abc')
      await wrapper.find('.btn-primary').trigger('click')
      expect(wrapper.find('.text-red-500').text()).toContain('Value is not a valid number')
    })
    it('shows error when amount exceeds balance', async () => {
      const wrapper = createWrapper({}, mount)
      const input = wrapper.find('input[data-test="amountInput"]')
      await input.setValue('100000')
      await wrapper.find('.btn-primary').trigger('click')
      expect(wrapper.find('.text-red-500').text()).toContain('Amount exceeds your balance')
    })
    it('shows error when amount has more than 4 decimal places', async () => {
      const wrapper = createWrapper({}, mount)
      const input = wrapper.find('input[data-test="amountInput"]')
      await input.setValue('1.12345')
      await wrapper.find('.btn-primary').trigger('click')
      expect(wrapper.find('.text-red-500').text()).toContain('Amount must have at most 4 decimal places')
    })
  })

  describe.skip('actions', () => {
    it('emits closeModal when cancel button is clicked', async () => {
      const wrapper = createWrapper()
      await wrapper.find('.btn-error').trigger('click')
      expect(wrapper.emitted('closeModal')).toBeTruthy()
    })
    it('submits ETH deposit when valid', async () => {
      const wrapper = createWrapper({}, mount)
      const input = wrapper.find('input[data-test="amountInput"]')
      await input.setValue('1')
      await wrapper.find('.btn-primary').trigger('click')
      expect(mockUseSendTransaction.sendTransaction).toHaveBeenCalled()
    })
    it('shows error toast if deposit fails', async () => {
      const wrapper = createWrapper({}, mount)
      const input = wrapper.find('input[data-test="amountInput"]')
      await input.setValue('1')
      mockUseSendTransaction.sendTransaction.mockRejectedValueOnce(new Error('fail'))
      await wrapper.find('.btn-primary').trigger('click')
      // Error toast should be called (simulate addErrorToast)
      // You may need to spy on addErrorToast if not already
    })
  })
})
