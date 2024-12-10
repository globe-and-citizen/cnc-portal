import { flushPromises, shallowMount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import DistributeMintForm from '../DistributeMintForm.vue'
import { createTestingPinia } from '@pinia/testing'
import LoadingButton from '@/components/LoadingButton.vue'
import { ref } from 'vue'

vi.mock('@/stores/useToastStore')
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
          error: ref(null)
        })
      })
    }))
  }
})

interface ComponentData {
  shareholderWithAmounts: { shareholder: string; amount: string }[]
  usersData: {
    users: { address: string; name: string }[]
  }
  showDropdown: boolean[]
}

describe('DistributeMintForm', () => {
  const createComponent = (loading?: boolean) => {
    return shallowMount(DistributeMintForm, {
      props: {
        tokenSymbol: 'TEST',
        loading: loading || false
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })
  }

  it('should set shareholder ref when input address', async () => {
    const wrapper = createComponent()
    const input = wrapper.find('input[data-test="address-input"]')
    await input.setValue('0x123')
    expect((wrapper.vm as unknown as ComponentData).shareholderWithAmounts[0].shareholder).toBe(
      '0x123'
    )
  })

  it('should set shareholder ref when input address', async () => {
    const wrapper = createComponent()
    const input = wrapper.find('input[data-test="amount-input"]')
    await input.setValue('1')
    expect((wrapper.vm as unknown as ComponentData).shareholderWithAmounts[0].amount).toBe(1)
  })

  it('should add and subtract the shareholder when click icon button', async () => {
    const wrapper = createComponent()

    // Add a new shareholder
    const addButton = wrapper.find('div[data-test="plus-icon"]')
    await addButton.trigger('click')
    expect((wrapper.vm as unknown as ComponentData).shareholderWithAmounts.length).toBe(2)

    // Subtract the shareholder
    const minusButton = wrapper.find('div[data-test="minus-icon"]')
    await minusButton.trigger('click')

    expect((wrapper.vm as unknown as ComponentData).shareholderWithAmounts.length).toBe(1)
  })

  it('should render loading button if loading is true', async () => {
    const wrapper = createComponent(true)

    expect(wrapper.findComponent(LoadingButton).exists()).toBeTruthy()
  })

  it('should emit submit event when button submit clicked', async () => {
    const wrapper = createComponent()

    const input = wrapper.find('input[data-test="address-input"]')
    await input.setValue('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266')

    const amountInput = wrapper.find('input[data-test="amount-input"]')
    await amountInput.setValue('1')

    await wrapper.find('button[data-test="submit-button"]').trigger('click')
    expect(wrapper.emitted('submit')).toBeTruthy()
  })

  it('should render list of user suggestions', async () => {
    const wrapper = createComponent()

    await wrapper.find('input[data-test="address-input"]').setValue('John')
    await wrapper.find('input[data-test="address-input"]').trigger('keyup')
    await wrapper.vm.$nextTick()
    const foundUsers = wrapper.findAll('a[data-test="found-user"]')

    expect(foundUsers.length).toBe(2)
  })

  it('should set address and name when click suggestion user', async () => {
    const wrapper = createComponent()

    await wrapper.find('input[data-test="address-input"]').setValue('John')
    await wrapper.find('input[data-test="address-input"]').trigger('keyup')
    await wrapper.vm.$nextTick()

    const foundUser = wrapper.find('a[data-test="found-user"]')
    await foundUser.trigger('click')

    expect((wrapper.vm as unknown as ComponentData).shareholderWithAmounts[0].shareholder).toBe(
      '0x123'
    )
  })

  it('should render error message when address is invalid', async () => {
    const wrapper = createComponent()

    const input = wrapper.find('input[data-test="address-input"]')
    await input.setValue('0x123')

    const amountInput = wrapper.find('input[data-test="amount-input"]')
    await amountInput.setValue('1')

    await wrapper.find('button[data-test="submit-button"]').trigger('click')
    await flushPromises()

    const errorMessage = wrapper.find('div[data-test="error-message-shareholder"]')
    expect(errorMessage.exists()).toBeTruthy()
    expect(errorMessage.text()).toBe('Invalid address')
  })

  it('should render error message when amount is invalid', async () => {
    const wrapper = createComponent()

    const input = wrapper.find('input[data-test="address-input"]')
    await input.setValue('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266')

    const amountInput = wrapper.find('input[data-test="amount-input"]')
    await amountInput.setValue(null)

    await wrapper.find('button[data-test="submit-button"]').trigger('click')
    await flushPromises()

    const errorMessage = wrapper.find('div[data-test="error-message-amount"]')
    expect(errorMessage.exists()).toBeTruthy()
    expect(errorMessage.text()).toBe('Amount is required')
  })
})
