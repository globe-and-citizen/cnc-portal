import { mount, shallowMount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import DepositBankForm from '@/components/forms/DepositBankForm.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import { type Address } from 'viem'
import { useToastStore } from '@/stores/useToastStore'
import { mockUseCurrencyStore } from '@/tests/mocks/index.mock'
import { mockUseContractBalance } from '@/tests/mocks/useContractBalance.mock'

// const mockUseBalance = {
//   data: ref({
//     decimals: 18,
//     formatted: `100`,
//     symbol: `SepoliaETH`,
//     value: parseEther(`100`)
//   }),
//   refetch: vi.fn(),
//   error: ref<Error | null>(null),
//   isLoading: ref(false)
// }

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
    useCurrencyStore: vi.fn(() => mockUseCurrencyStore)
  }
})
vi.mock('@/composables/useContractBalance', () => ({
  useContractBalance: vi.fn(() => mockUseContractBalance)
}))

describe('DepositBankModal.vue', () => {
  const defaultProps = {
    loading: false,
    bankAddress: '0x123' as Address
  }

  const createWrapper = () => {
    return shallowMount(DepositBankForm, {
      props: defaultProps,
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })
  }

  describe('render', () => {
    it('renders correctly', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('Deposit to Team Bank Contract')
    })

    it.skip('shows loading button when loading is true', () => {
      const wrapper = mount(DepositBankForm, {
        props: { ...defaultProps, loading: true }
      })
      const allButtonComponentsWrapper = wrapper.findAllComponents(ButtonUI)
      expect(allButtonComponentsWrapper[0].props().loading).toBe(true)
    })

    it.skip('shows deposit button when loading is false', () => {
      const wrapper = createWrapper()
      expect(wrapper.findComponent({ name: 'LoadingButton' }).exists()).toBe(false)
      expect(wrapper.find('.btn-primary').exists()).toBe(true)
    })

    it('displays ETH balance with 4 decimal places', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.label-text-alt').text()).toMatchInlineSnapshot(`"Balance: 0.5"`)
    })

    it('displays USDC balance with 4 decimal places when USDC is selected', async () => {
      const wrapper = createWrapper()
      const selectComponent = wrapper.findComponent({ name: 'SelectComponent' })
      expect(selectComponent.exists()).toBe(true)
      await selectComponent.vm.$emit('update:modelValue', '1')
      expect(wrapper.find('.label-text-alt').text()).toMatchInlineSnapshot(`"Balance:"`)
    })

    it.skip('disables max button when balance is loading', async () => {
      // mockUseBalance.isLoading.value = true
      const wrapper = createWrapper()
      const maxButton = wrapper.find('[data-test="maxButton"]')
      expect(maxButton.attributes('disabled')).toMatchInlineSnapshot(`""`)
      // mockUseBalance.isLoading.value = false
    })
  })

  describe.skip('emits', () => {
    it('emits closeModal when close button is clicked', async () => {
      const wrapper = createWrapper()
      await wrapper.find('.btn-error').trigger('click')
      expect(wrapper.emitted()).toHaveProperty('closeModal')
    })
  })

  describe.skip('form validation', () => {
    it('shows error when amount is 0', async () => {
      const wrapper = createWrapper()
      const amountInput = wrapper.find('input[data-test="amountInput"]')
      await amountInput.setValue('0')
      await wrapper.find('.btn-primary').trigger('click')
      expect(wrapper.find('.text-red-500').exists()).toBe(true)
    })

    it('shows error when amount is empty', async () => {
      const wrapper = createWrapper()
      const amountInput = wrapper.find('input[data-test="amountInput"]')
      await amountInput.setValue('')
      await wrapper.find('.btn-primary').trigger('click')
      expect(wrapper.find('.text-red-500').exists()).toBe(true)
    })

    it('shows error when amount is not numeric', async () => {
      const wrapper = createWrapper()
      const amountInput = wrapper.find('input[data-test="amountInput"]')
      await amountInput.setValue('sdkjnvc')
      await wrapper.find('.btn-primary').trigger('click')
      expect(wrapper.find('.text-red-500').exists()).toBe(true)
    })

    it('shows error immediately when amount exceeds balance', async () => {
      const wrapper = createWrapper()
      const amountInput = wrapper.find('input[data-test="amountInput"]')
      await amountInput.setValue('150')
      expect(wrapper.find('.text-red-500').text()).toContain('Amount exceeds your balance')
    })

    it('shows error when amount has more than 4 decimal places', async () => {
      const wrapper = createWrapper()
      const amountInput = wrapper.find('input[data-test="amountInput"]')
      await amountInput.setValue('1.12345')
      expect(wrapper.find('.text-red-500').text()).toContain(
        'Amount must have at most 4 decimal places'
      )
    })
  })

  describe.skip('Amount Input Handling', () => {
    let wrapper: ReturnType<typeof mount>
    let amountInput: ReturnType<typeof wrapper.find>

    beforeEach(() => {
      wrapper = createWrapper()
      amountInput = wrapper.find('[data-test="amountInput"]')
    })

    it('accepts valid numeric input', async () => {
      await amountInput.setValue('42')
      expect((amountInput.element as HTMLInputElement).value).toBe('42')
      await amountInput.setValue('42.5')
      expect((amountInput.element as HTMLInputElement).value).toBe('42.5')
    })

    it('handles multiple decimal points', async () => {
      await amountInput.setValue('42.5.3')
      expect((amountInput.element as HTMLInputElement).value).toBe('42.53')
    })

    it('removes non-numeric characters', async () => {
      await amountInput.setValue('abc123.45def')
      expect((amountInput.element as HTMLInputElement).value).toBe('123.45')
      await amountInput.setValue('!@#50.75$%^')
      expect((amountInput.element as HTMLInputElement).value).toBe('50.75')
    })

    it('preserves decimal input correctly', async () => {
      await amountInput.setValue('0.')
      expect((amountInput.element as HTMLInputElement).value).toBe('0.')
      await amountInput.setValue('0.5')
      expect((amountInput.element as HTMLInputElement).value).toBe('0.5')
    })
  })

  describe.skip('max button functionality', () => {
    //
    it('fills input with max ETH balance when max button is clicked', async () => {
      const wrapper = createWrapper()
      await wrapper.find('[data-test="maxButton"]').trigger('click')
      expect((wrapper.find('[data-test="amountInput"]').element as HTMLInputElement).value).toBe(
        '100.0000'
      )
    })

    it.skip('fills input with max USDC balance when max button is clicked with USDC selected', async () => {
      const wrapper = createWrapper()
      const selectComponent = wrapper.findComponent({ name: 'SelectComponent' })
      expect(selectComponent.exists()).toBe(true)
      await selectComponent.vm.$emit('update:modelValue', '1')
      await wrapper.find('[data-test="maxButton"]').trigger('click')
      expect((wrapper.find('[data-test="amountInput"]').element as HTMLInputElement).value).toBe(
        '20000.0000'
      )
    })
  })

  describe.skip('percentage buttons functionality', () => {
    let wrapper: ReturnType<typeof mount>
    let amountInput: ReturnType<typeof wrapper.find>

    beforeEach(() => {
      wrapper = createWrapper()
      amountInput = wrapper.find('[data-test="amountInput"]')
    })

    it('fills input with 25% of ETH balance when 25% button is clicked', async () => {
      await wrapper.find('[data-test="percentButton-25"]').trigger('click')
      expect((amountInput.element as HTMLInputElement).value).toBe('25.0000')
    })

    it('fills input with 50% of ETH balance when 50% button is clicked', async () => {
      await wrapper.find('[data-test="percentButton-50"]').trigger('click')
      expect((amountInput.element as HTMLInputElement).value).toBe('50.0000')
    })

    it('fills input with 75% of ETH balance when 75% button is clicked', async () => {
      await wrapper.find('[data-test="percentButton-75"]').trigger('click')
      expect((amountInput.element as HTMLInputElement).value).toBe('75.0000')
    })

    it.skip('fills input with correct percentage of USDC balance when buttons are clicked', async () => {
      const selectComponent = wrapper.findComponent({ name: 'SelectComponent' })
      expect(selectComponent.exists()).toBe(true)
      await selectComponent.vm.$emit('update:modelValue', '1')

      await wrapper.find('[data-test="percentButton-25"]').trigger('click')
      expect((amountInput.element as HTMLInputElement).value).toBe('5000.0000')

      await wrapper.find('[data-test="percentButton-50"]').trigger('click')
      expect((amountInput.element as HTMLInputElement).value).toBe('10000.0000')

      await wrapper.find('[data-test="percentButton-75"]').trigger('click')
      expect((amountInput.element as HTMLInputElement).value).toBe('15000.0000')
    })
  })

  describe.skip('USDC deposit steps tracking', () => {
    let wrapper: ReturnType<typeof mount>

    beforeEach(async () => {
      wrapper = createWrapper()
      // Select USDC token
      const selectComponent = wrapper.findComponent({ name: 'SelectComponent' })
      expect(selectComponent.exists()).toBe(true)
      await selectComponent.vm.$emit('update:modelValue', '1')
    })

    it.skip('starts at step 1', () => {
      const steps = wrapper.findAll('.step')
      expect(steps[0].classes()).toContain('step-primary')
      expect(steps[1].classes()).not.toContain('step-primary')
      expect(steps[2].classes()).not.toContain('step-primary')
    })

    it('moves to step 2 during approval', async () => {
      mockUseWriteContract.isPending.value = true
      await wrapper.vm.$nextTick()
      const steps = wrapper.findAll('.step')
      expect(steps[0].classes()).toContain('step-primary')
      expect(steps[1].classes()).toContain('step-primary')
      expect(steps[2].classes()).not.toContain('step-primary')
    })

    it('moves to step 3 during deposit', async () => {
      mockUseWriteContract.isPending.value = false
      mockUseWriteContract.data.value = '0xtx'
      mockUseWaitForTransactionReceipt.isLoading.value = true
      await wrapper.vm.$nextTick()
      const steps = wrapper.findAll('.step')
      expect(steps[0].classes()).toContain('step-primary')
      expect(steps[1].classes()).toContain('step-primary')
    })

    it('resets to step 1 when switching from USDC to ETH', async () => {
      mockUseWriteContract.isPending.value = true
      await wrapper.vm.$nextTick()
      const selectComponent = wrapper.findComponent({ name: 'SelectComponent' })
      expect(selectComponent.exists()).toBe(true)
      await selectComponent.vm.$emit('update:modelValue', '0')
      await wrapper.vm.$nextTick()

      const steps = wrapper.findAll('.step')
      expect(steps.length).toBe(0)
    })
  })

  describe.skip('Transaction confirmations', () => {
    let wrapper: ReturnType<typeof mount>

    beforeEach(() => {
      wrapper = createWrapper()
    })

    it('shows success toast and closes modal on ETH deposit confirmation', async () => {
      // Simulate successful ETH deposit
      mockUseWaitForTransactionReceipt.isLoading.value = true
      await wrapper.vm.$nextTick()
      mockUseWaitForTransactionReceipt.isLoading.value = false
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted()).toHaveProperty('closeModal')
    })

    it('shows success toast and closes modal on USDC deposit confirmation', async () => {
      const selectComponent = wrapper.findComponent({ name: 'SelectComponent' })
      expect(selectComponent.exists()).toBe(true)
      await selectComponent.vm.$emit('update:modelValue', '1')

      mockUseWaitForTransactionReceipt.isLoading.value = true
      await wrapper.vm.$nextTick()
      mockUseWaitForTransactionReceipt.isLoading.value = false
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted()).toHaveProperty('closeModal')
    })
  })

  describe.skip('Error handling', () => {
    let wrapper: ReturnType<typeof mount>
    let toastStore: ReturnType<typeof useToastStore>

    beforeEach(() => {
      const pinia = createTestingPinia({ createSpy: vi.fn })
      wrapper = mount(DepositBankForm, {
        props: defaultProps,
        global: {
          plugins: [pinia]
        }
      })
      toastStore = useToastStore()
    })

    //
    it.skip('handles USDC deposit error', async () => {
      // Select USDC
      const selectComponent = wrapper.findComponent({ name: 'SelectComponent' })
      expect(selectComponent.exists()).toBe(true)
      await selectComponent.vm.$emit('update:modelValue', '1')

      // Set amount
      await wrapper.find('[data-test="amountInput"]').setValue('100')

      // Mock writeContract to throw error
      mockUseWriteContract.writeContract.mockRejectedValueOnce(new Error('Transaction failed'))

      // Submit form
      await wrapper.find('.btn-primary').trigger('click')

      // Verify error toast was shown
      expect(toastStore.addErrorToast).toHaveBeenCalledWith('Failed to deposit USDC')
    })
  })
})
