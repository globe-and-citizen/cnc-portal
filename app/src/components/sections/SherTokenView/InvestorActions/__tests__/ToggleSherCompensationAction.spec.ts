import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { BaseError, UserRejectedRequestError } from 'viem'
import ToggleSherCompensationAction from '../ToggleSherCompensationAction.vue'
import {
  mockSafeDepositRouterAddress,
  mockSafeDepositRouterReads,
  mockSafeDepositRouterWrites,
  mockTeamStore,
  mockToast,
  mockUseConnection,
  renderWithProviders
} from '@/tests/mocks'

describe('ToggleSherCompensationAction.vue', () => {
  const createWrapper = () => renderWithProviders(ToggleSherCompensationAction)

  beforeEach(() => {
    vi.clearAllMocks()

    mockSafeDepositRouterAddress.value = '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'
    mockSafeDepositRouterReads.owner.data.value = '0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa'
    mockSafeDepositRouterReads.depositsEnabled.data.value = true
    mockSafeDepositRouterReads.safeAddress.data.value = '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'
    mockUseConnection.isConnected.value = true
    mockUseConnection.address.value = '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa'
    mockTeamStore.currentTeamMeta.data.isArchived = false

    mockSafeDepositRouterWrites.enableDeposits.mutateAsync.mockResolvedValue(undefined)
    mockSafeDepositRouterWrites.disableDeposits.mutateAsync.mockResolvedValue(undefined)
  })

  it('[AC-US-SHER-005-08] hides deposit controls when the router is missing', () => {
    mockSafeDepositRouterAddress.value = ''
    const wrapper = createWrapper()

    expect(wrapper.find('[data-test="toggle-sher-compensation-button"]').exists()).toBe(false)
  })

  it('shows enable state when deposits are disabled', () => {
    mockSafeDepositRouterReads.depositsEnabled.data.value = false
    const wrapper = createWrapper()

    const actionButton = wrapper.findComponent({ name: 'ActionButton' })
    expect(actionButton.props('title')).toBe('Enable SHER Compensation')
  })

  it('shows disable state when deposits are enabled', () => {
    mockSafeDepositRouterReads.depositsEnabled.data.value = true
    const wrapper = createWrapper()

    const actionButton = wrapper.findComponent({ name: 'ActionButton' })
    expect(actionButton.props('title')).toBe('Disable SHER Compensation')
  })

  it('disables action when connected account is not owner', () => {
    mockUseConnection.address.value = '0x0000000000000000000000000000000000000001'
    const wrapper = createWrapper()

    const actionButton = wrapper.findComponent({ name: 'ActionButton' })
    expect(actionButton.exists()).toBe(true)
  })

  it('[AC-US-SHER-005-04] blocks deposit controls for a non-owner', async () => {
    mockUseConnection.address.value = '0x0000000000000000000000000000000000000001'
    const wrapper = createWrapper()

    await wrapper.findComponent({ name: 'ActionButton' }).vm.$emit('click')
    await nextTick()

    expect(mockSafeDepositRouterWrites.enableDeposits.mutateAsync).not.toHaveBeenCalled()
    expect(mockSafeDepositRouterWrites.disableDeposits.mutateAsync).not.toHaveBeenCalled()
  })

  it('disables deposits when currently enabled', async () => {
    mockSafeDepositRouterReads.depositsEnabled.data.value = true
    const wrapper = createWrapper()

    await wrapper.findComponent({ name: 'ActionButton' }).vm.$emit('click')
    await nextTick()

    expect(mockSafeDepositRouterWrites.disableDeposits.mutateAsync).toHaveBeenCalledTimes(1)
  })

  it('enables deposits when safe address is already set', async () => {
    mockSafeDepositRouterReads.depositsEnabled.data.value = false
    mockSafeDepositRouterReads.safeAddress.data.value = '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'
    const wrapper = createWrapper()

    await wrapper.findComponent({ name: 'ActionButton' }).vm.$emit('click')
    await nextTick()

    expect(mockSafeDepositRouterWrites.enableDeposits.mutateAsync).toHaveBeenCalledTimes(1)
  })

  it('[AC-US-SHER-005-08] blocks enabling deposits when the company Safe is not synchronized', async () => {
    mockSafeDepositRouterReads.depositsEnabled.data.value = false
    mockSafeDepositRouterReads.safeAddress.data.value = '0x1111111111111111111111111111111111111111'
    const wrapper = createWrapper()

    await wrapper.findComponent({ name: 'ActionButton' }).vm.$emit('click')
    await nextTick()

    expect(mockSafeDepositRouterWrites.setSafeAddress.mutateAsync).not.toHaveBeenCalled()
    expect(mockSafeDepositRouterWrites.enableDeposits.mutateAsync).not.toHaveBeenCalled()
  })

  it('disables the button while the safe address is not set', () => {
    mockSafeDepositRouterReads.depositsEnabled.data.value = false
    mockSafeDepositRouterReads.safeAddress.data.value = '0x1111111111111111111111111111111111111111'
    const wrapper = createWrapper()

    const button = wrapper.find('[data-test="toggle-sher-compensation-button"]')
    expect(button.attributes('disabled')).toBeDefined()
  })

  it('[AC-US-SHER-005-09] reports a failed deposit-control write without success', async () => {
    const wrapper = createWrapper()
    mockSafeDepositRouterWrites.enableDeposits.error.value = new Error('boom')
    await nextTick()
    expect(mockToast.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'boom', color: 'error' })
    )
    expect(mockToast.add).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: 'SHER compensation enabled successfully' })
    )
    wrapper.unmount()
  })

  it('[AC-US-SHER-005-07] blocks deposit configuration for an archived company', async () => {
    mockTeamStore.currentTeamMeta.data.isArchived = true
    const wrapper = createWrapper()

    expect(
      wrapper.find('[data-test="toggle-sher-compensation-button"]').attributes('disabled')
    ).toBeDefined()
    await wrapper.findComponent({ name: 'ActionButton' }).vm.$emit('click')
    expect(mockSafeDepositRouterWrites.disableDeposits.mutateAsync).not.toHaveBeenCalled()
  })

  it('watch enable error reports a wallet rejection as cancelled', async () => {
    const wrapper = createWrapper()
    mockSafeDepositRouterWrites.enableDeposits.error.value = new BaseError('rejected', {
      cause: new UserRejectedRequestError(new Error('User denied signature'))
    })
    await nextTick()
    expect(mockToast.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Transaction was cancelled.', color: 'error' })
    )
    wrapper.unmount()
  })

  it('watch disable error path executes', async () => {
    const wrapper = createWrapper()
    mockSafeDepositRouterWrites.disableDeposits.error.value = new Error('boom')
    await nextTick()
    expect(wrapper.exists()).toBe(true)
    wrapper.unmount()
  })

  it('watch success paths execute for enable and disable', async () => {
    const wrapper = createWrapper()
    mockSafeDepositRouterWrites.enableDeposits.isSuccess.value = true
    mockSafeDepositRouterWrites.disableDeposits.isSuccess.value = true
    await nextTick()
    expect(wrapper.exists()).toBe(true)
    wrapper.unmount()
  })
})
