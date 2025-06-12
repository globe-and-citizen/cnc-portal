import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import VestingView from '../VestingView.vue'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue' // ⚠️ corriger ici (pas 'process')
import type { VestingRow } from '@/types/vesting'

const mockVestingInfos = ref<VestingRow[]>([
  {
    member: '0x000000000000000000000000000000000000dead',
    teamId: 1,
    startDate: `${Math.floor(Date.now() / 1000) - 3600}`, // already started
    durationDays: 30,
    cliffDays: 0,
    totalAmount: Number(10e18),
    released: Number(2e18),
    status: 'Active',
    tokenSymbol: 'TST'
  }
])

vi.mock('@/stores/useToastStore', () => ({
  useToastStore: () => ({
    addErrorToast: vi.fn(),
    addSuccessToast: vi.fn()
  })
}))

const mockWriteContract = {
  writeContract: vi.fn(),
  error: ref(null),
  isPending: ref(false),
  data: ref(null)
}
const mockWaitReceipt = {
  isLoading: ref(false),
  isSuccess: ref(false)
}
const mockReadContract = {
  data: ref([]),
  error: ref(null),
  refetch: vi.fn(() => Promise.resolve())
}
const mockArchivedInfos = ref([[], []])

vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: object = (await importOriginal()) as typeof import('@wagmi/vue')
  return {
    ...actual,
    useWriteContract: vi.fn(() => mockWriteContract),
    useWaitForTransactionReceipt: vi.fn(() => mockWaitReceipt),
    useReadContract: vi.fn(({ functionName }) => {
      if (functionName === 'getTeamVestingsWithMembers') {
        return {
          data: mockVestingInfos,
          error: ref(null),
          refetch: vi.fn(() => Promise.resolve())
        }
      }
      if (functionName === 'getTeamAllArchivedVestingsFlat') {
        return {
          data: mockArchivedInfos,
          error: ref(null),
          refetch: vi.fn(() => Promise.resolve())
        }
      }
      return {
        data: ref('TST'),
        error: ref(null),
        refetch: vi.fn(() => Promise.resolve())
      }
    })
  }
})

vi.mock('@/stores', () => ({
  useTeamStore: () => ({
    currentTeam: {
      id: 1,
      ownerAddress: '0x000000000000000000000000000000000000dead',
      teamContracts: [
        {
          type: 'InvestorsV1',
          address: '0x000000000000000000000000000000000000beef'
        }
      ]
    }
  }),
  useUserDataStore: () => ({
    address: '0x000000000000000000000000000000000000dead'
  })
}))

describe('VestingOverview.vue', () => {
  let wrapper: VueWrapper

  const mountComponent = () => {
    return mount(VestingView, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })
  }

  beforeEach(() => {
    wrapper = mountComponent()
    // reset mocks
    mockWriteContract.writeContract.mockReset()
    mockWaitReceipt.isLoading.value = false
    mockWaitReceipt.isSuccess.value = false
    mockReadContract.data.value = []
  })

  describe('Initial Render', () => {
    it('renders "Vesting Stats" and "Vesting Overview" cards', () => {
      expect(wrapper.text()).toContain('Vesting Stats')
      expect(wrapper.text()).toContain('Vesting Overview')
    })

    it('renders the vesting table container', () => {
      expect(wrapper.findAll('[data-test="investors-actions"]').length).toBeGreaterThan(0)
    })
  })

  describe('Create Vesting Modal Trigger', () => {
    it('shows the "add vesting" button when user is team owner', () => {
      const addButton = wrapper.find('[data-test="createAddVesting"]')
      expect(addButton.exists()).toBe(true)
    })

    it('opens the modal when "add vesting" is clicked', async () => {
      const addButton = wrapper.find('[data-test="createAddVesting"]')
      await addButton.trigger('click')
      await wrapper.vm.$nextTick()
      expect(wrapper.findComponent({ name: 'ModalComponent' }).exists()).toBe(true)
    })
  })

  describe.skip('Table Actions Visibility', () => {
    it('renders "Stop" button for active vesting when user is owner', async () => {
      mockVestingInfos.value = [
        {
          member: '0x000000000000000000000000000000000000dead',
          teamId: 1,
          startDate: `${Math.floor(Date.now() / 1000) - 3600}`, // started
          durationDays: 30,
          cliffDays: 0,
          totalAmount: Number(10e18),
          released: Number(2e18),
          status: 'Active',
          tokenSymbol: 'TST'
        }
      ]

      wrapper = mountComponent()
      await wrapper.vm.$nextTick()

      const stopButtons = wrapper.findAll('[data-test="stop-btn"]')
      expect(stopButtons.length).toBeGreaterThan(0)
    })

    it('renders "Release" button if vesting is started and member matches user', async () => {
      mockVestingInfos.value = [
        {
          member: '0x000000000000000000000000000000000000dead',
          teamId: 1,
          startDate: `${Math.floor(Date.now() / 1000) - 3600}`, // started
          durationDays: 30,
          cliffDays: 0,
          totalAmount: Number(10e18),
          released: Number(5e18),
          status: 'Active',
          tokenSymbol: 'TST'
        }
      ]

      wrapper = mountComponent()
      await wrapper.vm.$nextTick()

      const releaseBtn = wrapper.findAll('button').find((btn) => btn.text().includes('Release'))
      expect(releaseBtn).toBeDefined()
    })

    it('disables "Release" button if vesting is not started', async () => {
      mockVestingInfos.value = [
        {
          member: '0x000000000000000000000000000000000000dead',
          teamId: 1,
          startDate: `${Math.floor(Date.now() / 1000) + 3600}`, // not started
          durationDays: 30,
          cliffDays: 0,
          totalAmount: Number(10e18),
          released: Number(0),
          status: 'Active',
          tokenSymbol: 'TST'
        }
      ]

      wrapper = mountComponent()
      await wrapper.vm.$nextTick()

      const releaseBtn = wrapper.findAll('button').find((btn) => btn.text().includes('Release'))
      expect(releaseBtn?.attributes('disabled')).toBeDefined()
    })
  })
})
