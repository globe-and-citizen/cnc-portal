import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import VestingFlow from '@/components/sections/VestingView/VestingFlow.vue'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import { parseUnits } from 'viem'
import { VESTING_ADDRESS } from '@/constant'
//import VestingStatusFilter from '@/components/sections/VestingView/VestingStatusFilter.vue'
import VestingActions from '@/components/sections/VestingView/VestingActions.vue'
import { mockUseContractBalance } from '@/tests/mocks/composables.mock'
// Mock Constants
const memberAddress = '0x000000000000000000000000000000000000dead'
const mockSymbol = ref('SHR')
const mockReloadKey = ref(0)

// Mock Contract Write
const mockWriteContract = {
  writeContract: vi.fn(),
  error: ref<null | Error>(null),
  isPending: ref(false),
  data: ref(null)
}

// Mock Vesting Data
const mockVestingInfos = ref([
  [memberAddress],
  [
    {
      start: Math.floor(Date.now() / 1000).toString(),
      duration: (30 * 86400).toString(),
      cliff: '0',
      totalAmount: parseUnits('10', 6),
      released: parseUnits('2', 6),
      active: true
    }
  ]
])

const mockArchivedVestingInfos = ref([
  [memberAddress],
  [
    {
      start: Math.floor(Date.now() / 1000 - 86400).toString(),
      duration: (30 * 86400).toString(),
      cliff: '0',
      totalAmount: parseUnits('5', 6),
      released: parseUnits('5', 6),
      active: false
    }
  ]
])

// Mock Transaction Receipt
const mockWaitForReceipt = {
  isLoading: ref(false),
  isSuccess: ref(false)
}

// Setup Mocks
vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import('@wagmi/vue')
  return {
    ...actual,
    useWriteContract: vi.fn(() => mockWriteContract),
    useWaitForTransactionReceipt: vi.fn(() => mockWaitForReceipt),
    useReadContract: vi.fn(({ functionName }) => {
      if (functionName === 'getTeamVestingsWithMembers') {
        return {
          data: mockVestingInfos,
          error: ref(null),
          refetch: vi.fn()
        }
      }
      if (functionName === 'getTeamAllArchivedVestingsFlat') {
        return {
          data: mockArchivedVestingInfos,
          error: ref(null),
          refetch: vi.fn()
        }
      }
      if (functionName === 'symbol') {
        return {
          data: mockSymbol,
          error: ref(null),
          refetch: vi.fn()
        }
      }
      return {
        data: ref(null),
        error: ref(null),
        refetch: vi.fn()
      }
    })
  }
})

vi.mock('@/stores/useToastStore')

vi.mock('@/composables/useContractBalance', () => ({
  useContractBalance: vi.fn(() => mockUseContractBalance)
}))

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

    it('shows loading spinner when loading is true', async () => {
      mockWriteContract.isPending.value = true
      await wrapper.vm.$nextTick()
      const spinner = wrapper.find('.loading-spinner')
      expect(spinner.exists()).toBe(true)
    })
  })

  describe('Vesting Actions', () => {
    it.skip('handles stop vesting action', async () => {
      const stopBtn = wrapper.find('[data-test="stop-btn"]')
      await stopBtn.trigger('click')

      expect(mockWriteContract.writeContract).toHaveBeenCalledWith({
        address: VESTING_ADDRESS,
        abi: expect.any(Array),
        functionName: 'stopVesting',
        args: [memberAddress, 1]
      })
    })

    // it('handles release vesting action', async () => {
    //   const releaseBtn = wrapper.find('[data-test="release-btn"]')
    //   await releaseBtn.trigger('click')

    //   expect(mockWriteContract.writeContract).toHaveBeenCalledWith({
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

  describe('Data Updates', () => {
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
