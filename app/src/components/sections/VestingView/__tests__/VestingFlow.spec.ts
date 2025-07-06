import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import VestingFlow from '@/components/sections/VestingView/VestingFlow.vue'
import VestingABI from '@/artifacts/abi/Vesting.json'
import { ref } from 'vue'
import { VESTING_ADDRESS } from '@/constant'

// Constants
const memberAddress = '0x000000000000000000000000000000000000dead'
const mockSymbol = ref<string>('shr')
const mockReloadKey = ref<number>(0)
// Mocks
const mockVestingInfos = ref([
  [memberAddress],
  [
    {
      start: `${Math.floor(Date.now() / 1000) - 3600}`,
      duration: `${30 * 86400}`,
      cliff: '0',
      totalAmount: BigInt(10e18),
      released: BigInt(2e18),
      active: true
    }
  ]
])

const refetchVestingInfos = vi.fn()
const mockArchivedInfos = ref([[], []])
const mockCurrentTeam = ref({
  id: 1,
  ownerAddress: memberAddress,
  teamContracts: [
    {
      type: 'InvestorsV1',
      address: '0x000000000000000000000000000000000000beef'
    }
  ]
})

vi.mock('@/stores', () => ({
  useUserDataStore: () => ({
    address: memberAddress
  }),
  useTeamStore: () => ({
    currentTeam: mockCurrentTeam.value
  })
}))

// Wagmi mocks
const mockWriteContract = {
  writeContract: vi.fn(),
  error: ref<Error | null>(null),
  isPending: ref(false),
  data: ref(null)
}
const mockWaitReceipt = {
  isLoading: ref(false),
  isSuccess: ref(false)
}
vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useWriteContract: vi.fn(() => mockWriteContract),
    useWaitForTransactionReceipt: vi.fn(() => mockWaitReceipt),
    useReadContract: vi.fn(({ functionName }: { functionName: string }) => {
      if (functionName === 'getTeamVestingsWithMembers') {
        return {
          data: mockVestingInfos,
          error: ref(null),
          refetch: refetchVestingInfos
        }
      }
      if (functionName === 'getTeamAllArchivedVestingsFlat') {
        return {
          data: mockArchivedInfos,
          error: ref(null),
          refetch: vi.fn()
        }
      }
      return {
        data: mockSymbol,
        error: ref(null),
        refetch: vi.fn()
      }
    })
  }
})

// Test suite
describe('VestingFlow.vue', () => {
  let wrapper: VueWrapper

  const mountComponent = () => {
    return mount(VestingFlow, {
      props: {
        reloadKey: mockReloadKey.value
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    wrapper = mountComponent()
    mockWriteContract.writeContract.mockReset()
    mockWaitReceipt.isLoading.value = false
    mockWaitReceipt.isSuccess.value = false
  })

  it('renders Stop and Release buttons with conditions', async () => {
    wrapper = mountComponent()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="stop-btn"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="release-btn"]').exists()).toBe(true)
  })

  it('calls releaseVesting with correct parameters when clicked', async () => {
    // Setup mock data with isStarted set to true
    mockVestingInfos.value = [
      [memberAddress],
      [
        {
          start: `${Math.floor(Date.now() / 1000) - 24 * 3600}`,
          duration: `${30 * 86400}`,
          cliff: '0',
          totalAmount: BigInt(100e18),
          released: BigInt(0),
          active: true
        }
      ]
    ]

    wrapper = mountComponent()
    await wrapper.vm.$nextTick()

    // Verify button is not disabled
    const releaseBtn = wrapper.find('[data-test="release-btn"]')
    expect(releaseBtn.exists()).toBe(true)
    expect(releaseBtn.attributes('disabled')).toBeUndefined()

    // Click the button
    await releaseBtn.trigger('click')
    await wrapper.vm.$nextTick()

    // Verify the contract call
    expect(mockWriteContract.writeContract).toHaveBeenCalledWith({
      address: VESTING_ADDRESS,
      abi: VestingABI,
      functionName: 'release',
      args: [mockCurrentTeam.value.id] // teamId
    })
  })

  it('disables Release button when vesting not started', async () => {
    mockVestingInfos.value = [
      [memberAddress],
      [
        {
          start: `${Math.floor(Date.now() / 1000) + 3600}`, // future timestamp
          duration: `${30 * 86400}`,
          cliff: '0',
          totalAmount: BigInt(100e18),
          released: BigInt(0),
          active: true
        }
      ]
    ]
    wrapper = mountComponent()
    await wrapper.vm.$nextTick()

    const btn = wrapper.find('[data-test="release-btn"]')
    expect(btn.attributes('disabled')).toBeDefined()
  })

  it('calls stopVesting with correct parameters when clicked', async () => {
    mockVestingInfos.value = [
      [memberAddress],
      [
        {
          start: `${Math.floor(Date.now() / 1000)}`,
          duration: `${30 * 86400}`,
          cliff: '0',
          totalAmount: BigInt(10e18),
          released: BigInt(2e18),
          active: true
        }
      ]
    ]
    wrapper = mountComponent()
    await wrapper.vm.$nextTick()
    const stopBtn = wrapper.find('[data-test="stop-btn"]')
    await stopBtn.trigger('click')

    expect(mockWriteContract.writeContract).toHaveBeenCalledWith({
      address: VESTING_ADDRESS, // Replace with actual constant
      abi: VestingABI,
      functionName: 'stopVesting',
      args: [memberAddress, 1]
    })
  })

  it('shows loading state during transaction', async () => {
    await wrapper.vm.$nextTick()
    const stopBtn = wrapper.find('[data-test="stop-btn"]')
    await stopBtn.trigger('click')

    mockWaitReceipt.isLoading.value = true
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.loading-spinner').exists()).toBe(true)
  })
})
