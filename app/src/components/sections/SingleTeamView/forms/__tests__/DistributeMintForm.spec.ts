import { shallowMount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import DistributeMintForm from '../DistributeMintForm.vue'
import { createTestingPinia } from '@pinia/testing'
import LoadingButton from '@/components/LoadingButton.vue'

vi.mock('@/stores/useToastStore')

interface ComponentData {
  shareholderWithAmounts: { shareholder: string; amount: string }[]
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
})
