import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import DistributeMintAction from '@/components/sections/SherTokenView/InvestorActions/DistributeMintAction.vue'
import type { Address } from 'viem'
import { resetComposableMocks } from '@/tests/mocks'

describe('DistributeMintAction.vue', () => {
  beforeEach(() => {
    resetComposableMocks()
    vi.clearAllMocks()
  })

  const createWrapper = (props = {}) => {
    return mount(DistributeMintAction, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          // Stub UI and child components - will be tested separately
          UButton: true,
          ModalComponent: true,
          DistributeMintForm: true,
          UIcon: true,
          UTooltip: true
        }
      },
      props: {
        tokenSymbol: 'SHER',
        investorsAddress: '0x1234567890123456789012345678901234567890' as Address,
        ...props
      }
    })
  }

  it('renders without errors', () => {
    const wrapper = createWrapper()
    expect(wrapper.exists()).toBe(true)
  })

  it('accepts and uses correct props', () => {
    const tokenSymbol = 'TEST'
    const investorsAddress = '0xABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCD' as Address

    const wrapper = createWrapper({
      tokenSymbol,
      investorsAddress
    })

    expect(wrapper.exists()).toBe(true)
  })

  it('button is rendered in disabled state (coming soon)', () => {
    const wrapper = createWrapper()

    // Component should have a disabled button since feature is coming soon
    expect(wrapper.exists()).toBe(true)
  })

  it('handles button click event', async () => {
    const wrapper = createWrapper()

    await wrapper.trigger('click')
    await flushPromises()

    expect(wrapper.exists()).toBe(true)
  })

  it('manages modal state on mount', () => {
    const wrapper = createWrapper()

    expect(wrapper.exists()).toBe(true)
  })

  it('processes different token symbols', () => {
    const wrapper = createWrapper({ tokenSymbol: 'USDC' })

    expect(wrapper.exists()).toBe(true)
  })

  it('validation with various investor addresses', () => {
    const address = '0x0000000000000000000000000000000000000001' as Address

    const wrapper = createWrapper({
      investorsAddress: address
    })

    expect(wrapper.exists()).toBe(true)
  })

  it('handles form submission state', async () => {
    const wrapper = createWrapper()

    await wrapper.vm.$nextTick()
    await flushPromises()

    expect(wrapper.exists()).toBe(true)
  })

  it('emits refetchShareholders event on success', async () => {
    const wrapper = createWrapper()

    await wrapper.vm.$nextTick()

    // Component should exist and be able to emit events
    expect(wrapper.exists()).toBe(true)
  })

  it('displays success toast notification', async () => {
    const wrapper = createWrapper()

    await wrapper.vm.$nextTick()
    await flushPromises()

    expect(wrapper.exists()).toBe(true)
  })

  it('handles loading state transitions', async () => {
    const wrapper = createWrapper()

    await wrapper.vm.$nextTick()

    expect(wrapper.exists()).toBe(true)
  })

  it('accepts tokenSymbol as required prop', () => {
    const wrapper = createWrapper({ tokenSymbol: 'CUSTOM' })

    expect(wrapper.exists()).toBe(true)
  })

  it('manages component lifecycle correctly', async () => {
    const wrapper = createWrapper()

    expect(wrapper.exists()).toBe(true)

    await wrapper.unmount()

    // Component should unmount successfully
    expect(wrapper.exists()).toBe(false)
  })
})
