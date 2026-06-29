import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import VestingView from '../VestingView.vue'
import { ref } from 'vue'
import { useReadContractFn, mockTeamStore, mockUserStore } from '@/tests/mocks'

// Constants
const memberAddress = '0x000000000000000000000000000000000000dead'
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

// Test suite
describe('VestingView.vue', () => {
  let wrapper: VueWrapper

  const mountComponent = () => mount(VestingView)

  beforeEach(() => {
    vi.clearAllMocks()
    useReadContractFn.mockImplementation(({ functionName }: { functionName: string }) => {
      if (functionName === 'getVestingsWithMembers') {
        return { data: mockVestingInfos, error: ref(null), refetch: refetchVestingInfos }
      }
      if (functionName === 'getAllArchivedVestingsFlat') {
        return { data: mockArchivedInfos, error: ref(null), refetch: vi.fn() }
      }
      return { data: ref('TST'), error: ref(null), refetch: vi.fn() }
    })
    // Configure store mocks via the shared, globally-mocked instances.
    mockUserStore.address = memberAddress
    mockTeamStore.currentTeam = {
      ...mockTeamStore.currentTeam,
      id: 1,
      ownerAddress: memberAddress
    }
    mockTeamStore.currentTeamId = '1'
    mockTeamStore.getContractAddressByType = vi.fn((type) =>
      type ? '0x000000000000000000000000000000000000beef' : undefined
    )
    wrapper = mountComponent()
  })

  it('renders the vesting stats and flow sections', () => {
    expect(wrapper.findComponent({ name: 'VestingStats' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'VestingFlow' }).exists()).toBe(true)
  })

  it('bumps the reload key when VestingFlow emits reload', async () => {
    const flow = wrapper.findComponent({ name: 'VestingFlow' })
    expect(flow.props('reloadKey')).toBe(0)

    flow.vm.$emit('reload')
    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent({ name: 'VestingFlow' }).props('reloadKey')).toBe(1)
    expect(wrapper.findComponent({ name: 'VestingStats' }).props('reloadKey')).toBe(1)
  })
})
