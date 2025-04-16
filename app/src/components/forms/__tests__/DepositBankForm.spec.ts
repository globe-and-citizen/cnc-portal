import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import DepositBankForm from '@/components/forms/DepositBankForm.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import { parseEther } from 'viem'

vi.mock('@/stores', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useCurrencyStore: vi.fn(() => ({
      currency: {
        code: 'USD',
        symbol: '$'
      }
    }))
  }
})
const mockUseBalance = {
  data: ref({
    decimals: 18,
    formatted: `100`,
    symbol: `SepoliaETH`,
    value: parseEther(`100`)
  }),
  refetch: vi.fn(),
  error: ref<Error | null>(null),
  isLoading: ref(false)
}
const mockUseReadContract = {
  data: ref(BigInt(20000 * 1e6)),
  refetch: vi.fn(),
  error: ref<Error | null>(null),
  isLoading: ref(false)
}
vi.mock('@wagmi/vue', async (importOriginal) => {
  const original: object = await importOriginal()
  return {
    ...original,
    useBalance: vi.fn(() => ({ ...mockUseBalance })),
    useReadContract: vi.fn(() => ({ ...mockUseReadContract })),
    useChainId: vi.fn(() => ref(1))
  }
})
describe('DepositBankModal.vue', () => {
  describe('render', () => {
    it('renders correctly', () => {
      const wrapper = mount(DepositBankForm, {
        props: { loading: false },
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })]
        }
      })

      expect(wrapper.text()).toContain('Deposit to Team Bank Contract')
    })
    it('shows loading button when loading is true', () => {
      const wrapper = mount(DepositBankForm, {
        props: { loading: true }
      })
      const allButtonComponentsWrapper = wrapper.findAllComponents(ButtonUI)
      expect(allButtonComponentsWrapper[0].props().loading).toBe(true)
    })

    it('shows deposit button when loading is false', () => {
      const wrapper = mount(DepositBankForm, {
        props: { loading: false }
      })

      expect(wrapper.findComponent({ name: 'LoadingButton' }).exists()).toBe(false)
      expect(wrapper.find('.btn-primary').exists()).toBe(true)
    })

    it('displays ETH balance with 4 decimal places', () => {
      const wrapper = mount(DepositBankForm, {
        props: { loading: false }
      })

      expect(wrapper.find('.label-text-alt').text()).toBe('Balance: 100.0000')
    })

    it('displays USDC balance with 4 decimal places when USDC is selected', async () => {
      const wrapper = mount(DepositBankForm, {
        props: { loading: false }
      })

      // Click to open dropdown
      await wrapper.find('[role="button"]').trigger('click')
      // Select USDC
      await wrapper.findAll('li')[1].trigger('click')

      expect(wrapper.find('.label-text-alt').text()).toBe('Balance: 20000.0000')
    })

    it('disables max button when balance is loading', async () => {
      mockUseBalance.isLoading.value = true
      const wrapper = mount(DepositBankForm, {
        props: { loading: false }
      })

      expect(wrapper.find('.btn-ghost').attributes('disabled')).toBeDefined()

      mockUseBalance.isLoading.value = false
    })
  })
  describe('emits', () => {
    it('emits deposit with the correct amount when Deposit button is clicked', async () => {
      const wrapper = mount(DepositBankForm, {
        props: { loading: false }
      })

      const amountInput = wrapper.find('input')
      await amountInput.setValue('100')
      await wrapper.find('.btn-primary').trigger('click')
      expect(wrapper.emitted()).toHaveProperty('deposit')
      expect(wrapper.emitted('deposit')?.[0]).toEqual([{ amount: '100', token: 'ETH' }])
    })

    it('emits closeModal when close button is clicked', async () => {
      const wrapper = mount(DepositBankForm, {
        props: { loading: false }
      })

      await wrapper.find('.btn-error').trigger('click')
      expect(wrapper.emitted()).toHaveProperty('closeModal')
    })
  })
  describe('form validation', () => {
    it('shows error when amount is 0', async () => {
      const wrapper = mount(DepositBankForm, {
        props: { loading: false }
      })

      const amountInput = wrapper.find('input[data-test="amountInput"]')
      await amountInput.setValue('0')
      await wrapper.find('.btn-primary').trigger('click')
      expect(wrapper.find('.text-red-500').exists()).toBe(true)
    })
    it('shows error when amount is empty', async () => {
      const wrapper = mount(DepositBankForm, {
        props: { loading: false }
      })

      const amountInput = wrapper.find('input[data-test="amountInput"]')
      await amountInput.setValue('')
      await wrapper.find('.btn-primary').trigger('click')
      expect(wrapper.find('.text-red-500').exists()).toBe(true)
    })
    it('shows error when amount is not numeric', async () => {
      const wrapper = mount(DepositBankForm, {
        props: { loading: false }
      })

      const amountInput = wrapper.find('input[data-test="amountInput"]')
      await amountInput.setValue('sdkjnvc')
      await wrapper.find('.btn-primary').trigger('click')
      expect(wrapper.find('.text-red-500').exists()).toBe(true)
    })
    it('shows error immediately when amount exceeds balance', async () => {
      const wrapper = mount(DepositBankForm, {
        props: { loading: false }
      })

      const amountInput = wrapper.find('input[data-test="amountInput"]')
      await amountInput.setValue('150')

      expect(wrapper.find('.text-red-500').text()).toContain('Amount exceeds your balance')
    })
    it('shows error when amount has more than 4 decimal places', async () => {
      const wrapper = mount(DepositBankForm, {
        props: { loading: false }
      })

      const amountInput = wrapper.find('input[data-test="amountInput"]')
      await amountInput.setValue('1.12345')

      expect(wrapper.find('.text-red-500').text()).toContain(
        'Amount must have at most 4 decimal places'
      )
    })
  })
  describe('Amount Input Handling', () => {
    let wrapper: ReturnType<typeof mount>
    let amountInput: ReturnType<typeof wrapper.find>

    beforeEach(() => {
      wrapper = mount(DepositBankForm, {
        props: { loading: false }
      })
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
  describe('max button functionality', () => {
    it('fills input with max ETH balance when max button is clicked', async () => {
      const wrapper = mount(DepositBankForm, {
        props: { loading: false }
      })

      await wrapper.find('.btn-ghost').trigger('click')
      expect(
        (wrapper.find('input[data-test="amountInput"]').element as HTMLInputElement).value
      ).toBe('100.0000')
    })
    it('fills input with max USDC balance when max button is clicked with USDC selected', async () => {
      const wrapper = mount(DepositBankForm, {
        props: { loading: false }
      })

      // Select USDC
      await wrapper.find('[role="button"]').trigger('click')
      await wrapper.findAll('li')[1].trigger('click')

      await wrapper.find('.btn-ghost').trigger('click')
      expect(
        (wrapper.find('input[data-test="amountInput"]').element as HTMLInputElement).value
      ).toBe('20000.0000')
    })
  })
})
