import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import VestingStats from '@/components/sections/VestingView/VestingStats.vue'

//import { useToastStore } from '@/stores/__mocks__/useToastStore'

import { ref } from 'vue'

// Constants
const memberAddress = '0x000000000000000000000000000000000000dead'
const mockSymbol = ref<string>('shr')
const mockReloadKey = ref<number>(0)
// Mocks
const mockVestingInfos = ref<[string[], { totalAmount: number; released: number }[]]>([
  [memberAddress],
  [
    {
      totalAmount: 0,
      released: 0
    }
  ]
])

const refetchVestingInfos = vi.fn()

const mockArchivedInfos = ref([[], []])

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
      if (functionName === 'symbol') {
        return {
          data: mockSymbol,
          error: ref(null),
          refetch: vi.fn()
        }
      }
      return {
        data: ref('TST'),
        error: ref(null),
        refetch: vi.fn()
      }
    })
  }
})

// Test suite
describe('VestingStats.vue', () => {
  let wrapper: VueWrapper

  const mountComponent = () => {
    return mount(VestingStats, {
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

  it.skip('renders vesting stats component', () => {
    expect(wrapper.find('[data-test="vesting-stats"]').exists()).toBe(true)
  })

  it('calculates token summary correctly from vestings data', async () => {
    // Setup mock data with multiple vestings
    mockVestingInfos.value = [
      [memberAddress],
      [
        {
          totalAmount: Number(BigInt(100000000)), // 100 tokens with 6 decimals
          released: Number(BigInt(20000000)) // 20 tokens with 6 decimals
        },
        {
          totalAmount: Number(BigInt(50000000)), // 50 tokens with 6 decimals
          released: Number(BigInt(10000000)) // 10 tokens with 6 decimals
        }
      ]
    ]

    wrapper = mountComponent()
    await wrapper.vm.$nextTick()

    const summaryRows = (wrapper.vm as (typeof VestingStats)['prototype']).tokenSummaryRows
    expect(summaryRows).toHaveLength(1) // Should have one row per token symbol
    expect(summaryRows[0]).toMatchObject({
      symbol: mockSymbol.value,
      totalVested: 150,
      totalReleased: 30
    })
  })

  it('handles empty vestings array', () => {
    mockVestingInfos.value = [[], []]
    wrapper = mountComponent()

    const summaryRows = (wrapper.vm as (typeof VestingStats)['prototype']).tokenSummaryRows
    expect(summaryRows).toHaveLength(1)
  })

  it('displays formatted token amounts with symbols', async () => {
    mockSymbol.value = 'TEST'
    mockVestingInfos.value = [
      [memberAddress],
      [
        {
          totalAmount: Number(BigInt(100000000)),
          released: Number(BigInt(20000000))
        }
      ]
    ]

    wrapper = mountComponent()
    await wrapper.vm.$nextTick()

    const totalVestedText = wrapper.text()
    expect(totalVestedText).toContain('100')
    expect(totalVestedText).toContain('TEST')

    const totalReleasedText = wrapper.text()
    expect(totalReleasedText).toContain('20')
    expect(totalReleasedText).toContain('TEST')
  })
})
