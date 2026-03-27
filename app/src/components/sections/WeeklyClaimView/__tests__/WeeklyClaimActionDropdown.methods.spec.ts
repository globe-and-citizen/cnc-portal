import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import DropdownActions from '../WeeklyClaimActionDropdown.vue'
import type { Status } from '../WeeklyClaimActionDropdown.vue'
import { createPinia, setActivePinia } from 'pinia'
import { useTeamStore, useUserDataStore } from '@/stores'
import type { WeeklyClaim } from '@/types'
import { mockUseReadContract, mockWagmiCore, mockToastStore, mockUserStore } from '@/tests/mocks'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import isoWeek from 'dayjs/plugin/isoWeek'

// Configure dayjs plugins
dayjs.extend(utc)
dayjs.extend(isoWeek)

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
    return shallowMount(DropdownActions, {
      props: {
        status,
        weeklyClaim
      },
    })
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()

    // Set up team store with currentTeamId
    const teamStore = useTeamStore()
    teamStore.currentTeamId = '1'

    // Set up user store
    const userStore = useUserDataStore()
    userStore.address = MOCK_OWNER_ADDRESS
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })
  describe.skip('Action handling', () => {
    it('should close menu after click enable', async () => {
      const wrapper = createWrapper('disabled')
      const button = wrapper.findComponent({ name: 'UButton' })
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
    it.skip('should handle disable claim properly', async () => {
      mockUseReadContract.data.value = '0xUserAddress'
      mockWagmiCore.waitForTransactionReceipt.mockResolvedValue({
        status: 'success'
      })

      const wrapper = createWrapper('signed')

      // Trigger the claim function
      //@ts-expect-error not visible on wrapper.vm
      await wrapper.vm.disableClaim()

      // Should show update claim status error
      expect(mockWagmiCore.writeContract).toBeCalled()
      //@ts-expect-error not visible on wrapper
      expect(wrapper.vm.weeklyClaimSyncUrl).toBe('/weeklyclaim/sync/?teamId=1')
      expect(mockToastStore.addSuccessToast).toHaveBeenCalledWith('Claim disabled')
    })

    it.skip('closes dropdown after action is selected', async () => {
      mockUserStore.address = '0xContractOwner'
      const wrapper = createWrapper('pending')
      const button = wrapper.findComponent({ name: 'UButton' })

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
      mockUserStore.address = '0xContractOwner'
      const wrapper = createWrapper('signed')
      const button = wrapper.findComponent({ name: 'UButton' })

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
