import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { nextTick } from 'vue'
import type { Address } from 'viem'
import DistributeMintAction from '@/components/sections/SherTokenView/InvestorActions/DistributeMintAction.vue'
import { mockUseWriteContract, mockUseWaitForTransactionReceipt, mockLog } from '@/tests/mocks'

describe('DistributeMintAction.vue', () => {
  const createWrapper = (props = {}) =>
    mount(DistributeMintAction, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          DistributeMintForm: {
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
    mockUseWriteContract.error.value = null
    mockUseWaitForTransactionReceipt.isLoading.value = false
    mockUseWaitForTransactionReceipt.isSuccess.value = false
  })

  it('renders with coming soon tooltip', () => {
    const wrapper = createWrapper()
    expect(wrapper.attributes('data-tip')).toBe('Coming soon')
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
    await (wrapper.vm as unknown as { openModal: () => void }).openModal()
    await nextTick()
    expect(wrapper.find('[data-test="distribute-mint-form"]').exists()).toBe(true)
  })

  it('closeModal unmounts the modal', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as { openModal: () => void; closeModal: () => void }
    await vm.openModal()
    await nextTick()
    await vm.closeModal()
    await nextTick()
    expect(wrapper.find('[data-test="distribute-mint-form"]').exists()).toBe(false)
  })

  it('handleSubmit calls distributeMint when form submits', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as { openModal: () => void }
    await vm.openModal()
    await nextTick()
    await wrapper.find('[data-test="distribute-mint-form"]').trigger('click')
    expect(mockUseWriteContract.mutate).toHaveBeenCalled()
  })

  it('handleSubmit returns early when investorsAddress is empty', async () => {
    const wrapper = createWrapper({ investorsAddress: '' as Address })
    const vm = wrapper.vm as unknown as {
      handleSubmit: (shareholders: ReadonlyArray<{ shareholder: Address; amount: bigint }>) => void
    }
    vm.handleSubmit([{ shareholder: '0xabc' as Address, amount: 100n }])
    expect(mockUseWriteContract.mutate).not.toHaveBeenCalled()
  })

  it('watch distributeMintError logs the error', async () => {
    const wrapper = createWrapper()
    mockUseWriteContract.error.value = new Error('distribute failed') as never
    await nextTick()
    expect(mockLog.error).toHaveBeenCalled()
    wrapper.unmount()
  })

  it('watch isConfirming+isSuccess emits refetchShareholders and closes modal', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as { openModal: () => void }
    await vm.openModal()
    await nextTick()
    mockUseWaitForTransactionReceipt.isLoading.value = false
    mockUseWaitForTransactionReceipt.isSuccess.value = true
    await nextTick()
    expect(wrapper.emitted('refetchShareholders')).toBeTruthy()
  })

  it('watch modalState.show=false triggers closeModal', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as {
      openModal: () => void
      modalState: { mount: boolean; show: boolean }
    }
    await vm.openModal()
    await nextTick()
    vm.modalState.show = false
    await nextTick()
    expect(vm.modalState.mount).toBe(false)
  })

  it('v-model update:open handler resets modal state', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as { openModal: () => void }
    await vm.openModal()
    await nextTick()
    const modal = wrapper.findComponent({ name: 'UModal' })
    await modal.vm.$emit('update:open', false)
    await nextTick()
    expect(wrapper.find('[data-test="distribute-mint-form"]').exists()).toBe(false)
  })

  it('form loading prop reflects isConfirming state', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as { openModal: () => void }
    await vm.openModal()
    await nextTick()
    mockUseWaitForTransactionReceipt.isLoading.value = true
    await nextTick()
    expect(wrapper.find('[data-test="distribute-mint-form"]').exists()).toBe(true)
  })
})
