import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import VestingStats from '@/components/sections/VestingView/VestingStats.vue'
//import { useToastStore } from '@/stores/__mocks__/useToastStore'
import { type VestingRow } from '@/types/vesting'
import { ref } from 'vue'

// Constants
const memberAddress = '0x000000000000000000000000000000000000dead'
const mockSymbol = ref<string>('shr')
// Mocks
const mockVestingInfos = ref<VestingRow[]>([
  {
    teamId: 1,
    member: memberAddress,
    startDate: new Date(Date.now() * 3600 * 1000).toLocaleDateString('en-GB'),
    durationDays: 30,
    cliffDays: 0,
    totalAmount: Number(BigInt(10e18)),
    released: Number(BigInt(2e18)),
    status: 'Active',
    tokenSymbol: mockSymbol.value,
    isStarted: true
  }
])

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
    ...actual
  }
})

// Test suite
describe('VestingStats.vue', () => {
  let wrapper: VueWrapper

  const mountComponent = () => {
    return mount(VestingStats, {
      props: {
        vestings: mockVestingInfos.value,
        symbol: mockSymbol.value
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

  it('renders vesting stats component', () => {
    expect(wrapper.find('[data-test="vesting-stats"]').exists()).toBe(true)
  })

  it('calculates token summary correctly from vestings data', async () => {
    // Setup mock data with multiple vestings
    mockVestingInfos.value = [
      {
        teamId: 1,
        member: memberAddress,
        startDate: new Date().toLocaleDateString('en-GB'),
        durationDays: 30,
        cliffDays: 0,
        totalAmount: 100,
        released: 20,
        status: 'Active',
        tokenSymbol: mockSymbol.value,
        isStarted: true
      },
      {
        teamId: 1,
        member: '0xotheraddress',
        startDate: new Date().toLocaleDateString('en-GB'),
        durationDays: 30,
        cliffDays: 0,
        totalAmount: 50,
        released: 10,
        status: 'Active',
        tokenSymbol: mockSymbol.value,
        isStarted: true
      }
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
    mockVestingInfos.value = []
    wrapper = mountComponent()

    const summaryRows = (wrapper.vm as (typeof VestingStats)['prototype']).tokenSummaryRows
    expect(summaryRows).toHaveLength(0)
  })

  it('displays formatted token amounts with symbols', async () => {
    mockSymbol.value = 'TEST'
    mockVestingInfos.value = [
      {
        teamId: 1,
        member: memberAddress,
        startDate: new Date().toLocaleDateString('en-GB'),
        durationDays: 30,
        cliffDays: 0,
        totalAmount: 100,
        released: 20,
        status: 'Active',
        tokenSymbol: mockSymbol.value,
        isStarted: true
      }
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
