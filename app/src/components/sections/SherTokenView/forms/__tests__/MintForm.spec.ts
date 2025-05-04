import { flushPromises, shallowMount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import MintForm from '../../../SherTokenView/forms/MintForm.vue'
import type { Address } from 'viem'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
// import { useToastStore } from '@/stores/__mocks__/useToastStore'
import { mockToastStore } from '@/tests/mocks/store.mock'

interface Props {
  address: Address | undefined
  tokenSymbol: string
  loading: boolean
}

interface ComponentData {
  to: string
  amount: number
  showDropdown: boolean
  foundUsers: { address: string; name: string }[]
  searchError: unknown
}

vi.mock('@/composables/useCustomFetch', () => {
  return {
    useCustomFetch: vi.fn(() => ({
      get: () => ({
        json: () => ({
          execute: vi.fn(),
          data: {
            users: [
              { address: '0x123', name: 'John Doe' },
              { address: '0x456', name: 'Jane Doe' }
            ]
          },
          loading: ref(false),
          error: ref<unknown>(null)
        })
      })
    }))
  }
})
// vi.mock('@/stores/useToastStore')

describe('MintForm', () => {
  const createComponent = (props?: Partial<Props>) => {
    return shallowMount(MintForm, {
      props: {
        tokenSymbol: 'TST',
        loading: false,
        ...props
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })
  }

  it('should set destination address correctly', async () => {
    const wrapper = createComponent()

    const input = wrapper.find('[data-test="address-input"]')
    await input.setValue('0x123')
    expect((wrapper.vm as unknown as ComponentData).to).toBe('0x123')
  })

  it('should set amount correctly', async () => {
    const wrapper = createComponent()

    const input = wrapper.find('[data-test="amount-input"]')
    await input.setValue('1')
    expect((wrapper.vm as unknown as ComponentData).amount).toBe(1)
  })

  it('should emit submit event when button submit clicked', async () => {
    const wrapper = createComponent()

    const input = wrapper.find('[data-test="address-input"]')
    await input.setValue('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266')

    const amountInput = wrapper.find('[data-test="amount-input"]')
    await amountInput.setValue('1')

    await wrapper.find('[data-test="submit-button"]').trigger('click')
    expect(wrapper.emitted('submit')).toBeTruthy()
  })

  it('should set to value to be address based on prop', async () => {
    const wrapper = createComponent({ address: '0x123' })

    expect((wrapper.vm as unknown as ComponentData).to).toBe('0x123')
  })

  it('should render list of user suggestions', async () => {
    const wrapper = createComponent()

    await wrapper.find('[data-test="address-input"]').setValue('John')
    await wrapper.find('[data-test="address-input"]').trigger('keyup')
    await wrapper.vm.$nextTick()

    const foundUsers = wrapper.findAll('[data-test="found-user"]')
    expect(foundUsers.length).toBe(2)
  })

  it('should set address and name when click suggestion user', async () => {
    const wrapper = createComponent()

    await wrapper.find('[data-test="address-input"]').setValue('Doe')
    await wrapper.find('[data-test="address-input"]').trigger('keyup')
    await wrapper.vm.$nextTick()

    const foundUser = wrapper.find('[data-test="found-user"]')
    await foundUser.trigger('click')

    expect((wrapper.vm as unknown as ComponentData).to).toBe('0x123')
  })

  it('should render error message when address is invalid', async () => {
    const wrapper = createComponent()

    const input = wrapper.find('[data-test="address-input"]')
    await input.setValue('0x123')

    const amountInput = wrapper.find('[data-test="amount-input"]')
    await amountInput.setValue('1')

    await wrapper.find('[data-test="submit-button"]').trigger('click')
    await flushPromises()

    const errorMessage = wrapper.find('[data-test="error-message-to"]')
    expect(errorMessage.exists()).toBeTruthy()
    expect(errorMessage.text()).toBe('Invalid address')
  })

  it('should render error message when amount is invalid', async () => {
    const wrapper = createComponent()

    const input = wrapper.find('[data-test="address-input"]')
    await input.setValue('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266')

    const amountInput = wrapper.find('[data-test="amount-input"]')
    await amountInput.setValue(null)

    await wrapper.find('[data-test="submit-button"]').trigger('click')
    await flushPromises()

    const errorMessage = wrapper.find('[data-test="error-message-amount"]')
    expect(errorMessage.exists()).toBeTruthy()
    expect(errorMessage.text()).toBe('Value is required')
  })

  it('should add error toast if there is an error when searching users', async () => {
    // const { addErrorToast } = useToastStore()
    const wrapper = createComponent()

    ;(wrapper.vm as unknown as ComponentData).searchError = 'error'
    await wrapper.vm.$nextTick()

    expect(mockToastStore.addErrorToast).toHaveBeenCalled()
  })
})
