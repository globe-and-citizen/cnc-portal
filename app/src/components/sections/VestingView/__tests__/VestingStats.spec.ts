import { describe, it, expect, vi, beforeEach } from 'vitest'
import { type VueWrapper } from '@vue/test-utils'
import { renderWithProviders } from '@/tests/mocks'

// Auto-imported @nuxt/ui components bypass `config.global.stubs` because the
// Nuxt UI Vite plugin resolves them through their file path. Mock the module
// so our stub renders and we can inspect props instead of reaching into vm.
vi.mock('@nuxt/ui/components/Table.vue', () => ({
  default: {
    name: 'UTable',
    props: ['data', 'columns', 'sticky', 'showPagination'],
    template: `
      <div data-test="vesting-stats-table">
        <div v-for="(row, i) in data" :key="i" data-test="vesting-stats-row">
          <slot name="totalPromised-cell" :row="{ original: row }" />
          <slot name="totalReleased-cell" :row="{ original: row }" />
        </div>
      </div>
    `
  }
}))

import VestingStats from '@/components/sections/VestingView/VestingStats.vue'

import { ref } from 'vue'

// Constants
const memberAddress = '0x000000000000000000000000000000000000dead'
const mockSymbol = ref<string>('shr')
const mockReloadKey = ref<number>(0)
// Mocks — reads return a 3-tuple [members, indices, infos]; a member appears
// once per schedule.
const mockVestingInfos = ref<[string[], bigint[], { totalAmount: number; released: number }[]]>([
  [memberAddress],
  [0n],
  [
    {
      totalAmount: 0,
      released: 0
    }
  ]
])

const refetchVestingInfos = vi.fn()

const mockArchivedInfos = ref([[], [], []])

vi.mock('@/composables/investor/reads', () => ({
  useInvestorSymbol: vi.fn(() => ({
    data: mockSymbol,
    error: ref(null),
    refetch: vi.fn()
  }))
}))

vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useReadContract: vi.fn(({ functionName }: { functionName: string }) => {
      if (functionName === 'getVestingsWithMembers') {
        return {
          data: mockVestingInfos,
          error: ref(null),
          refetch: refetchVestingInfos
        }
      }
      if (functionName === 'getAllArchivedVestingsFlat') {
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
    return renderWithProviders(VestingStats, {
      props: {
        reloadKey: mockReloadKey.value
      }
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    wrapper = mountComponent()
  })

  it('calculates token summary correctly from vestings data', async () => {
    // Setup mock data with two schedules for the same member (one per index).
    mockVestingInfos.value = [
      [memberAddress, memberAddress],
      [0n, 1n],
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

    const tableData = wrapper.findComponent({ name: 'UTable' }).props('data') as Array<{
      symbol: string
      totalPromised: number
      totalReleased: number
    }>
    expect(tableData).toHaveLength(1) // Should have one row per token symbol
    expect(tableData[0]).toMatchObject({
      symbol: mockSymbol.value,
      totalPromised: 150,
      totalReleased: 30
    })
  })

  it('handles empty vestings array', () => {
    mockVestingInfos.value = [[], [], []]
    wrapper = mountComponent()

    const tableData = wrapper.findComponent({ name: 'UTable' }).props('data') as Array<unknown>
    expect(tableData).toHaveLength(1)
  })

  it('displays formatted token amounts with symbols', async () => {
    mockSymbol.value = 'TEST'
    mockVestingInfos.value = [
      [memberAddress],
      [0n],
      [
        {
          totalAmount: Number(BigInt(100000000)),
          released: Number(BigInt(20000000))
        }
      ]
    ]

    wrapper = mountComponent()
    await wrapper.vm.$nextTick()

    const totalPromisedText = wrapper.text()
    expect(totalPromisedText).toContain('100')
    expect(totalPromisedText).toContain('TEST')

    const totalReleasedText = wrapper.text()
    expect(totalReleasedText).toContain('20')
    expect(totalReleasedText).toContain('TEST')
  })
})
