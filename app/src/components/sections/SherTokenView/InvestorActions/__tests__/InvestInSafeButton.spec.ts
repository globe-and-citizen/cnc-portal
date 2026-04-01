import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { nextTick } from 'vue'
import InvestInSafeButton from '../InvestInSafeButton.vue'
import { mockSafeDepositRouterReads, mockTeamStore } from '@/tests/mocks'

describe('InvestInSafeButton', () => {
  const createWrapper = () =>
    mount(InvestInSafeButton, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          ActionButton: {
            props: ['disabled'],
            emits: ['click'],
            template:
              '<button data-test="invest-in-safe-button" :disabled="disabled" @click="$emit(\'click\')">Invest</button>'
          },
          SafeDepositRouterForm: {
            template: '<div data-test="safe-deposit-router-form" />'
          }
        }
      }
    })

  beforeEach(() => {
    vi.clearAllMocks()
    mockSafeDepositRouterReads.depositsEnabled.data.value = true
    mockSafeDepositRouterReads.depositsEnabled.isLoading.value = false
    mockSafeDepositRouterReads.paused.data.value = false
    mockSafeDepositRouterReads.paused.isLoading.value = false
    mockTeamStore.getContractAddressByType = vi.fn((type) => {
      if (type === 'Safe') return '0x1234567890123456789012345678901234567890'
      return '0x0000000000000000000000000000000000000000'
    }) as unknown as typeof mockTeamStore.getContractAddressByType
  })

  it('renders invest button', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('[data-test="invest-in-safe-button"]').exists()).toBe(true)
  })

  it('enables button when deposits are enabled and not paused', () => {
    const wrapper = createWrapper()

    expect(
      wrapper.find('[data-test="invest-in-safe-button"]').attributes('disabled')
    ).toBeUndefined()
    expect(wrapper.attributes('data-tip')).toBeUndefined()
  })

  it('disables button and shows tooltip when deposits are disabled', () => {
    mockSafeDepositRouterReads.depositsEnabled.data.value = false
    const wrapper = createWrapper()

    expect(wrapper.find('[data-test="invest-in-safe-button"]').attributes('disabled')).toBeDefined()
    expect(wrapper.attributes('data-tip')).toBe('SHER compensation deposits are not available')
  })

  it('disables button while loading', () => {
    mockSafeDepositRouterReads.depositsEnabled.isLoading.value = true
    const wrapper = createWrapper()

    expect(wrapper.find('[data-test="invest-in-safe-button"]').attributes('disabled')).toBeDefined()
  })

  it('disables button when safe address is missing', () => {
    mockTeamStore.getContractAddressByType = vi.fn(
      () => ''
    ) as unknown as typeof mockTeamStore.getContractAddressByType
    const wrapper = createWrapper()

    expect(wrapper.find('[data-test="invest-in-safe-button"]').attributes('disabled')).toBeDefined()
  })

  it('disables button when paused', () => {
    mockSafeDepositRouterReads.paused.data.value = true
    const wrapper = createWrapper()

    expect(wrapper.find('[data-test="invest-in-safe-button"]').attributes('disabled')).toBeDefined()
  })

  it('clicking enabled button opens the modal', async () => {
    const wrapper = createWrapper()

    await wrapper.find('[data-test="invest-in-safe-button"]').trigger('click')
    await nextTick()

    expect(wrapper.find('[data-test="safe-deposit-router-form"]').exists()).toBe(true)
  })

  it('closeModal via update:open hides modal content', async () => {
    const wrapper = createWrapper()

    await wrapper.find('[data-test="invest-in-safe-button"]').trigger('click')
    await nextTick()

    const modal = wrapper.findComponent({ name: 'UModal' })
    await modal.vm.$emit('update:open', false)
    await nextTick()

    expect(wrapper.find('[data-test="safe-deposit-router-form"]').exists()).toBe(false)
  })

  it('closeModal method hides modal content', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as { closeModal: () => void }

    await wrapper.find('[data-test="invest-in-safe-button"]').trigger('click')
    await nextTick()

    vm.closeModal()
    await nextTick()

    expect(wrapper.find('[data-test="safe-deposit-router-form"]').exists()).toBe(false)
  })
})
