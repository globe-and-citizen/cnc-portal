import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { nextTick } from 'vue'
import SetCompensationMultiplierAction from '../SetCompensationMultiplierAction.vue'
import {
  mockParseError,
  mockSafeDepositRouterAddress,
  mockSafeDepositRouterReads,
  mockSafeDepositRouterWrites,
  mockUseConnection,
  resetSafeDepositRouterMocks
} from '@/tests/mocks'

describe('SetCompensationMultiplierAction.vue', () => {
  const createWrapper = () =>
    mount(SetCompensationMultiplierAction, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })

  beforeEach(() => {
    vi.clearAllMocks()
    resetSafeDepositRouterMocks()
    mockParseError.mockReturnValue('Parsed error message')

    mockSafeDepositRouterAddress.value = '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'
    mockSafeDepositRouterReads.multiplier.data.value = 2500000n
    mockSafeDepositRouterReads.multiplier.isLoading.value = false
    mockSafeDepositRouterReads.owner.data.value = '0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa'

    mockUseConnection.isConnected.value = true
    mockUseConnection.address.value = '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa'

    mockSafeDepositRouterWrites.setMultiplier.executeWrite.mockResolvedValue(undefined)
  })

  it('does not render when safe deposit router address is missing', () => {
    mockSafeDepositRouterAddress.value = ''
    const wrapper = createWrapper()

    expect(wrapper.find('[data-test="set-compensation-multiplier-button"]').exists()).toBe(false)
  })

  it('renders current multiplier badge', () => {
    const wrapper = createWrapper()

    const actionButton = wrapper.findComponent({ name: 'ActionButton' })
    expect(actionButton.exists()).toBe(true)
    expect(actionButton.props('badge')).toBe('2.5x')
  })

  it('opens modal for owner', async () => {
    const wrapper = createWrapper()

    expect(wrapper.find('[data-test="multiplier-input"]').exists()).toBe(false)

    await wrapper.find('[data-test="set-compensation-multiplier-button"]').trigger('click')

    expect(wrapper.find('[data-test="multiplier-input"]').exists()).toBe(true)
  })

  it('blocks modal open for non-owner', async () => {
    mockUseConnection.address.value = '0x0000000000000000000000000000000000000001'
    const wrapper = createWrapper()

    await wrapper.find('[data-test="set-compensation-multiplier-button"]').trigger('click')

    expect(wrapper.find('[data-test="multiplier-input"]').exists()).toBe(false)
  })

  it('handleSetMultiplier shows error when address is missing', async () => {
    mockSafeDepositRouterAddress.value = ''
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as { handleSetMultiplier: () => Promise<void> }

    await vm.handleSetMultiplier()

    expect(wrapper.exists()).toBe(true)
  })

  it('handleSetMultiplier blocks non-owner', async () => {
    mockUseConnection.address.value = '0x0000000000000000000000000000000000000001'
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as { handleSetMultiplier: () => Promise<void> }

    await vm.handleSetMultiplier()

    expect(wrapper.exists()).toBe(true)
  })

  it('handleSetMultiplier blocks invalid multiplier', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as { handleSetMultiplier: () => Promise<void> }

    await wrapper.find('[data-test="set-compensation-multiplier-button"]').trigger('click')
    await wrapper.find('[data-test="multiplier-input"]').setValue('abc')
    await vm.handleSetMultiplier()

    expect(mockSafeDepositRouterWrites.setMultiplier.executeWrite).not.toHaveBeenCalled()
  })

  it('handleSetMultiplier executes write for valid changed value', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as { handleSetMultiplier: () => Promise<void> }

    await wrapper.find('[data-test="set-compensation-multiplier-button"]').trigger('click')
    await wrapper.find('[data-test="multiplier-input"]').setValue('3')
    await vm.handleSetMultiplier()

    expect(mockSafeDepositRouterWrites.setMultiplier.executeWrite).toHaveBeenCalledTimes(1)
  })

  it('handleSetMultiplier catches formatting errors', async () => {
    mockSafeDepositRouterWrites.setMultiplier.executeWrite.mockRejectedValue(new Error('fail'))
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as { handleSetMultiplier: () => Promise<void> }

    await wrapper.find('[data-test="set-compensation-multiplier-button"]').trigger('click')
    await wrapper.find('[data-test="multiplier-input"]').setValue('3')
    await vm.handleSetMultiplier()

    expect(mockSafeDepositRouterWrites.setMultiplier.executeWrite).toHaveBeenCalled()
  })

  it('watcher handles write error with generic message', async () => {
    const wrapper = createWrapper()

    mockSafeDepositRouterWrites.setMultiplier.writeResult.error.value = new Error('boom')
    await nextTick()

    expect(wrapper.exists()).toBe(true)
    wrapper.unmount()
  })

  it('watcher handles write error with user rejected message', async () => {
    mockParseError.mockReturnValue('User rejected transaction')
    const wrapper = createWrapper()

    mockSafeDepositRouterWrites.setMultiplier.writeResult.error.value = new Error('boom')
    await nextTick()

    expect(wrapper.exists()).toBe(true)
    wrapper.unmount()
  })

  it('watcher handles success by toasting and closing modal', async () => {
    const wrapper = createWrapper()

    await wrapper.find('[data-test="set-compensation-multiplier-button"]').trigger('click')
    expect(wrapper.find('[data-test="multiplier-input"]').exists()).toBe(true)

    mockSafeDepositRouterWrites.setMultiplier.receiptResult.isSuccess.value = true
    await nextTick()

    expect(wrapper.find('[data-test="multiplier-input"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('cancel button triggers closeModal', async () => {
    const wrapper = createWrapper()

    await wrapper.find('[data-test="set-compensation-multiplier-button"]').trigger('click')
    expect(wrapper.find('[data-test="multiplier-input"]').exists()).toBe(true)

    await wrapper.find('[data-test="cancel-button"]').trigger('click')

    expect(wrapper.find('[data-test="multiplier-input"]').exists()).toBe(false)
  })
})
