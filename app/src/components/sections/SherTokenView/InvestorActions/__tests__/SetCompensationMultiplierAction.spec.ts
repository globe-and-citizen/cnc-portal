import { describe, it, expect, beforeEach, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import { BaseError, UserRejectedRequestError } from 'viem'
import SetCompensationMultiplierAction from '../SetCompensationMultiplierAction.vue'
import {
  mockSafeDepositRouterAddress,
  mockSafeDepositRouterReads,
  mockSafeDepositRouterWrites,
  mockTeamStore,
  mockToast,
  mockUseConnection,
  renderWithProviders
} from '@/tests/mocks'

describe('[US-SHER-005] SetCompensationMultiplierAction.vue', () => {
  const createWrapper = () =>
    renderWithProviders(SetCompensationMultiplierAction, {
      global: {
        stubs: { teleport: true }
      }
    })

  beforeEach(() => {
    vi.clearAllMocks()

    mockSafeDepositRouterAddress.value = '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'
    mockSafeDepositRouterReads.multiplier.data.value = 2500000n
    mockSafeDepositRouterReads.multiplier.isLoading.value = false
    mockSafeDepositRouterReads.owner.data.value = '0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa'

    mockUseConnection.isConnected.value = true
    mockUseConnection.address.value = '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa'
    mockTeamStore.currentTeamMeta.data.isArchived = false

    mockSafeDepositRouterWrites.setMultiplier.mutateAsync.mockResolvedValue(undefined)
  })

  it('[AC-US-SHER-005-08] hides multiplier configuration when the router is missing', () => {
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

  it('[AC-US-SHER-005-04] blocks multiplier configuration for a non-owner', async () => {
    mockUseConnection.address.value = '0x0000000000000000000000000000000000000001'
    const wrapper = createWrapper()

    await wrapper.find('[data-test="set-compensation-multiplier-button"]').trigger('click')

    expect(wrapper.find('[data-test="multiplier-input"]').exists()).toBe(false)
  })

  it('handleSetMultiplier shows error when address is missing', async () => {
    const wrapper = createWrapper()

    await wrapper.find('[data-test="set-compensation-multiplier-button"]').trigger('click')
    await wrapper.find('[data-test="multiplier-input"]').setValue('3')
    mockSafeDepositRouterAddress.value = ''
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockSafeDepositRouterWrites.setMultiplier.mutateAsync).not.toHaveBeenCalled()
  })

  it('handleSetMultiplier blocks non-owner', async () => {
    const wrapper = createWrapper()

    await wrapper.find('[data-test="set-compensation-multiplier-button"]').trigger('click')
    await wrapper.find('[data-test="multiplier-input"]').setValue('3')
    mockUseConnection.address.value = '0x0000000000000000000000000000000000000001'
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockSafeDepositRouterWrites.setMultiplier.mutateAsync).not.toHaveBeenCalled()
  })

  it('handleSetMultiplier blocks invalid multiplier', async () => {
    const wrapper = createWrapper()

    await wrapper.find('[data-test="set-compensation-multiplier-button"]').trigger('click')
    await wrapper.find('[data-test="multiplier-input"]').setValue('abc')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockSafeDepositRouterWrites.setMultiplier.mutateAsync).not.toHaveBeenCalled()
  })

  describe('schema validation', () => {
    it('[AC-US-SHER-005-06] rejects an empty multiplier', async () => {
      const wrapper = createWrapper()

      await wrapper.find('[data-test="set-compensation-multiplier-button"]').trigger('click')
      await wrapper.find('[data-test="multiplier-input"]').setValue('')
      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(mockSafeDepositRouterWrites.setMultiplier.mutateAsync).not.toHaveBeenCalled()
      expect(wrapper.text()).toContain('Multiplier is required')
    })

    it('[AC-US-SHER-005-06] rejects a non-numeric multiplier', async () => {
      const wrapper = createWrapper()

      await wrapper.find('[data-test="set-compensation-multiplier-button"]').trigger('click')
      await wrapper.find('[data-test="multiplier-input"]').setValue('abc')
      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(mockSafeDepositRouterWrites.setMultiplier.mutateAsync).not.toHaveBeenCalled()
      expect(wrapper.text()).toContain('Must be a valid number')
    })

    it('[AC-US-SHER-005-06] rejects a multiplier below the minimum', async () => {
      const wrapper = createWrapper()

      await wrapper.find('[data-test="set-compensation-multiplier-button"]').trigger('click')
      await wrapper.find('[data-test="multiplier-input"]').setValue('0.5')
      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(mockSafeDepositRouterWrites.setMultiplier.mutateAsync).not.toHaveBeenCalled()
      expect(wrapper.text()).toContain('Multiplier must be at least 1')
    })

    it('[AC-US-SHER-005-06] rejects a multiplier above the configured range', async () => {
      const wrapper = createWrapper()

      await wrapper.find('[data-test="set-compensation-multiplier-button"]').trigger('click')
      await wrapper.find('[data-test="multiplier-input"]').setValue('9999999999')
      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(mockSafeDepositRouterWrites.setMultiplier.mutateAsync).not.toHaveBeenCalled()
      expect(wrapper.text()).toContain('Multiplier is too large')
    })
  })

  it('handleSetMultiplier executes write for valid changed value', async () => {
    const wrapper = createWrapper()

    await wrapper.find('[data-test="set-compensation-multiplier-button"]').trigger('click')
    await wrapper.find('[data-test="multiplier-input"]').setValue('3')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockSafeDepositRouterWrites.setMultiplier.mutateAsync).toHaveBeenCalledTimes(1)
  })

  it('handleSetMultiplier blocks submission when parse returns 0n', async () => {
    mockSafeDepositRouterReads.multiplier.data.value = 5000000n
    const wrapper = createWrapper()

    await wrapper.find('[data-test="set-compensation-multiplier-button"]').trigger('click')
    await wrapper.find('[data-test="multiplier-input"]').setValue('+3')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockSafeDepositRouterWrites.setMultiplier.mutateAsync).not.toHaveBeenCalled()
  })

  it('[AC-US-SHER-005-09] reports a failed multiplier write without success', async () => {
    const wrapper = createWrapper()

    mockSafeDepositRouterWrites.setMultiplier.error.value = new Error('boom')
    await nextTick()

    expect(mockToast.add).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))
    expect(mockToast.add).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.stringContaining('updated successfully') })
    )
    wrapper.unmount()
  })

  it('[AC-US-SHER-005-07] blocks multiplier configuration for an archived company', async () => {
    mockTeamStore.currentTeamMeta.data.isArchived = true
    const wrapper = createWrapper()

    expect(
      wrapper.find('[data-test="set-compensation-multiplier-button"]').attributes('disabled')
    ).toBeDefined()
    await wrapper.find('[data-test="set-compensation-multiplier-button"]').trigger('click')
    expect(wrapper.find('[data-test="multiplier-input"]').exists()).toBe(false)
  })

  it('watcher reports a wallet rejection as cancelled', async () => {
    const wrapper = createWrapper()

    mockSafeDepositRouterWrites.setMultiplier.error.value = new BaseError('rejected', {
      cause: new UserRejectedRequestError(new Error('User rejected transaction'))
    })
    await nextTick()

    expect(mockToast.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Transaction was cancelled.', color: 'error' })
    )
    wrapper.unmount()
  })

  it('watcher handles success by toasting and closing modal', async () => {
    const wrapper = createWrapper()

    await wrapper.find('[data-test="set-compensation-multiplier-button"]').trigger('click')
    expect(wrapper.find('[data-test="multiplier-input"]').exists()).toBe(true)

    mockSafeDepositRouterWrites.setMultiplier.isSuccess.value = true
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
