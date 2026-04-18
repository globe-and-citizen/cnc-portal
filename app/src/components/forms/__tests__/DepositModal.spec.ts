import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import DepositModal from '../DepositModal.vue'

describe('DepositModal', () => {
  let wrapper: VueWrapper
  const mockBankAddress = '0x1234567890123456789012345678901234567890' as const

  const mountComponent = () =>
    mount(DepositModal, {
      props: {
        bankAddress: mockBankAddress
      },
      global: {
        stubs: {
          DepositSafeForm: {
            name: 'DepositSafeForm',
            props: ['safeAddress'],
            emits: ['close-modal'],
            template:
              '<button data-test="close-form" @click="$emit(\'close-modal\')">Close</button>'
          }
        }
      }
    })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })

  it('renders the trigger and starts closed', () => {
    wrapper = mountComponent()

    expect(wrapper.find('[data-test="deposit-button"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="close-form"]').exists()).toBe(false)
  })

  it('opens through the modal v-model and closes when the child emits close-modal', async () => {
    wrapper = mountComponent()

    await wrapper.findComponent({ name: 'UModal' }).vm.$emit('update:open', true)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="close-form"]').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'DepositSafeForm' }).props('safeAddress')).toBe(
      mockBankAddress
    )

    await wrapper.find('[data-test="close-form"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="close-form"]').exists()).toBe(false)
  })
})
