import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'

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
          <slot name="totalVested-cell" :row="{ original: row }" />
          <slot name="totalReleased-cell" :row="{ original: row }" />
          <slot name="totalWithdrawn-cell" :row="{ original: row }" />
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

    const tableData = wrapper.findComponent({ name: 'UTable' }).props('data') as Array<{
      symbol: string
      totalVested: number
      totalReleased: number
    }>
    expect(tableData).toHaveLength(1) // Should have one row per token symbol
    expect(tableData[0]).toMatchObject({
      symbol: mockSymbol.value,
      totalVested: 150,
      totalReleased: 30
    })
  })

  it('handles empty vestings array', () => {
    mockVestingInfos.value = [[], []]
    wrapper = mountComponent()

    const tableData = wrapper.findComponent({ name: 'UTable' }).props('data') as Array<unknown>
    expect(tableData).toHaveLength(1)
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
