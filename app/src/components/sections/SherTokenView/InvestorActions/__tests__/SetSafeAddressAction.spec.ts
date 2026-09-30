import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { BaseError, UserRejectedRequestError } from 'viem'
import SetSafeAddressAction from '../SetSafeAddressAction.vue'
import {
  mockSafeDepositRouterAddress,
  mockSafeDepositRouterReads,
  mockSafeDepositRouterWrites,
  mockTeamStore,
  mockToast,
  mockUseConnection,
  renderWithProviders
} from '@/tests/mocks'

const TEAM_SAFE_ADDRESS = '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'
const OTHER_ADDRESS = '0x1111111111111111111111111111111111111111'

describe('SetSafeAddressAction.vue', () => {
  const createWrapper = () => renderWithProviders(SetSafeAddressAction)

  beforeEach(() => {
    vi.clearAllMocks()

    mockSafeDepositRouterAddress.value = TEAM_SAFE_ADDRESS
    mockSafeDepositRouterReads.owner.data.value = '0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa'
    mockSafeDepositRouterReads.safeAddress.data.value = OTHER_ADDRESS
    mockUseConnection.isConnected.value = true
    mockUseConnection.address.value = '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa'
    mockTeamStore.currentTeamMeta.data.isArchived = false

    mockSafeDepositRouterWrites.setSafeAddress.mutateAsync.mockResolvedValue(undefined)
  })

  it('[AC-US-SHER-005-08] hides Safe configuration when the router is missing', () => {
    mockSafeDepositRouterAddress.value = ''
    const wrapper = createWrapper()

    expect(wrapper.find('[data-test="set-safe-address-button"]').exists()).toBe(false)
  })

  it('[AC-US-SHER-005-01] sets the company Safe on the router', async () => {
    const wrapper = createWrapper()

    await wrapper.findComponent({ name: 'ActionButton' }).vm.$emit('click')
    await nextTick()

    expect(mockSafeDepositRouterWrites.setSafeAddress.mutateAsync).toHaveBeenCalledWith({
      args: [TEAM_SAFE_ADDRESS]
    })
  })

  it('[AC-US-SHER-005-04] blocks Safe configuration for a non-owner', async () => {
    mockUseConnection.address.value = '0x0000000000000000000000000000000000000001'
    const wrapper = createWrapper()

    await wrapper.findComponent({ name: 'ActionButton' }).vm.$emit('click')
    await nextTick()

    expect(mockSafeDepositRouterWrites.setSafeAddress.mutateAsync).not.toHaveBeenCalled()
    expect(mockToast.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Only the owner can set the Safe address', color: 'error' })
    )
  })

  it('[AC-US-SHER-005-08] blocks Safe configuration when the company Safe is missing', async () => {
    mockTeamStore.getContractAddressByType = vi.fn(
      () => ''
    ) as unknown as typeof mockTeamStore.getContractAddressByType
    const wrapper = createWrapper()

    await wrapper.findComponent({ name: 'ActionButton' }).vm.$emit('click')
    await nextTick()

    expect(mockSafeDepositRouterWrites.setSafeAddress.mutateAsync).not.toHaveBeenCalled()
    expect(mockToast.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Safe address not found', color: 'error' })
    )
  })

  it('is disabled and badged once the safe address matches the team safe', async () => {
    mockSafeDepositRouterReads.safeAddress.data.value = TEAM_SAFE_ADDRESS
    const wrapper = createWrapper()

    expect(wrapper.findComponent({ name: 'ActionButton' }).props('badge')).toBe('Set')
    expect(
      wrapper.find('[data-test="set-safe-address-button"]').attributes('disabled')
    ).toBeDefined()

    await wrapper.findComponent({ name: 'ActionButton' }).vm.$emit('click')
    await nextTick()

    expect(mockSafeDepositRouterWrites.setSafeAddress.mutateAsync).not.toHaveBeenCalled()
  })

  it('[AC-US-SHER-005-09] reports a failed Safe update without reporting success', async () => {
    const wrapper = createWrapper()
    mockSafeDepositRouterWrites.setSafeAddress.error.value = new Error('boom')
    await nextTick()

    expect(mockToast.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'boom', color: 'error' })
    )
    expect(mockToast.add).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Safe address updated successfully' })
    )
    wrapper.unmount()
  })

  it('[AC-US-SHER-005-07] blocks Safe configuration for an archived company', async () => {
    mockTeamStore.currentTeamMeta.data.isArchived = true
    const wrapper = createWrapper()

    expect(
      wrapper.find('[data-test="set-safe-address-button"]').attributes('disabled')
    ).toBeDefined()
    await wrapper.findComponent({ name: 'ActionButton' }).vm.$emit('click')
    expect(mockSafeDepositRouterWrites.setSafeAddress.mutateAsync).not.toHaveBeenCalled()
  })

  it('reports a user-rejected safe address update', async () => {
    const wrapper = createWrapper()
    mockSafeDepositRouterWrites.setSafeAddress.error.value = new BaseError('rejected', {
      cause: new UserRejectedRequestError(new Error('User denied signature'))
    })
    await nextTick()

    expect(mockToast.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Transaction was cancelled.', color: 'error' })
    )
    wrapper.unmount()
  })

  it('reports a successful safe address update', async () => {
    const wrapper = createWrapper()
    mockSafeDepositRouterWrites.setSafeAddress.isSuccess.value = true
    await nextTick()

    expect(mockToast.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Safe address updated successfully', color: 'success' })
    )
    wrapper.unmount()
  })
})
