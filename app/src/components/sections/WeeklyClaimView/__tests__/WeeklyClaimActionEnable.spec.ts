import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import WeeklyClaimActionEnable from '../WeeklyClaimActionEnable.vue'
import { createPinia, setActivePinia } from 'pinia'
import { useTeamStore, useToastStore } from '@/stores'
import type { WeeklyClaim } from '@/types'
import { ref } from 'vue'
import * as mocks from '@/tests/mocks'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import isoWeek from 'dayjs/plugin/isoWeek'
import { useReadContract } from '@wagmi/vue'
import { simulateContract, waitForTransactionReceipt } from '@wagmi/core'
import { log } from '@/utils'

// Configure dayjs plugins
dayjs.extend(utc)
dayjs.extend(isoWeek)

// Mock the dependencies
vi.mock('viem', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    keccak256: vi.fn()
  }
})
vi.mock('@iconify/vue', () => ({
  Icon: {
    template: '<span>Icon</span>'
  }
}))

vi.mock('@/components/ButtonUI.vue', () => ({
  default: {
    template: '<button><slot /></button>',
    props: ['size', 'class']
  }
}))

vi.mock('@/utils', () => ({
  log: {
    error: vi.fn()
  },
  parseError: vi.fn(() => 'Parsed error message')
}))

vi.mock('@/composables', () => ({
  useCustomFetch: vi.fn(() => ({
    post: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnValue({
      execute: vi.fn().mockResolvedValue({}),
      error: ref(null)
    })
  }))
}))

vi.mock('@tanstack/vue-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn()
  })
}))

describe('DropdownActions', () => {
  const MOCK_OWNER_ADDRESS = '0xOwnerAddress'

  const weeklyClaim: WeeklyClaim = {
    id: 1,
    status: 'pending',
    hoursWorked: 8,
    createdAt: '2024-01-01T00:00:00Z',
    wage: {
      userAddress: MOCK_OWNER_ADDRESS,
      ratePerHour: [{ type: 'native', amount: 10 }],
      id: 0,
      teamId: 0,
      cashRatePerHour: 0,
      tokenRatePerHour: 0,
      usdcRatePerHour: 0,
      maximumHoursPerWeek: 0,
      nextWageId: null,
      createdAt: '',
      updatedAt: ''
    },
    weekStart: '2024-01-01T00:00:00Z',
    data: {
      ownerAddress: MOCK_OWNER_ADDRESS
    },
    memberAddress: MOCK_OWNER_ADDRESS,
    teamId: 0,
    signature: null,
    wageId: 0,
    updatedAt: '',
    claims: []
  }

  const createWrapper = (isCashRemunerationOwner: boolean) => {
    return mount(WeeklyClaimActionEnable, {
      props: {
        isCashRemunerationOwner,
        weeklyClaim
      },
      global: {
        stubs: {
          IconifyIcon: true,
          ButtonUI: true
        }
      }
    })
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()

    // Set up team store with currentTeamId
    const teamStore = useTeamStore()
    teamStore.currentTeamId = '1'
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })
  describe('Action handling', () => {
    it('should handle enable claim properly', async () => {
      //@ts-expect-error only mocking necessary variables
      vi.mocked(useReadContract).mockReturnValue({
        ...mocks.mockUseReadContract,
        data: ref('0xUserAddress')
      })

      //@ts-expect-error only mocking necessary values
      vi.mocked(waitForTransactionReceipt).mockResolvedValue({
        status: 'success'
      })

      const wrapper = createWrapper(true)

      // Trigger the claim function
      //@ts-expect-error not visible on wrapper.vm
      await wrapper.vm.enableClaim()

      // Should show update claim status error
      expect(mocks.mockWagmiCore.writeContract).toBeCalled()
      //@ts-expect-error not visible on wrapper
      expect(wrapper.vm.weeklyClaimSyncUrl).toBe('/weeklyclaim/sync/?teamId=1')
      expect(mocks.mockToastStore.addSuccessToast).toHaveBeenCalledWith('Claim enabled')
    })

    it('should handle enable claim errors properly', async () => {
      const { useCustomFetch } = await import('@/composables')

      //@ts-expect-error only mocking required values
      vi.mocked(useCustomFetch).mockReturnValue({
        post: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnValue({
          execute: vi.fn().mockResolvedValue({}),
          error: ref(new Error('Update failed'))
        })
      })

      //@ts-expect-error only mocking nnecessary values
      vi.mocked(useTeamStore).mockReturnValue({
        ...mocks.mockTeamStore,
        getContractAddressByType: vi.fn(() => undefined)
      })

      //@ts-expect-error only mocking necessary variables
      vi.mocked(useReadContract).mockReturnValue({
        ...mocks.mockUseReadContract,
        data: ref('0xUserAddress')
      })

      let wrapper = createWrapper(true)

      //@ts-expect-error not visible on wrapper
      await wrapper.vm.enableClaim()

      //@ts-expect-error not visible on wrapper
      expect(wrapper.vm.isLoading).toBeFalsy()
      expect(mocks.mockToastStore.addErrorToast).toBeCalledWith(
        'Cash Remuneration EIP712 contract address not found'
      )

      vi.mocked(useTeamStore).mockRestore()

      //@ts-expect-error only mocking necessary values
      vi.mocked(waitForTransactionReceipt).mockResolvedValue({
        status: 'success'
      })
      await flushPromises()

      const logError = vi.spyOn(log, 'error')

      wrapper = createWrapper(true)

      //@ts-expect-error not visible on wrapper
      await wrapper.vm.enableClaim()
      expect(mocks.mockToastStore.addErrorToast).toBeCalledWith('Failed to update Claim status')

      vi.mocked(useToastStore).mockClear()
      vi.mocked(useCustomFetch).mockRestore()
      //@ts-expect-error only mocking necessary values
      vi.mocked(waitForTransactionReceipt).mockResolvedValue({
        status: 'reverted'
      })

      wrapper = createWrapper(true)

      //@ts-expect-error not visible on wrapper
      await wrapper.vm.enableClaim()

      expect(mocks.mockToastStore.addErrorToast).toBeCalledWith(
        'Transaction failed: Failed to enable claim'
      )

      vi.mocked(useToastStore).mockClear()
      vi.mocked(useCustomFetch).mockRestore()
      //@ts-expect-error only mocking necessary values
      vi.mocked(waitForTransactionReceipt).mockResolvedValue({
        status: 'success'
      })
      const simulateError = new Error('Simulate error')
      vi.mocked(simulateContract).mockRejectedValue(simulateError)

      wrapper = createWrapper(true)

      //@ts-expect-error not visible on wrapper
      await wrapper.vm.enableClaim()

      expect(logError).toBeCalledWith('Enable error', simulateError)
      expect(mocks.mockToastStore.addErrorToast).toBeCalledWith('Parsed error message')
    })
  })
})
