import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import DropdownActions from '../WeeklyClaimActionDropdown.vue'
import type { Status } from '../WeeklyClaimActionDropdown.vue'
import { createPinia, setActivePinia } from 'pinia'
import { useTeamStore, useToastStore, useUserDataStore } from '@/stores'
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
    put: vi.fn().mockReturnThis(),
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

  const createWrapper = (status: Status = 'pending') => {
    return mount(DropdownActions, {
      props: {
        status,
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
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })
  describe('Action handling', () => {
    it('should close menu after click enable', async () => {
      const wrapper = createWrapper('disabled')
      const button = wrapper.findComponent({ name: 'ButtonUI' })
      button.trigger('click')

      await flushPromises()
      const disabledEnable = wrapper.find('[data-test="disabled-enable"]')
      expect(disabledEnable).toBeTruthy()
      const weeklyClaimActionEnable = wrapper.findComponent({ name: 'WeeklyClaimActionEnable' })
      expect(weeklyClaimActionEnable.exists()).toBeTruthy()
      const enableAction = weeklyClaimActionEnable.find('[data-test="enable-action"]')
      expect(enableAction).toBeTruthy()
      await enableAction.trigger('click')
      expect(weeklyClaimActionEnable.emitted()).toHaveProperty('close')
      //@ts-expect-error not visible on wrapper
      expect(wrapper.vm.isOpen).toBe(false)
    })
    it('should handle disable claim properly', async () => {
      //@ts-expect-error only mocking necessary variables
      vi.mocked(useReadContract).mockReturnValue({
        ...mocks.mockUseReadContract,
        data: ref('0xUserAddress')
      })

      //@ts-expect-error only mocking necessary values
      vi.mocked(waitForTransactionReceipt).mockResolvedValue({
        status: 'success'
      })

      const wrapper = createWrapper('signed')

      // Trigger the claim function
      //@ts-expect-error not visible on wrapper.vm
      await wrapper.vm.disableClaim()

      // Should show update claim status error
      expect(mocks.mockWagmiCore.writeContract).toBeCalled()
      //@ts-expect-error not visible on wrapper
      expect(wrapper.vm.weeklyClaimUrl).toBe('/weeklyclaim/1/?action=disable')
      expect(mocks.mockToastStore.addSuccessToast).toHaveBeenCalledWith('Claim disabled')
    })

    it('should handle disable claim errors properly', async () => {
      const { useCustomFetch } = await import('@/composables')

      //@ts-expect-error only mocking required values
      vi.mocked(useCustomFetch).mockReturnValue({
        put: vi.fn().mockReturnThis(),
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

      let wrapper = createWrapper('signed')

      //@ts-expect-error not visible on wrapper
      await wrapper.vm.disableClaim()

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

      wrapper = createWrapper('signed')

      //@ts-expect-error not visible on wrapper
      await wrapper.vm.disableClaim()
      expect(mocks.mockToastStore.addErrorToast).toBeCalledWith('Failed to update Claim status')

      vi.mocked(useToastStore).mockClear()
      vi.mocked(useCustomFetch).mockRestore()
      //@ts-expect-error only mocking necessary values
      vi.mocked(waitForTransactionReceipt).mockResolvedValue({
        status: 'reverted'
      })

      wrapper = createWrapper('signed')

      //@ts-expect-error not visible on wrapper
      await wrapper.vm.disableClaim()

      expect(mocks.mockToastStore.addErrorToast).toBeCalledWith(
        'Transaction failed: Failed to disable claim'
      )

      vi.mocked(useToastStore).mockClear()
      vi.mocked(useCustomFetch).mockRestore()
      //@ts-expect-error only mocking necessary values
      vi.mocked(waitForTransactionReceipt).mockResolvedValue({
        status: 'success'
      })
      const simulateError = new Error('Simulate error')
      vi.mocked(simulateContract).mockRejectedValue(simulateError)

      wrapper = createWrapper('signed')

      //@ts-expect-error not visible on wrapper
      await wrapper.vm.disableClaim()

      expect(logError).toBeCalledWith('Disable error', simulateError)
      expect(mocks.mockToastStore.addErrorToast).toBeCalledWith('Parsed error message')
    })

    it('closes dropdown after action is selected', async () => {
      //@ts-expect-error only mocking necessary fields
      vi.mocked(useUserDataStore).mockReturnValue({
        address: '0xContractOwner'
      })
      const wrapper = createWrapper('pending')
      const button = wrapper.findComponent({ name: 'ButtonUI' })

      // Open dropdown
      await button.trigger('click')
      //@ts-expect-error not visible wrapper
      expect(wrapper.vm.isOpen).toBe(true)
      // Click action
      const crSign = wrapper.findComponent({ name: 'CRSigne' })
      expect(crSign.exists()).toBeTruthy()
      const signAction = crSign.find('[data-test="sign-action"]')
      expect(signAction.exists()).toBeTruthy()
      await signAction.trigger('click')

      // Check dropdown is closed
      //@ts-expect-error not visible wrapper
      expect(wrapper.vm.isOpen).toBe(false)
      expect(wrapper.find('ul').exists()).toBe(false)
    })

    it('closes dropdown after withdraw action', async () => {
      //@ts-expect-error only mocking necessary fileds
      vi.mocked(useUserDataStore).mockReturnValue({
        address: '0xContractOwner'
      })
      const wrapper = createWrapper('signed')
      const button = wrapper.findComponent({ name: 'ButtonUI' })

      await button.trigger('click')

      const crWithdrawClaim = wrapper.findComponent({ name: 'CRWithdrawClaim' })
      const withdrawAction = crWithdrawClaim.find('[data-test="withdraw-action"]')
      expect(withdrawAction.exists()).toBeTruthy()

      // Test Withdraw action
      await withdrawAction.trigger('click')
      expect(crWithdrawClaim.emitted()).toHaveProperty('claim-withdrawn')
      //@ts-expect-error not visible on wrapper
      expect(wrapper.vm.isOpen).toBeFalsy()
    })
  })
})
