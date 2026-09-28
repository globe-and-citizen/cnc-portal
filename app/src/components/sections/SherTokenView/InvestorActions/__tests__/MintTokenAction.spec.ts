import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { nextTick } from 'vue'
import MintTokenAction from '../MintTokenAction.vue'
import { mockInvestorPermissions, mockUserStore } from '@/tests/mocks'

describe('MintTokenAction.vue', () => {
  const createWrapper = () =>
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
            name: 'MintForm',
            props: ['modelValue'],
            emits: ['update:modelValue', 'close-modal'],
            template:
              '<div data-test="mint-form" @click="$emit(\'update:modelValue\', false); $emit(\'close-modal\')" />'
          }
        }
      },
      props: {
        tokenSymbol: 'SHER'
      }
    })

  beforeEach(() => {
    vi.clearAllMocks()
    mockUserStore.address = '0x0000000000000000000000000000000000000001'
    mockInvestorPermissions.hasRole.data.value = true
    mockInvestorPermissions.hasRole.isLoading.value = false
  })

  it('[AC-US-SHER-004-06] enables mint for an Investor minter and opens the modal', async () => {
    const wrapper = createWrapper()

    expect(wrapper.findComponent({ name: 'UTooltip' }).props('text')).toBeUndefined()

    await wrapper.find('[data-test="mint-button"]').trigger('click')
    await nextTick()

    expect(wrapper.find('[data-test="mint-form"]').exists()).toBe(true)
  })

  it('[AC-US-SHER-004-06] disables mint without the minter role and shows the reason', async () => {
    mockInvestorPermissions.hasRole.data.value = false
    const wrapper = createWrapper()

    expect(wrapper.findComponent({ name: 'UTooltip' }).props('text')).toBe(
      'Only an account with the Investor minter role can mint tokens'
    )
    expect(wrapper.find('[data-test="mint-button"]').attributes('disabled')).toBeDefined()
    await wrapper.find('[data-test="mint-button"]').trigger('click')
    expect(wrapper.find('[data-test="mint-form"]').exists()).toBe(false)
  })

  it('renders mint form component only when modal is mounted', () => {
    const wrapper = createWrapper()

    expect(wrapper.find('[data-test="mint-form"]').exists()).toBe(false)
  })

  it('close-modal emitted by MintForm hides the mint form', async () => {
    const wrapper = createWrapper()

    await wrapper.find('[data-test="mint-button"]').trigger('click')
    await nextTick()
    expect(wrapper.find('[data-test="mint-form"]').exists()).toBe(true)

    await wrapper.findComponent({ name: 'MintForm' }).vm.$emit('close-modal')
    await nextTick()
    expect(wrapper.find('[data-test="mint-form"]').exists()).toBe(false)
  })

  it('v-model update:open false closes modal', async () => {
    const wrapper = createWrapper()

    await wrapper.find('[data-test="mint-button"]').trigger('click')
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
