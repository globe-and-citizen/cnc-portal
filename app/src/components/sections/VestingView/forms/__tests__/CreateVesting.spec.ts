import { describe, it, vi, expect, beforeEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import CreateVesting from '@/components/sections/VestingView/forms/CreateVesting.vue'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import { parseUnits } from 'viem'
import { useToastStore } from '@/stores/__mocks__/useToastStore'
import { VESTING_ADDRESS } from '@/constant'
import VestingABI from '@/artifacts/abi/Vesting.json'

// Constants
const memberAddress = '0x000000000000000000000000000000000000dead'
const mockSymbol = ref<string>('shr')
const mockReloadKey = ref<number>(0)
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

const mockWriteContract = {
  writeContract: vi.fn(),
  error: ref<null | Error>(null),
  isPending: ref(false),
  data: ref(null)
}

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

const mockWaitForReceipt = {
  isLoading: ref(false),
  isSuccess: ref(false)
}
const mockBalance = ref<bigint | undefined>(parseUnits('10', 6)) // default 10 tokens
const mockAllowance = ref(parseUnits('10', 6)) // default 10 tokens
const mockBalanceError = ref<null | Error>(null)
const mockAllowanceError = ref<null | Error>(null)

vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import('@wagmi/vue')
  return {
    ...actual,
    useWriteContract: vi.fn(() => mockWriteContract),
    useWaitForTransactionReceipt: vi.fn(() => mockWaitForReceipt),
    useReadContract: vi.fn(({ functionName }) => {
      if (functionName === 'balanceOf') {
        return {
          data: mockBalance,
          refetch: vi.fn(),
          error: mockBalanceError
        }
      }
      if (functionName === 'allowance') {
        return {
          data: mockAllowance,
          refetch: vi.fn(),
          error: mockAllowanceError
        }
      }
      if (functionName === 'getTeamVestingsWithMembers') {
        return {
          data: mockVestingInfos,
          error: ref(null),
          refetch: refetchVestingInfos
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
        data: ref(BigInt(0)),
        refetch: vi.fn(),
        error: ref(null)
      }
    })
  }
})
vi.mock('@/stores/useToastStore')
vi.mock('@/stores', () => ({
  useUserDataStore: () => ({
    address: '0x000000000000000000000000000000000000dead'
  }),
  useTeamStore: () => ({
    currentTeam: mockCurrentTeam.value
  })
}))

describe.skip('CreateVesting.vue', () => {
  let wrapper: VueWrapper
  const mountComponent = () =>
    mount(CreateVesting, {
      props: {
        reloadKey: mockReloadKey.value,
        tokenAddress: '0x000000000000000000000000000000000000beef',
        vestings: mockVestingInfos.value
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      },
      data() {
        return {
          tokenApproved: false
        }
      }
    })
  beforeEach(() => {
    vi.clearAllMocks()
    wrapper = mountComponent()
  })
  describe('Initial Render', () => {
    it('renders key form inputs', () => {
      expect(wrapper.find('[data-test="member"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="start-date"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="duration"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="cliff"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="total-amount"]').exists()).toBe(true)
    })
    it('shows error on invalid member address', async () => {
      await wrapper.find('[data-test="member"]').setValue('notanaddress')
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('Please enter a valid Ethereum address.')
    })
  })
  describe('Allowance Approval', () => {
    it('calls approveAllowance when amount > 0', async () => {
      await wrapper.find('[data-test="total-amount"]').setValue(10)
      const approveBtn = wrapper.find('[data-test="approve-btn"]')
      expect(approveBtn.attributes('disabled')).toBeUndefined()
      await approveBtn.trigger('click')
      expect(mockWriteContract.writeContract).toHaveBeenCalled()
    })
  })

  describe('Create Vesting Submission', () => {
    beforeEach(async () => {
      await wrapper
        .find('[data-test="member"]')
        .setValue('0x000000000000000000000000000000000000dead')
      await wrapper.find('[data-test="start-date"]').setValue('2025-06-13')
      await wrapper.find('[data-test="duration"]').setValue(30)
      await wrapper.find('[data-test="cliff"]').setValue(5)
      await wrapper.find('[data-test="total-amount"]').setValue(5)
      await wrapper.setData({ tokenApproved: true })
      await wrapper.vm.$nextTick()
    })
    it('shows error toast when allowance check fails', async () => {
      // Mock the error scenario
      const { addErrorToast } = useToastStore()
      mockAllowanceError.value = new Error('Allowance check failed')
      const approveBtn = wrapper.find('[data-test="approve-btn"]')
      await approveBtn.trigger('click')
      // Verify error toast was called with correct message
      expect(addErrorToast).toHaveBeenCalledWith('error on get Allowance')
    })
    it('shows error toast when token approval fails', async () => {
      const { addErrorToast } = useToastStore()
      mockWriteContract.error.value = new Error('Approval failed')
      // Trigger approval
      const approveBtn = wrapper.find('[data-test="approve-btn"]')
      await approveBtn.trigger('click')
      // Verify error toast was shown
      expect(addErrorToast).toHaveBeenCalledWith('Approval failed')
    })

    it('calls writeContract on valid form and tokenApproved=true', async () => {
      mockBalance.value = parseUnits('1000', 6)
      mockAllowance.value = parseUnits('1000', 6)
      await wrapper
        .find('[data-test="member"]')
        .setValue('0x120000000000000000000000000000000000dead')
      await wrapper.vm.$nextTick()
      // Submit
      const submitBtn = wrapper.find('[data-test="submit-btn"]')
      expect(submitBtn.attributes('disabled')).toBeUndefined()
      await submitBtn.trigger('click')
      await wrapper.vm.$nextTick()
      const start = Math.floor(new Date('2025-06-13').getTime() / 1000)
      const durationInSeconds = 30 * 24 * 60 * 60
      const cliffInSeconds = 5 * 24 * 60 * 60
      const amountInUnits = parseUnits('5', 6)
      expect(mockWriteContract.writeContract).toHaveBeenCalledWith({
        address: VESTING_ADDRESS,
        abi: VestingABI,
        functionName: 'addVesting',
        args: [
          1, // teamId
          '0x120000000000000000000000000000000000dead',
          start,
          durationInSeconds,
          cliffInSeconds,
          amountInUnits,
          '0x000000000000000000000000000000000000beef' // tokenAddress
        ]
      })
      // Simulate successful vesting creation
      mockWaitForReceipt.isLoading.value = true
      await wrapper.vm.$nextTick()
      mockWaitForReceipt.isSuccess.value = true
      mockWaitForReceipt.isLoading.value = false
      await wrapper.vm.$nextTick()
      expect((wrapper.find('[data-test="member"]').element as HTMLInputElement).value).toBe('')
      expect((wrapper.find('[data-test="start-date"]').element as HTMLInputElement).value).toBe('')
      expect((wrapper.find('[data-test="duration"]').element as HTMLInputElement).value).toBe('30')
      expect((wrapper.find('[data-test="cliff"]').element as HTMLInputElement).value).toBe('0')
      expect((wrapper.find('[data-test="total-amount"]').element as HTMLInputElement).value).toBe(
        '0'
      )
    })
    it('does not show error toast when errorAddVesting is falsy', async () => {
      const { addErrorToast } = useToastStore()
      mockWriteContract.error.value = null
      expect(addErrorToast).not.toHaveBeenCalled()
    })

    it('does not show error toast when getAllance is falsy', async () => {
      const { addErrorToast } = useToastStore()
      mockAllowanceError.value = null
      expect(addErrorToast).not.toHaveBeenCalled()
    })

    it('prevents submission when form is invalid', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()

      await wrapper.find('[data-test="duration"]').setValue(30)
      await wrapper.vm.$nextTick()
      // Submit form
      const submitBtn = wrapper.find('[data-test="submit-btn"]')
      await submitBtn.trigger('click')
      await wrapper.vm.$nextTick()
      // Verify contract write was not called due to invalid form
      expect(mockWriteContract.writeContract).not.toHaveBeenCalled()
    })

    it('shows error toast when adding vesting fails', async () => {
      const { addErrorToast } = useToastStore()
      // Set up form values
      await wrapper
        .find('[data-test="member"]')
        .setValue('0x120000000000000000000000000000000000dead')
      await wrapper.vm.$nextTick()
      // Simulate error when adding vesting
      mockWriteContract.error.value = new Error('Add vesting failed')
      // Submit form
      const submitBtn = wrapper.find('[data-test="submit-btn"]')
      await submitBtn.trigger('click')
      await wrapper.vm.$nextTick()
      // Verify error toast was shown
      expect(addErrorToast).toHaveBeenCalledWith('Add vesting failed')
    })

    it('shows error toast when member already has active vesting', async () => {
      const { addErrorToast } = useToastStore()
      // Set member address that matches existing vesting
      await wrapper.find('[data-test="member"]').setValue(memberAddress)
      await wrapper.vm.$nextTick()
      // Submit form
      const submitBtn = wrapper.find('[data-test="submit-btn"]')
      await submitBtn.trigger('click')
      await wrapper.vm.$nextTick()
      // Verify duplicate check prevented submission and showed error
      expect(addErrorToast).toHaveBeenCalledWith(
        'The member address already has an active vesting.'
      )
      expect(mockWriteContract.writeContract).not.toHaveBeenCalled()
    })

    it('shows error toast when total amount is zero during approval', async () => {
      const { addErrorToast } = useToastStore()
      await wrapper
        .find('[data-test="member"]')
        .setValue('0x000000000000000000000000000000000000live')
      // Set total amount to 0
      await wrapper.find('[data-test="total-amount"]').setValue(0)
      await wrapper.vm.$nextTick()
      // Trigger approval
      const approveBtn = wrapper.find('[data-test="approve-btn"]')
      await approveBtn.trigger('click')
      await wrapper.vm.$nextTick()
      // Verify error toast was shown with correct message
      expect(addErrorToast).toHaveBeenCalledWith('total amount value should be greater than zero')
      expect(mockWriteContract.writeContract).not.toHaveBeenCalled()
    })

    it('skips balance check when tokenBalance is undefined', async () => {
      const { addErrorToast } = useToastStore()
      // Force token balance to be undefined
      mockBalance.value = undefined
      // Fill out the form with valid data
      await wrapper
        .find('[data-test="member"]')
        .setValue('0x120000000000000000000000000000000000dead')
      await wrapper.vm.$nextTick()
      // Submit the form
      await wrapper.find('[data-test="submit-btn"]').trigger('click')
      await wrapper.vm.$nextTick()
      // This would mean the balance check branch was skipped
      expect(addErrorToast).not.toHaveBeenCalledWith('Insufficient token balance')
      // The next step (e.g. allowance check or vesting call) happens
      expect(mockWriteContract.writeContract).toHaveBeenCalled()
    })

    it('shows error toast when token balance is insufficient', async () => {
      const { addErrorToast } = useToastStore()
      // Mock token balance to be less than requested amount
      mockBalance.value = parseUnits('1', 6) // 1 token
      // Set form values with amount greater than balance
      await wrapper
        .find('[data-test="member"]')
        .setValue('0x120000000000000000000000000000000000dead')
      await wrapper.find('[data-test="start-date"]').setValue('2025-06-13')
      await wrapper.vm.$nextTick()
      // Submit form
      const submitBtn = wrapper.find('[data-test="submit-btn"]')
      await submitBtn.trigger('click')
      await wrapper.vm.$nextTick()
      // Verify error toast was shown
      expect(addErrorToast).toHaveBeenCalledWith('Insufficient token balance')
      expect(mockWriteContract.writeContract).not.toHaveBeenCalled()
    })

    it('shows error toast when allowance is less than total amount', async () => {
      const { addErrorToast } = useToastStore()
      // Mock allowance to be less than requested amount
      mockBalance.value = parseUnits('10', 6)
      mockAllowance.value = parseUnits('2', 6) // 2 token allowance
      // Set form values with amount greater than allowance
      await wrapper
        .find('[data-test="member"]')
        .setValue('0x120000000000000000000000000000000000dead')
      await wrapper.vm.$nextTick()
      // Submit form
      const submitBtn = wrapper.find('[data-test="submit-btn"]')
      await submitBtn.trigger('click')
      await wrapper.vm.$nextTick()
      // Verify error toast was shown
      expect(addErrorToast).toHaveBeenCalledWith('Allowance is less than the total amount')
      expect(mockWriteContract.writeContract).not.toHaveBeenCalled()
    })
  })
})
