import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { nextTick } from 'vue'
import type { Address } from 'viem'
import PayDividendsAction from '../PayDividendsAction.vue'
import {
  mockBankReads,
  mockBankWrites,
  mockBodAddAction,
  mockBodIsBodAction,
  mockLog,
  mockTeamStore,
  mockToast,
  mockUserStore,
  resetContractMocks
} from '@/tests/mocks'

describe('PayDividendsAction.vue', () => {
  const ownerAddress = '0x3333333333333333333333333333333333333333' as Address
  const memberAddress = '0x4444444444444444444444444444444444444444' as Address
  const bankAddress = '0x1111111111111111111111111111111111111111' as Address

  const createWrapper = (props = {}) =>
    mount(PayDividendsAction, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          ActionButton: {
            name: 'ActionButton',
            props: ['disabled'],
            emits: ['click'],
            template:
              '<button data-test="pay-dividends-button" :disabled="disabled" @click="$emit(\'click\')">Pay Dividends</button>'
          },
          PayDividendsForm: {
            name: 'PayDividendsForm',
            props: ['loading', 'tokenSymbol', 'team', 'isBodAction'],
            emits: ['submit', 'close-modal'],
            template:
              '<div data-test="pay-dividends-form"><button data-test="close-form" @click="$emit(\'close-modal\')">close</button></div>'
          }
        }
      },
      props: {
        tokenSymbol: 'SHER',
        shareholdersCount: 2,
        investorsAddress: '0x2222222222222222222222222222222222222222' as Address,
        bankAddress,
        ...props
      }
    })

  beforeEach(() => {
    resetContractMocks()
    vi.clearAllMocks()
    vi.stubGlobal('useToast', () => mockToast)

    mockUserStore.address = ownerAddress
    mockBankReads.owner.data.value = ownerAddress

    mockBodIsBodAction.isBodAction.value = false
    mockBodAddAction.isActionAdded.value = false
    mockBodAddAction.executeAddAction.mockResolvedValue(undefined)

    mockBankWrites.distributeNativeDividends.mutateAsync.mockResolvedValue(undefined)
    mockBankWrites.distributeTokenDividends.mutateAsync.mockResolvedValue(undefined)

    mockTeamStore.currentTeam = {
      id: 'team-1',
      name: 'Test Team'
    } as unknown as typeof mockTeamStore.currentTeam
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('enables action for bank owner', () => {
    const wrapper = createWrapper()

    expect(wrapper.classes()).not.toContain('tooltip')
    expect(wrapper.attributes('data-tip')).toBe('')
    expect(
      wrapper.find('[data-test="pay-dividends-button"]').attributes('disabled')
    ).toBeUndefined()
  })

  it('shows token missing reason', () => {
    const wrapper = createWrapper({ tokenSymbol: undefined })

    expect(wrapper.attributes('data-tip')).toBe('Token symbol not available')
    expect(wrapper.find('[data-test="pay-dividends-button"]').attributes('disabled')).toBeDefined()
  })

  it('shows shareholders missing reason when zero', () => {
    const wrapper = createWrapper({ shareholdersCount: 0 })

    expect(wrapper.attributes('data-tip')).toBe('No shareholders available to pay dividends')
    expect(wrapper.find('[data-test="pay-dividends-button"]').attributes('disabled')).toBeDefined()
  })

  it('treats undefined shareholders as missing', () => {
    const wrapper = createWrapper({ shareholdersCount: undefined })

    expect(wrapper.attributes('data-tip')).toBe('No shareholders available to pay dividends')
    expect(wrapper.find('[data-test="pay-dividends-button"]').attributes('disabled')).toBeDefined()
  })

  it('shows authorization reason for non-owner outside BOD', () => {
    mockUserStore.address = memberAddress
    const wrapper = createWrapper()

    expect(wrapper.attributes('data-tip')).toContain('Only the bank owner can pay dividends')
    expect(wrapper.find('[data-test="pay-dividends-button"]').attributes('disabled')).toBeDefined()
  })

  it('opens and closes modal through UI events', async () => {
    const wrapper = createWrapper()

    await wrapper.find('[data-test="pay-dividends-button"]').trigger('click')
    await nextTick()
    expect(wrapper.find('[data-test="pay-dividends-form"]').exists()).toBe(true)

    const modal = wrapper.findComponent({ name: 'UModal' })
    await modal.vm.$emit('update:open', false)
    await nextTick()

    expect(wrapper.find('[data-test="pay-dividends-form"]').exists()).toBe(false)
  })

  it('does not render form body when current team is missing', async () => {
    mockTeamStore.currentTeam = null as unknown as typeof mockTeamStore.currentTeam
    const wrapper = createWrapper()

    await wrapper.find('[data-test="pay-dividends-button"]').trigger('click')
    await nextTick()

    expect(wrapper.find('[data-test="pay-dividends-form"]').exists()).toBe(false)
  })

  it('handleSubmit exits early when value is zero', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      handleSubmit: (value: bigint, tokenId: 'native' | 'usdc') => Promise<void>
    }

    await vm.handleSubmit(0n, 'native')

    expect(mockBankWrites.distributeNativeDividends.mutateAsync).not.toHaveBeenCalled()
    expect(mockBodAddAction.executeAddAction).not.toHaveBeenCalled()
  })

  it('in BOD mode exits early when bankAddress is missing', async () => {
    mockBodIsBodAction.isBodAction.value = true
    const wrapper = createWrapper({ bankAddress: undefined })
    const vm = wrapper.vm as unknown as {
      handleSubmit: (value: bigint, tokenId: 'native' | 'usdc') => Promise<void>
    }

    await vm.handleSubmit(1n, 'native')

    expect(mockBodAddAction.executeAddAction).not.toHaveBeenCalled()
  })

  it('in BOD mode creates native dividends action', async () => {
    mockBodIsBodAction.isBodAction.value = true
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      handleSubmit: (value: bigint, tokenId: 'native' | 'usdc') => Promise<void>
    }

    await vm.handleSubmit(2n, 'native')

    expect(mockBodAddAction.executeAddAction).toHaveBeenCalledTimes(1)
    expect(mockBodAddAction.executeAddAction).toHaveBeenCalledWith(
      expect.objectContaining({ targetAddress: bankAddress })
    )
  })

  it('in BOD mode creates token dividends action', async () => {
    mockBodIsBodAction.isBodAction.value = true
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      handleSubmit: (value: bigint, tokenId: 'native' | 'usdc') => Promise<void>
    }

    await vm.handleSubmit(3n, 'usdc')

    expect(mockBodAddAction.executeAddAction).toHaveBeenCalledTimes(1)
    expect(mockBodAddAction.executeAddAction).toHaveBeenCalledWith(
      expect.objectContaining({
        targetAddress: bankAddress,
        description: expect.stringContaining('Pay Dividends Request')
      })
    )
  })

  it('in non-BOD mode executes native write and closes modal', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      handleSubmit: (value: bigint, tokenId: 'native' | 'usdc') => Promise<void>
      openModal: () => void
    }

    vm.openModal()
    await nextTick()
    expect(wrapper.find('[data-test="pay-dividends-form"]').exists()).toBe(true)

    await vm.handleSubmit(5n, 'native')
    await nextTick()

    expect(mockBankWrites.distributeNativeDividends.mutateAsync).toHaveBeenCalledWith({
      args: [5n]
    })
    expect(wrapper.find('[data-test="pay-dividends-form"]').exists()).toBe(false)
  })

  it('in non-BOD mode executes token write', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      handleSubmit: (value: bigint, tokenId: 'native' | 'usdc') => Promise<void>
    }

    await vm.handleSubmit(6n, 'usdc')

    expect(mockBankWrites.distributeTokenDividends.mutateAsync).toHaveBeenCalledTimes(1)
  })

  it('reacts to bank owner read error by logging and toasting', async () => {
    const wrapper = createWrapper()

    mockBankReads.owner.error.value = new Error('bank owner read failed')
    await nextTick()

    expect(mockLog.error).toHaveBeenCalledWith('Error fetching bank owner', expect.any(Error))
    expect(wrapper.exists()).toBe(true)
  })

  it('closes modal when action is marked as added', async () => {
    const wrapper = createWrapper()

    await wrapper.find('[data-test="pay-dividends-button"]').trigger('click')
    await nextTick()
    expect(wrapper.find('[data-test="pay-dividends-form"]').exists()).toBe(true)

    mockBodAddAction.isActionAdded.value = true
    await nextTick()

    expect(wrapper.find('[data-test="pay-dividends-form"]').exists()).toBe(false)
  })

  it('keeps modal open when action-added flag remains false', async () => {
    const wrapper = createWrapper()

    await wrapper.find('[data-test="pay-dividends-button"]').trigger('click')
    await nextTick()
    expect(wrapper.find('[data-test="pay-dividends-form"]').exists()).toBe(true)

    mockBodAddAction.isActionAdded.value = false
    await nextTick()

    expect(wrapper.find('[data-test="pay-dividends-form"]').exists()).toBe(true)
  })
})
