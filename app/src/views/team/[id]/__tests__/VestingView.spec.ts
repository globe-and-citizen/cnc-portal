import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import VestingView from '../VestingView.vue'
import { ref } from 'vue'
import {
  useWriteContractFn,
  useWaitForTransactionReceiptFn,
  useReadContractFn,
  mockTeamStore,
  mockUserStore
} from '@/tests/mocks'
import { useTeamStore, useUserDataStore } from '@/stores'

// Constants
const memberAddress = '0x000000000000000000000000000000000000dead'
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
      type: 'InvestorV1',
      address: '0x000000000000000000000000000000000000beef'
    }
  ]
})

// Wagmi mocks - local refs for per-test state
const mockWriteContract = {
  mutate: vi.fn(),
  mutateAsync: vi.fn(),
  error: ref<Error | null>(null),
  isPending: ref(false),
  data: ref(null),
  isError: ref(false),
  status: ref('idle' as const),
  variables: ref(undefined),
  reset: vi.fn()
}
const mockWaitReceipt = {
  isLoading: ref(false),
  isSuccess: ref(false),
  error: ref<Error | null>(null),
  isPending: ref(false),
  isError: ref(false),
  data: ref(null),
  status: ref('idle' as const)
}

// Test suite
describe('VestingView.vue', () => {
  let wrapper: VueWrapper

  const mountComponent = () => {
    return mount(VestingView, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Configure wagmi composable mocks
    useWriteContractFn.mockReturnValue(mockWriteContract)
    useWaitForTransactionReceiptFn.mockReturnValue(mockWaitReceipt)
    useReadContractFn.mockImplementation(({ functionName }: { functionName: string }) => {
      if (functionName === 'getTeamVestingsWithMembers') {
        return { data: mockVestingInfos, error: ref(null), refetch: refetchVestingInfos }
      }
      if (functionName === 'getTeamAllArchivedVestingsFlat') {
        return { data: mockArchivedInfos, error: ref(null), refetch: vi.fn() }
      }
      return { data: ref('TST'), error: ref(null), refetch: vi.fn() }
    })
    // Configure store mocks
    vi.mocked(useUserDataStore).mockReturnValue({ ...mockUserStore, address: memberAddress })
    vi.mocked(useTeamStore).mockReturnValue({
      ...mockTeamStore,
      currentTeam: mockCurrentTeam.value as ReturnType<typeof useTeamStore>['currentTeam'],
      currentTeamId: mockCurrentTeam.value.id,
      getContractAddressByType: vi.fn((type) =>
        type ? '0x000000000000000000000000000000000000beef' : undefined
      )
    } as ReturnType<typeof useTeamStore>)
    wrapper = mountComponent()
    mockWriteContract.mutate.mockReset()
    mockWaitReceipt.isLoading.value = false
    mockWaitReceipt.isSuccess.value = false
  })

  it('passes correct props to CreateVesting', async () => {
    const btn = wrapper.find('[data-test="createAddVesting"]')
    await btn.trigger('click')

    const component = wrapper.findComponent({ name: 'CreateVesting' })
    expect(component.props('tokenAddress')).toBe('0x000000000000000000000000000000000000beef')
  })
})
