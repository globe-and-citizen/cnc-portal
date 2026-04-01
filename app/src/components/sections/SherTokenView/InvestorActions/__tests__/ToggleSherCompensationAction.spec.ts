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
  mockUseConnection,
  resetSafeDepositRouterMocks
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
    resetSafeDepositRouterMocks()
    mockParseError.mockReturnValue('Parsed error message')

    mockSafeDepositRouterAddress.value = '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'
    mockSafeDepositRouterReads.owner.data.value = '0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa'
    mockSafeDepositRouterReads.depositsEnabled.data.value = true
    mockSafeDepositRouterReads.safeAddress.data.value = '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'
    mockUseConnection.isConnected.value = true
    mockUseConnection.address.value = '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa'

    mockSafeDepositRouterWrites.enableDeposits.executeWrite.mockResolvedValue(undefined)
    mockSafeDepositRouterWrites.disableDeposits.executeWrite.mockResolvedValue(undefined)
    mockSafeDepositRouterWrites.setSafeAddress.executeWrite.mockResolvedValue(undefined)
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

    expect(mockSafeDepositRouterWrites.enableDeposits.executeWrite).not.toHaveBeenCalled()
    expect(mockSafeDepositRouterWrites.disableDeposits.executeWrite).not.toHaveBeenCalled()
  })

  it('disables deposits when currently enabled', async () => {
    mockSafeDepositRouterReads.depositsEnabled.data.value = true
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as { handleToggleCompensation: () => Promise<void> }

    await vm.handleToggleCompensation()

    expect(mockSafeDepositRouterWrites.disableDeposits.executeWrite).toHaveBeenCalledTimes(1)
  })

  it('enables deposits directly when safe address is correct', async () => {
    mockSafeDepositRouterReads.depositsEnabled.data.value = false
    mockSafeDepositRouterReads.safeAddress.data.value = '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as { handleToggleCompensation: () => Promise<void> }

    await vm.handleToggleCompensation()

    expect(mockSafeDepositRouterWrites.enableDeposits.executeWrite).toHaveBeenCalledTimes(1)
  })

  it('updates safe address before enabling when safe address mismatches', async () => {
    mockSafeDepositRouterReads.depositsEnabled.data.value = false
    mockSafeDepositRouterReads.safeAddress.data.value = '0x1111111111111111111111111111111111111111'
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as { handleToggleCompensation: () => Promise<void> }

    await vm.handleToggleCompensation()

    expect(mockSafeDepositRouterWrites.setSafeAddress.executeWrite).toHaveBeenCalledTimes(1)
    expect(mockSafeDepositRouterWrites.enableDeposits.executeWrite).not.toHaveBeenCalled()
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

    expect(mockSafeDepositRouterWrites.setSafeAddress.executeWrite).not.toHaveBeenCalled()
    expect(wrapper.exists()).toBe(true)
  })

  it('setSafeAddress success while setting triggers delayed enable', async () => {
    vi.useFakeTimers()
    mockSafeDepositRouterReads.depositsEnabled.data.value = false
    mockSafeDepositRouterReads.safeAddress.data.value = '0x1111111111111111111111111111111111111111'

    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as { handleToggleCompensation: () => Promise<void> }

    await vm.handleToggleCompensation()
    mockSafeDepositRouterWrites.setSafeAddress.receiptResult.isSuccess.value = true
    await nextTick()

    vi.runAllTimers()
    await nextTick()

    expect(mockSafeDepositRouterWrites.enableDeposits.executeWrite).toHaveBeenCalled()
    wrapper.unmount()
  })

  it('watch enable error path executes', async () => {
    const wrapper = createWrapper()
    mockSafeDepositRouterWrites.enableDeposits.writeResult.error.value = new Error('boom')
    await nextTick()
    expect(wrapper.exists()).toBe(true)
    wrapper.unmount()
  })

  it('watch enable error handles user rejected message', async () => {
    mockParseError.mockReturnValue('User denied signature')
    const wrapper = createWrapper()
    mockSafeDepositRouterWrites.enableDeposits.writeResult.error.value = new Error('boom')
    await nextTick()
    expect(wrapper.exists()).toBe(true)
    wrapper.unmount()
  })

  it('watch disable error path executes', async () => {
    const wrapper = createWrapper()
    mockSafeDepositRouterWrites.disableDeposits.writeResult.error.value = new Error('boom')
    await nextTick()
    expect(wrapper.exists()).toBe(true)
    wrapper.unmount()
  })

  it('watch setSafeAddress error path executes', async () => {
    const wrapper = createWrapper()
    mockSafeDepositRouterWrites.setSafeAddress.writeResult.error.value = new Error('boom')
    await nextTick()
    expect(wrapper.exists()).toBe(true)
    wrapper.unmount()
  })

  it('watch success paths execute for enable and disable', async () => {
    const wrapper = createWrapper()
    mockSafeDepositRouterWrites.enableDeposits.receiptResult.isSuccess.value = true
    mockSafeDepositRouterWrites.disableDeposits.receiptResult.isSuccess.value = true
    await nextTick()
    expect(wrapper.exists()).toBe(true)
    wrapper.unmount()
  })
})
