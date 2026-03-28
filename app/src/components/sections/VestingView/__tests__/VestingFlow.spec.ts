import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import VestingFlow from '@/components/sections/VestingView/VestingFlow.vue'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import { VESTING_ADDRESS } from '@/constant'
//import VestingStatusFilter from '@/components/sections/VestingView/VestingStatusFilter.vue'
import VestingActions from '@/components/sections/VestingView/VestingActions.vue'
// Mock Constants
const memberAddress = '0x000000000000000000000000000000000000dead'
const mockReloadKey = ref(0)

// Mock Contract Write
const mockWriteContract = {
  mutate: vi.fn(),
  error: ref<null | Error>(null),
  isPending: ref(false),
  data: ref(null)
}

// Mock Transaction Receipt
const mockWaitForReceipt = {
  isLoading: ref(false),
  isSuccess: ref(false)
}

describe('VestingFlow.vue', () => {
  let wrapper: VueWrapper

  const mountComponent = () =>
    mount(VestingFlow, {
      props: {
        reloadKey: mockReloadKey.value
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })

  beforeEach(() => {
    vi.clearAllMocks()
    wrapper = mountComponent()
  })

  describe('Rendering', () => {
    it('displays vesting table with correct columns', () => {
      const table = wrapper.find('[data-test="vesting-overview"]')
      expect(table.exists()).toBe(true)
    })
  })

  describe('Vesting Actions', () => {
    it.skip('handles stop vesting action', async () => {
      const stopBtn = wrapper.find('[data-test="stop-btn"]')
      await stopBtn.trigger('click')

      expect(mockWriteContract.mutate).toHaveBeenCalledWith({
        address: VESTING_ADDRESS,
        abi: expect.any(Array),
        functionName: 'stopVesting',
        args: [memberAddress, 1]
      })
    })

    // it('handles release vesting action', async () => {
    //   const releaseBtn = wrapper.find('[data-test="release-btn"]')
    //   await releaseBtn.trigger('click')

    //   expect(mockWriteContract.mutate).toHaveBeenCalledWith({
    //     address: VESTING_ADDRESS,
    //     abi: expect.any(Array),
    //     functionName: 'release',
    //     args: [1]
    //   })
    // })

    it('emits reload event when actions complete', async () => {
      const actions = wrapper.findComponent(VestingActions)
      await actions.vm.$emit('reload')
      expect(wrapper.emitted('reload')).toBeTruthy()
    })
  })

  describe.skip('Data Updates', () => {
    it('refreshes vesting data after successful actions', async () => {
      const stopBtn = wrapper.find('[data-test="stop-btn"]')
      await stopBtn.trigger('click')

      mockWaitForReceipt.isLoading.value = true
      await wrapper.vm.$nextTick()
      mockWaitForReceipt.isSuccess.value = true
      mockWaitForReceipt.isLoading.value = false
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('reload')).toBeTruthy()
    })
  })
})
