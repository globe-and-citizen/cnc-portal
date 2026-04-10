import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { nextTick } from 'vue'
import type { Address } from 'viem'
import PayDividendsAction from '../PayDividendsAction.vue'
import { mockBodAddAction, mockBodIsBodAction, mockTeamStore, mockUserStore } from '@/tests/mocks'

describe.skip('PayDividendsAction.vue', () => {
  const ownerAddress = '0x3333333333333333333333333333333333333333' as Address

  const createWrapper = (props = {}) =>
    mount(PayDividendsAction, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          ActionButton: {
            props: ['disabled'],
            emits: ['click'],
            template:
              '<button data-test="pay-dividends-button" :disabled="disabled" @click="$emit(\'click\')">Pay Dividends</button>'
          },
          PayDividendsForm: {
            props: ['loading', 'tokenSymbol', 'team', 'isBodAction'],
            emits: ['submit', 'close-modal'],
            template: '<div data-test="pay-dividends-form" @click="$emit(\'close-modal\')" />'
          }
        }
      },
      props: {
        tokenSymbol: 'SHER',
        shareholdersCount: 2,
        investorsAddress: '0x2222222222222222222222222222222222222222' as Address,
        investorsOwner: ownerAddress,
        bankAddress: '0x1111111111111111111111111111111111111111' as Address,
        ...props
      }
    })

  beforeEach(() => {
    vi.clearAllMocks()
    mockUserStore.address = ownerAddress
    mockBodIsBodAction.isBodAction.value = false
    mockBodAddAction.isActionAdded.value = false
    mockBodAddAction.executeAddAction.mockResolvedValue(undefined)
    mockBankWrites.distributeNativeDividends.mutateAsync.mockResolvedValue(true)
    mockBankWrites.distributeTokenDividends.mutateAsync.mockResolvedValue(true)
    mockTeamStore.currentTeam = {
      id: 'team-1',
      name: 'Test Team'
    } as unknown as typeof mockTeamStore.currentTeam
  })

  it('enables action for owner', () => {
    const wrapper = createWrapper()

    expect(
      wrapper.find('[data-test="pay-dividends-button"]').attributes('disabled')
    ).toBeUndefined()
    expect(wrapper.attributes('data-tip')).toBe('')
  })

  it('shows missing token tooltip and disables action', () => {
    const wrapper = createWrapper({ tokenSymbol: undefined })

    expect(wrapper.attributes('data-tip')).toBe('Token symbol not available')
    expect(wrapper.find('[data-test="pay-dividends-button"]').attributes('disabled')).toBeDefined()
  })

  it('shows missing shareholders tooltip and disables action', () => {
    const wrapper = createWrapper({ shareholdersCount: 0 })

    expect(wrapper.attributes('data-tip')).toBe('No shareholders available to pay dividends')
    expect(wrapper.find('[data-test="pay-dividends-button"]').attributes('disabled')).toBeDefined()
  })

  it('treats undefined shareholdersCount as missing shareholders', () => {
    const wrapper = createWrapper({ shareholdersCount: undefined })

    expect(wrapper.attributes('data-tip')).toBe('No shareholders available to pay dividends')
    expect(wrapper.find('[data-test="pay-dividends-button"]').attributes('disabled')).toBeDefined()
  })

  it('shows authorization tooltip for non-owner when not a BOD action', () => {
    mockUserStore.address = '0x4444444444444444444444444444444444444444'
    const wrapper = createWrapper()

    expect(wrapper.attributes('data-tip')).toBe('Only the bank owner can pay dividends')
    expect(wrapper.find('[data-test="pay-dividends-button"]').attributes('disabled')).toBeDefined()
  })

  it('enables action when it is a BOD action', () => {
    mockUserStore.address = '0x4444444444444444444444444444444444444444'
    mockBodIsBodAction.isBodAction.value = true

    const wrapper = createWrapper()

    expect(
      wrapper.find('[data-test="pay-dividends-button"]').attributes('disabled')
    ).toBeUndefined()
    expect(wrapper.attributes('data-tip')).toBe('')
  })

  it('open and close modal through button and update:open', async () => {
    const wrapper = createWrapper()

    await wrapper.find('[data-test="pay-dividends-button"]').trigger('click')
    await nextTick()
    expect(wrapper.find('[data-test="pay-dividends-form"]').exists()).toBe(true)

    const modal = wrapper.findComponent({ name: 'UModal' })
    await modal.vm.$emit('update:open', false)
    await nextTick()
    expect(wrapper.find('[data-test="pay-dividends-form"]').exists()).toBe(false)
  })

  it('close-modal emitted by PayDividendsForm closes modal', async () => {
    const wrapper = createWrapper()

    await wrapper.find('[data-test="pay-dividends-button"]').trigger('click')
    await nextTick()
    expect(wrapper.find('[data-test="pay-dividends-form"]').exists()).toBe(true)

    await wrapper.find('[data-test="pay-dividends-form"]').trigger('click')
    await nextTick()

    expect(wrapper.find('[data-test="pay-dividends-form"]').exists()).toBe(false)
  })

  it('handleSubmit returns early when value <= 0', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      handleSubmit: (value: bigint, tokenId: string) => Promise<void>
    }

    await vm.handleSubmit(0n, 'native')

    expect(mockBankWrites.distributeNativeDividends.mutateAsync).not.toHaveBeenCalled()
    expect(mockBodAddAction.executeAddAction).not.toHaveBeenCalled()
  })

  it('handleSubmit in BOD mode with no bankAddress returns early', async () => {
    mockBodIsBodAction.isBodAction.value = true
    const wrapper = createWrapper({ bankAddress: undefined })
    const vm = wrapper.vm as unknown as {
      handleSubmit: (value: bigint, tokenId: string) => Promise<void>
    }

    await vm.handleSubmit(1n, 'native')

    expect(mockBodAddAction.executeAddAction).not.toHaveBeenCalled()
  })

  it('handleSubmit in BOD mode adds action for native token', async () => {
    mockBodIsBodAction.isBodAction.value = true
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      handleSubmit: (value: bigint, tokenId: string) => Promise<void>
    }

    await vm.handleSubmit(2n, 'native')

    expect(mockBodAddAction.executeAddAction).toHaveBeenCalledTimes(1)
  })

  it('handleSubmit in BOD mode adds action for token dividends', async () => {
    mockBodIsBodAction.isBodAction.value = true
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      handleSubmit: (value: bigint, tokenId: string) => Promise<void>
    }

    await vm.handleSubmit(3n, 'usdc')

    expect(mockBodAddAction.executeAddAction).toHaveBeenCalledTimes(1)
  })

  it('handleSubmit executes native write in non-BOD mode', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      handleSubmit: (value: bigint, tokenId: string) => Promise<void>
    }

    await wrapper.find('[data-test="pay-dividends-button"]').trigger('click')
    await nextTick()

    await vm.handleSubmit(5n, 'native')

    expect(mockBankWrites.distributeNativeDividends.mutateAsync).toHaveBeenCalledWith({
      args: [5n]
    })
  })

  it('handleSubmit executes token write in non-BOD mode', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      handleSubmit: (value: bigint, tokenId: string) => Promise<void>
    }

    await vm.handleSubmit(6n, 'usdc')

    expect(mockBankWrites.distributeTokenDividends.mutateAsync).toHaveBeenCalled()
  })

  it('handleSubmit returns early when native write fails', async () => {
    mockBankWrites.distributeNativeDividends.mutateAsync.mockResolvedValue(undefined)
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      handleSubmit: (value: bigint, tokenId: string) => Promise<void>
    }

    await vm.handleSubmit(7n, 'native')

    expect(mockBankWrites.distributeNativeDividends.mutateAsync).toHaveBeenCalledWith({
      args: [7n]
    })
  })

  it('handleSubmit returns early when token write fails', async () => {
    mockBankWrites.distributeTokenDividends.mutateAsync.mockResolvedValue(undefined)
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      handleSubmit: (value: bigint, tokenId: string) => Promise<void>
    }

    await vm.handleSubmit(8n, 'usdc')

    expect(mockBankWrites.distributeTokenDividends.mutateAsync).toHaveBeenCalled()
  })

  it('watch isActionAdded closes modal', async () => {
    const wrapper = createWrapper()

    await wrapper.find('[data-test="pay-dividends-button"]').trigger('click')
    await nextTick()

    mockBodAddAction.isActionAdded.value = true
    await nextTick()

    expect(wrapper.find('[data-test="pay-dividends-form"]').exists()).toBe(false)
  })

  it('watch isActionAdded=false does not close modal', async () => {
    const wrapper = createWrapper()

    await wrapper.find('[data-test="pay-dividends-button"]').trigger('click')
    await nextTick()

    mockBodAddAction.isActionAdded.value = false
    await nextTick()

    expect(wrapper.find('[data-test="pay-dividends-form"]').exists()).toBe(true)
  })
})
