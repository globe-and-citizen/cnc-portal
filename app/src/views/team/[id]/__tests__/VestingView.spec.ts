import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import VestingView from '../VestingView.vue'
//import { useToastStore } from '@/stores/__mocks__/useToastStore'
import { ref } from 'vue'

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
        data: ref('TST'),
        error: ref(null),
        refetch: vi.fn()
      }
    })
  }
})

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
    wrapper = mountComponent()
    mockWriteContract.writeContract.mockReset()
    mockWaitReceipt.isLoading.value = false
    mockWaitReceipt.isSuccess.value = false
  })

  it('renders main cards and tables', () => {
    expect(wrapper.text()).toContain('Vesting Stats')
    expect(wrapper.text()).toContain('Vesting Overview')
    expect(wrapper.find('[data-test="vesting-stats"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="vesting-overview"]').exists()).toBe(true)
  })

  it('shows and opens add vesting modal', async () => {
    const btn = wrapper.find('[data-test="createAddVesting"]')
    expect(btn.exists()).toBe(true)
    await btn.trigger('click')
    expect(wrapper.findComponent({ name: 'ModalComponent' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'CreateVesting' }).exists()).toBe(true)
  })

  it('opens modal with correct props when add vesting button is clicked', async () => {
    // Click the add vesting button
    const addButton = wrapper.find('[data-test="createAddVesting"]')
    await addButton.trigger('click')

    // Check if modal is opened
    expect(wrapper.findComponent({ name: 'ModalComponent' }).exists()).toBe(true)

    // Find the CreateVesting component
    const createVesting = wrapper.findComponent({ name: 'CreateVesting' })
    expect(createVesting.exists()).toBe(true)

    // Verify props
    expect(createVesting.props()).toMatchObject({
      teamId: 1,
      tokenAddress: '0x000000000000000000000000000000000000beef' // This comes from the mocked sherToken
    })
  })

  it('handles CreateVesting component events correctly', async () => {
    // Open modal
    await wrapper.find('[data-test="createAddVesting"]').trigger('click')

    const createVesting = wrapper.findComponent({ name: 'CreateVesting' })

    await createVesting.vm.$emit('reloadVestingInfos')
    await wrapper.vm.$nextTick()
    // Test closeAddVestingModal event
    await createVesting.vm.$emit('closeAddVestingModal')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="createAddVestingModal"]').exists()).toBe(false)

    // Test reloadVestingInfos event
    expect(refetchVestingInfos).toHaveBeenCalled()
  })

  it('handles toggle vesting view button correctly', async () => {
    wrapper = mountComponent()
    await wrapper.vm.$nextTick()
    const toggleBtn = wrapper.find('[data-test="toggle-vesting-view"]')

    expect(toggleBtn.exists()).toBe(true)

    expect(toggleBtn.text().toLowerCase()).toContain('actives')
    expect(toggleBtn.classes()).toContain('btn-secondary')

    await toggleBtn.trigger('click')
    await wrapper.vm.$nextTick()

    expect(toggleBtn.text().toLowerCase()).toContain('archived')

    expect(toggleBtn.classes()).toContain('btn-ghost')
  })

  it('passes correct props to CreateVesting', async () => {
    const btn = wrapper.find('[data-test="createAddVesting"]')
    await btn.trigger('click')

    const component = wrapper.findComponent({ name: 'CreateVesting' })
    expect(component.props('teamId')).toBe(1)
    expect(component.props('tokenAddress')).toBe('0x000000000000000000000000000000000000beef')
  })
})
