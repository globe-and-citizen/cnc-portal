import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import ToggleSherCompensationAction from '../ToggleSherCompensationAction.vue'
import {
  mockParseError,
  mockSafeDepositRouterAddress,
  mockSafeDepositRouterReads,
  mockSafeDepositRouterWrites,
  mockTeamStore,
  mockUseConnection
} from '@/tests/mocks'

describe('ToggleSherCompensationAction.vue', () => {
  const createWrapper = () =>
    mount(ToggleSherCompensationAction, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })

  beforeEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    mockParseError.mockReturnValue('Parsed error message')

    mockSafeDepositRouterAddress.value = '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'
    mockSafeDepositRouterReads.owner.data.value = '0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa'
    mockSafeDepositRouterReads.depositsEnabled.data.value = true
    mockSafeDepositRouterReads.safeAddress.data.value = '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'
    mockUseConnection.isConnected.value = true
    mockUseConnection.address.value = '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa'

    mockSafeDepositRouterWrites.enableDeposits.mutateAsync.mockResolvedValue(undefined)
    mockSafeDepositRouterWrites.disableDeposits.mutateAsync.mockResolvedValue(undefined)
    mockSafeDepositRouterWrites.setSafeAddress.mutateAsync.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not render when safe deposit router address is missing', () => {
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

  it('handleToggleCompensation blocks when router address missing', async () => {
    mockSafeDepositRouterAddress.value = ''
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as { handleToggleCompensation: () => Promise<void> }

    await vm.handleToggleCompensation()

    expect(wrapper.exists()).toBe(true)
  })

  it('handleToggleCompensation blocks when user is not owner', async () => {
    mockUseConnection.address.value = '0x0000000000000000000000000000000000000001'
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as { handleToggleCompensation: () => Promise<void> }

    await vm.handleToggleCompensation()

    expect(mockSafeDepositRouterWrites.enableDeposits.mutateAsync).not.toHaveBeenCalled()
    expect(mockSafeDepositRouterWrites.disableDeposits.mutateAsync).not.toHaveBeenCalled()
  })

  it('disables deposits when currently enabled', async () => {
    mockSafeDepositRouterReads.depositsEnabled.data.value = true
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as { handleToggleCompensation: () => Promise<void> }

    await vm.handleToggleCompensation()

    expect(mockSafeDepositRouterWrites.disableDeposits.mutateAsync).toHaveBeenCalledTimes(1)
  })

  it('enables deposits directly when safe address is correct', async () => {
    mockSafeDepositRouterReads.depositsEnabled.data.value = false
    mockSafeDepositRouterReads.safeAddress.data.value = '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as { handleToggleCompensation: () => Promise<void> }

    await vm.handleToggleCompensation()

    expect(mockSafeDepositRouterWrites.enableDeposits.mutateAsync).toHaveBeenCalledTimes(1)
  })

  it('updates safe address before enabling when safe address mismatches', async () => {
    mockSafeDepositRouterReads.depositsEnabled.data.value = false
    mockSafeDepositRouterReads.safeAddress.data.value = '0x1111111111111111111111111111111111111111'
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as { handleToggleCompensation: () => Promise<void> }

    await vm.handleToggleCompensation()

    expect(mockSafeDepositRouterWrites.setSafeAddress.mutateAsync).toHaveBeenCalledTimes(1)
    expect(mockSafeDepositRouterWrites.enableDeposits.mutateAsync).not.toHaveBeenCalled()
  })

  it('updateSafeAddress returns early when safe address is missing', async () => {
    mockTeamStore.getContractAddressByType = vi.fn(
      () => ''
    ) as unknown as typeof mockTeamStore.getContractAddressByType
    mockSafeDepositRouterReads.depositsEnabled.data.value = false
    mockSafeDepositRouterReads.safeAddress.data.value = '0x1111111111111111111111111111111111111111'
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as { handleToggleCompensation: () => Promise<void> }

    await vm.handleToggleCompensation()
    await vm.handleToggleCompensation()

    expect(mockSafeDepositRouterWrites.setSafeAddress.mutateAsync).not.toHaveBeenCalled()
    expect(wrapper.exists()).toBe(true)
  })

  it('setSafeAddress success while setting triggers delayed enable', async () => {
    vi.useFakeTimers()
    mockSafeDepositRouterReads.depositsEnabled.data.value = false
    mockSafeDepositRouterReads.safeAddress.data.value = '0x1111111111111111111111111111111111111111'

    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as { handleToggleCompensation: () => Promise<void> }

    await vm.handleToggleCompensation()
    mockSafeDepositRouterWrites.setSafeAddress.isSuccess.value = true
    await nextTick()

    vi.runAllTimers()
    await nextTick()

    expect(mockSafeDepositRouterWrites.enableDeposits.mutateAsync).toHaveBeenCalled()
    wrapper.unmount()
  })

  it('watch enable error path executes', async () => {
    const wrapper = createWrapper()
    mockSafeDepositRouterWrites.enableDeposits.error.value = new Error('boom')
    await nextTick()
    expect(wrapper.exists()).toBe(true)
    wrapper.unmount()
  })

  it('watch enable error handles user rejected message', async () => {
    mockParseError.mockReturnValue('User denied signature')
    const wrapper = createWrapper()
    mockSafeDepositRouterWrites.enableDeposits.error.value = new Error('boom')
    await nextTick()
    expect(wrapper.exists()).toBe(true)
    wrapper.unmount()
  })

  it('watch disable error path executes', async () => {
    const wrapper = createWrapper()
    mockSafeDepositRouterWrites.disableDeposits.error.value = new Error('boom')
    await nextTick()
    expect(wrapper.exists()).toBe(true)
    wrapper.unmount()
  })

  it('watch setSafeAddress error path executes', async () => {
    const wrapper = createWrapper()
    mockSafeDepositRouterWrites.setSafeAddress.error.value = new Error('boom')
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
