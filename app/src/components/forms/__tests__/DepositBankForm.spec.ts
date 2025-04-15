import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
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
  })
})
