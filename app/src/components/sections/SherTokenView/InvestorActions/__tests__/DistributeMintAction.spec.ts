import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { nextTick } from 'vue'
import type { Address } from 'viem'
import DistributeMintAction from '@/components/sections/SherTokenView/InvestorActions/DistributeMintAction.vue'
import { mockInvestorWrites, resetContractMocks, mockLog } from '@/tests/mocks'

type DistributeOptions = {
  onSuccess?: () => void
  onError?: (e: unknown) => void
}

describe('DistributeMintAction.vue', () => {
  const distribute = mockInvestorWrites.distributeMint

  const createWrapper = (props = {}) =>
    mount(DistributeMintAction, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          DistributeMintForm: {
            name: 'DistributeMintForm',
            props: ['loading', 'tokenSymbol'],
            emits: ['submit'],
            template: "<div data-test='distribute-mint-form' @click=\"\$emit('submit', [])\" />"
          }
        }
      },
      props: {
        tokenSymbol: 'SHER',
        investorsAddress: '0x1234567890123456789012345678901234567890' as Address,
        ...props
      }
    })

  beforeEach(() => {
    vi.clearAllMocks()
    resetContractMocks()
  })

  it('renders with coming soon tooltip', () => {
    const wrapper = createWrapper()
    expect(wrapper.findComponent({ name: 'UTooltip' }).props('text')).toBe('Coming soon')
  })

  it('renders action button as disabled', () => {
    const wrapper = createWrapper()
    const button = wrapper.find('[data-test="distribute-mint-button"]')
    expect(button.exists()).toBe(true)
    expect(button.attributes('disabled')).toBeDefined()
  })

  it('accepts required props', () => {
    const wrapper = createWrapper({ tokenSymbol: 'USDC' })
    expect(wrapper.exists()).toBe(true)
  })

  it('openModal mounts and shows the modal', async () => {
    const wrapper = createWrapper()
    await wrapper.findComponent({ name: 'ActionButton' }).vm.$emit('click')
    await nextTick()
    expect(wrapper.find('[data-test="distribute-mint-form"]').exists()).toBe(true)
  })

  it('closeModal unmounts the modal via UModal update:open', async () => {
    const wrapper = createWrapper()
    await wrapper.findComponent({ name: 'ActionButton' }).vm.$emit('click')
    await nextTick()
    await wrapper.findComponent({ name: 'UModal' }).vm.$emit('update:open', false)
    await nextTick()
    expect(wrapper.find('[data-test="distribute-mint-form"]').exists()).toBe(false)
  })

  it('handleSubmit calls distributeMint when form submits', async () => {
    const wrapper = createWrapper()
    await wrapper.findComponent({ name: 'ActionButton' }).vm.$emit('click')
    await nextTick()
    await wrapper.find('[data-test="distribute-mint-form"]').trigger('click')
    expect(distribute.mutate).toHaveBeenCalled()
  })

  it('handleSubmit returns early when investorsAddress is empty', async () => {
    const wrapper = createWrapper({ investorsAddress: '' as Address })
    await wrapper.findComponent({ name: 'ActionButton' }).vm.$emit('click')
    await nextTick()
    await wrapper
      .findComponent({ name: 'DistributeMintForm' })
      .vm.$emit('submit', [{ shareholder: '0xabc' as Address, amount: 100n }])
    await nextTick()
    expect(distribute.mutate).not.toHaveBeenCalled()
  })

  it('onError callback logs distribute failures', async () => {
    distribute.mutate.mockImplementationOnce((_p: unknown, opts?: DistributeOptions) => {
      opts?.onError?.(new Error('distribute failed'))
    })
    const wrapper = createWrapper()
    await wrapper.findComponent({ name: 'ActionButton' }).vm.$emit('click')
    await nextTick()
    await wrapper.find('[data-test="distribute-mint-form"]').trigger('click')
    expect(mockLog.error).toHaveBeenCalled()
  })

  it('onSuccess callback emits refetchShareholders and closes modal', async () => {
    distribute.mutate.mockImplementationOnce((_p: unknown, opts?: DistributeOptions) => {
      opts?.onSuccess?.()
    })
    const wrapper = createWrapper()
    await wrapper.findComponent({ name: 'ActionButton' }).vm.$emit('click')
    await nextTick()
    await wrapper.find('[data-test="distribute-mint-form"]').trigger('click')
    await nextTick()
    expect(wrapper.emitted('refetchShareholders')).toBeTruthy()
    expect(wrapper.find('[data-test="distribute-mint-form"]').exists()).toBe(false)
  })

  it('watch modalState.show=false triggers closeModal via UModal update:open', async () => {
    const wrapper = createWrapper()
    await wrapper.findComponent({ name: 'ActionButton' }).vm.$emit('click')
    await nextTick()
    expect(wrapper.find('[data-test="distribute-mint-form"]').exists()).toBe(true)
    await wrapper.findComponent({ name: 'UModal' }).vm.$emit('update:open', false)
    await nextTick()
    expect(wrapper.find('[data-test="distribute-mint-form"]').exists()).toBe(false)
  })

  it('v-model update:open handler resets modal state', async () => {
    const wrapper = createWrapper()
    await wrapper.findComponent({ name: 'ActionButton' }).vm.$emit('click')
    await nextTick()
    const modal = wrapper.findComponent({ name: 'UModal' })
    await modal.vm.$emit('update:open', false)
    await nextTick()
    expect(wrapper.find('[data-test="distribute-mint-form"]').exists()).toBe(false)
  })

  it('form loading prop reflects mutation isPending state', async () => {
    distribute.isPending.value = true
    const wrapper = createWrapper()
    await wrapper.findComponent({ name: 'ActionButton' }).vm.$emit('click')
    await nextTick()
    expect(wrapper.findComponent({ name: 'DistributeMintForm' }).props('loading')).toBe(true)
  })
})
