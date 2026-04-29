import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { nextTick } from 'vue'
import type { Address } from 'viem'
import MintTokenAction from '../MintTokenAction.vue'
import { mockUserStore } from '@/tests/mocks'

describe('MintTokenAction.vue', () => {
  const owner = '0x0000000000000000000000000000000000000001' as Address

  const createWrapper = (props = {}) =>
    mount(MintTokenAction, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          ActionButton: {
            props: ['disabled'],
            emits: ['click'],
            template:
              '<button data-test="mint-button" :disabled="disabled" @click="$emit(\'click\')">Mint</button>'
          },
          MintForm: {
            props: ['modelValue'],
            emits: ['update:modelValue', 'close-modal'],
            template:
              '<div data-test="mint-form" @click="$emit(\'update:modelValue\', false); $emit(\'close-modal\')" />'
          }
        }
      },
      props: {
        tokenSymbol: 'SHER',
        investorsOwner: owner,
        ...props
      }
    })

  beforeEach(() => {
    vi.clearAllMocks()
    mockUserStore.address = owner
  })

  it('enables mint button for token owner and opens modal', async () => {
    const wrapper = createWrapper()

    expect(wrapper.attributes('data-tip')).toBe('')
    expect(wrapper.classes()).not.toContain('tooltip')

    await wrapper.find('[data-test="mint-button"]').trigger('click')
    await nextTick()

    expect(wrapper.find('[data-test="mint-form"]').exists()).toBe(true)
  })

  it('disables mint button for non-owner and shows tooltip reason', () => {
    const wrapper = createWrapper({
      investorsOwner: '0x2222222222222222222222222222222222222222' as Address
    })

    expect(wrapper.classes()).toContain('tooltip')
    expect(wrapper.attributes('data-tip')).toBe('Only the token owner can mint tokens')
    expect(wrapper.find('[data-test="mint-button"]').attributes('disabled')).toBeDefined()
  })

  it('renders mint form component only when modal is mounted', () => {
    const wrapper = createWrapper()

    expect(wrapper.find('[data-test="mint-form"]').exists()).toBe(false)
  })

  it('closeModal hides the mint form', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as { openModal: () => void; closeModal: () => void }

    await vm.openModal()
    await nextTick()
    expect(wrapper.find('[data-test="mint-form"]').exists()).toBe(true)

    vm.closeModal()
    await nextTick()
    expect(wrapper.find('[data-test="mint-form"]').exists()).toBe(false)
  })

  it('v-model update:open false closes modal', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as { openModal: () => void }

    await vm.openModal()
    await nextTick()

    const modal = wrapper.findComponent({ name: 'UModal' })
    await modal.vm.$emit('update:open', false)
    await nextTick()

    expect(wrapper.find('[data-test="mint-form"]').exists()).toBe(false)
  })

  it('close-modal emitted by MintForm closes modal', async () => {
    const wrapper = createWrapper()

    await wrapper.find('[data-test="mint-button"]').trigger('click')
    await nextTick()

    await wrapper.find('[data-test="mint-form"]').trigger('click')
    await nextTick()

    expect(wrapper.find('[data-test="mint-form"]').exists()).toBe(false)
  })
})
