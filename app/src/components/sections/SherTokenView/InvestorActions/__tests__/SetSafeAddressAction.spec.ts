import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import SetSafeAddressAction from '../SetSafeAddressAction.vue'
import {
  mockParseError,
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
    mockParseError.mockReturnValue('Parsed error message')

    mockSafeDepositRouterAddress.value = TEAM_SAFE_ADDRESS
    mockSafeDepositRouterReads.owner.data.value = '0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa'
    mockSafeDepositRouterReads.safeAddress.data.value = OTHER_ADDRESS
    mockUseConnection.isConnected.value = true
    mockUseConnection.address.value = '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa'

    mockSafeDepositRouterWrites.setSafeAddress.mutateAsync.mockResolvedValue(undefined)
  })

  it('does not render when safe deposit router address is missing', () => {
    mockSafeDepositRouterAddress.value = ''
    const wrapper = createWrapper()

    expect(wrapper.find('[data-test="set-safe-address-button"]').exists()).toBe(false)
  })

  it('sets the team safe address on the router', async () => {
    const wrapper = createWrapper()

    await wrapper.findComponent({ name: 'ActionButton' }).vm.$emit('click')
    await nextTick()

    expect(mockSafeDepositRouterWrites.setSafeAddress.mutateAsync).toHaveBeenCalledWith({
      args: [TEAM_SAFE_ADDRESS]
    })
  })

  it('blocks and warns when the connected account is not the owner', async () => {
    mockUseConnection.address.value = '0x0000000000000000000000000000000000000001'
    const wrapper = createWrapper()

    await wrapper.findComponent({ name: 'ActionButton' }).vm.$emit('click')
    await nextTick()

    expect(mockSafeDepositRouterWrites.setSafeAddress.mutateAsync).not.toHaveBeenCalled()
    expect(mockToast.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Only the owner can set the Safe address', color: 'error' })
    )
  })

  it('warns when the team has no Safe address', async () => {
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

  it('reports a failed safe address update', async () => {
    const wrapper = createWrapper()
    mockSafeDepositRouterWrites.setSafeAddress.error.value = new Error('boom')
    await nextTick()

    expect(mockToast.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Failed to update Safe address', color: 'error' })
    )
    wrapper.unmount()
  })

  it('reports a user-rejected safe address update', async () => {
    mockParseError.mockReturnValue('User denied signature')
    const wrapper = createWrapper()
    mockSafeDepositRouterWrites.setSafeAddress.error.value = new Error('boom')
    await nextTick()

    expect(mockToast.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Transaction cancelled by user', color: 'error' })
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
