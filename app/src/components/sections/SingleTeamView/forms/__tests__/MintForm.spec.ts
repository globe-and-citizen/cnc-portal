import { shallowMount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import MintForm from '../MintForm.vue'
import type { Address } from 'viem'
import { createTestingPinia } from '@pinia/testing'

interface Props {
  address: Address | undefined
  tokenSymbol: string
  loading: boolean
}

interface ComponentData {
  to: string
  amount: number
}

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

    const input = wrapper.find('input[data-test="address-input"]')
    await input.setValue('0x123')
    expect((wrapper.vm as unknown as ComponentData).to).toBe('0x123')
  })

  it('should set amount correctly', async () => {
    const wrapper = createComponent()

    const input = wrapper.find('input[data-test="amount-input"]')
    await input.setValue('1')
    expect((wrapper.vm as unknown as ComponentData).amount).toBe(1)
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

  it('should set to value to be address based on prop', async () => {
    const wrapper = createComponent({ address: '0x123' })

    expect((wrapper.vm as unknown as ComponentData).to).toBe('0x123')
  })
})
