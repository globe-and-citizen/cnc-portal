import { describe, it, vi, expect, beforeEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import Datepicker from '@vuepic/vue-datepicker'
import CreateVesting from '@/components/sections/VestingView/forms/CreateVesting.vue'
import SelectMemberInput from '@/components/utils/SelectMemberInput.vue'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import { parseEther, parseUnits } from 'viem'
import { useToastStore } from '@/stores/__mocks__/useToastStore'
import { VESTING_ADDRESS } from '@/constant'
import { INVESTOR_ABI } from '@/artifacts/abi/investorsV1'
import { WagmiPlugin, createConfig, http } from '@wagmi/vue'
import { mainnet } from 'viem/chains'
import { mockUseCurrencyStore } from '@/tests/mocks/index.mock'
import { mockUseContractBalance } from '@/tests/mocks/useContractBalance.mock'

// vi.mock('@/artifacts/abi/InvestorV1', () => MOCK_INVESTOR_ABI)
// Constants

const wagmiConfig = createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: http()
  }
})

const memberAddress = '0x000000000000000000000000000000000000dead'
const mockSymbol = ref<string>('shr')
const mockReloadKey = ref<number>(0)
const mockCurrentTeam = ref({
  id: 1,
  ownerAddress: memberAddress,
  teamContracts: [
    {
      type: 'InvestorV1',
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
const mockApproval = ref(parseUnits('10', 6)) // default 10 tokens
const mockBalanceError = ref<null | Error>(null)
const mockAllowanceError = ref<null | Error>(null)
const mockApprovalError = ref<null | Error>(null)

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
      if (functionName === 'approve') {
        return {
          data: mockApproval,
          refetch: vi.fn(),
          error: mockApprovalError
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
vi.mock('@/stores/currencyStore', async (importOriginal) => {
  const original: object = await importOriginal()
  return {
    ...original,
    useCurrencyStore: vi.fn(() => ({ ...mockUseCurrencyStore() }))
  }
})
vi.mock('@/composables/useContractBalance', () => ({
  useContractBalance: vi.fn(() => mockUseContractBalance)
}))

describe('CreateVesting.vue', () => {
  let wrapper: VueWrapper
  const mountComponent = () =>
    mount(CreateVesting, {
      props: {
        reloadKey: mockReloadKey.value,
        tokenAddress: '0x000000000000000000000000000000000000beef'
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn }), [WagmiPlugin, { config: wagmiConfig }]]
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
  describe('Create Vesting Submission', () => {
    beforeEach(async () => {
      // Select member using component events
      const selectMemberInput = wrapper.findComponent(SelectMemberInput)
      await selectMemberInput.setValue({
        name: 'Test User',
        address: '0x000000000000000000000000000000000000dead'
      })

      // Set date range using datepicker
      const datePicker = wrapper.findComponent(Datepicker)
      const startDate = new Date('2025-06-13')
      const endDate = new Date('2025-07-13') // 30 days later
      datePicker.setValue([startDate, endDate])

      // Set cliff and amount
      await wrapper.find('[data-test="cliff"]').setValue(5)
      await wrapper.find('[data-test="total-amount"]').setValue(5)

      await wrapper.vm.$nextTick()
    })
    it('shows error toast when allowance check fails', async () => {
      // Set up the form with valid data first
      const { addErrorToast } = useToastStore()
      // Mock the allowance check error
      mockAllowanceError.value = new Error('Allowance check failed')
      await wrapper.vm.$nextTick()

      await wrapper.find('[data-test="submit-btn"]').trigger('click')
      await wrapper.vm.$nextTick()

      // Now VestingSummary exists
      const summary = wrapper.findComponent({ name: 'VestingSummary' })
      expect(summary.exists()).toBe(true)

      // Simulate confirm
      summary.vm.$emit('confirm')
      await wrapper.vm.$nextTick()

      // // Find and click confirm button in summary view
      // const confirmBtn = wrapper.find('[data-test="confirm-btn"]')
      // await confirmBtn.trigger('click')

      // Verify error toast was shown
      expect(addErrorToast).toHaveBeenCalledWith('error on get Allowance')
      expect(mockWriteContract.writeContract).not.toHaveBeenCalled()
    })
    it('shows error toast when token approval fails', async () => {
      const { addErrorToast } = useToastStore()

      await wrapper.find('[data-test="submit-btn"]').trigger('click')
      await wrapper.vm.$nextTick()

      // Trigger approval
      const summary = wrapper.findComponent({ name: 'VestingSummary' })
      summary.vm.$emit('confirm')
      // const submitBtn = wrapper.find('[data-test="submit-btn"]')
      // await submitBtn.trigger('click')

      await wrapper.vm.$nextTick()

      mockWriteContract.error.value = new Error('Approval failed')

      const confirmBtn = wrapper.find('[data-test="confirm-btn"]')
      await confirmBtn.trigger('click')

      // Verify error toast was shown
      expect(addErrorToast).toHaveBeenCalledWith('Approval failed')
    })

    it('calls writeContract on valid form and tokenApproved=true', async () => {
      // Set up initial conditions
      mockBalance.value = parseUnits('1000', 6)
      mockAllowance.value = parseUnits('1000', 6)

      await wrapper.vm.$nextTick()

      // Fill required fields
      const selectMemberInput = wrapper.findComponent(SelectMemberInput)
      await selectMemberInput.setValue({
        name: 'Test User',
        address: '0x120000000000000000000000000000000000dead'
      })

      // Set date range
      const datePicker = wrapper.findComponent(Datepicker)
      const startDate = new Date('2025-06-13')
      const endDate = new Date('2025-07-13')
      await datePicker.setValue([startDate, endDate])

      // Set duration inputs

      // Set cliff and amount
      await wrapper.find('[data-test="cliff"]').setValue(5)
      await wrapper.find('[data-test="total-amount"]').setValue(5)

      await wrapper.vm.$nextTick()

      // Submit to show summary
      const submitBtn = wrapper.find('[data-test="submit-btn"]')
      expect(submitBtn.attributes('disabled')).toBeUndefined()
      await submitBtn.trigger('click')

      await wrapper.vm.$nextTick()

      // Click confirm in summary
      const confirmBtn = wrapper.find('[data-test="confirm-btn"]')
      await confirmBtn.trigger('click')
      // Force formValid to be true regardless of inputs

      // First, verify approve was called
      expect(mockWriteContract.writeContract).toHaveBeenCalledWith({
        address: '0x000000000000000000000000000000000000beef', // tokenAddress from props
        abi: INVESTOR_ABI,
        functionName: 'approve',
        args: [VESTING_ADDRESS, parseEther('5')]
      })

      mockWaitForReceipt.isLoading.value = true
      await wrapper.vm.$nextTick()
      mockWaitForReceipt.isSuccess.value = true
      mockWaitForReceipt.isLoading.value = false
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(mockWriteContract.writeContract).toHaveBeenCalled()

      mockWaitForReceipt.isLoading.value = true
      await wrapper.vm.$nextTick()
      mockWaitForReceipt.isSuccess.value = true
      mockWaitForReceipt.isLoading.value = false
      await wrapper.vm.$nextTick()

      // const selectMemberInputAfter = wrapper.findComponent(SelectMemberInput)
      // expect(selectMemberInputAfter.props('modelValue')).toEqual({ name: '', address: '' })
      expect((wrapper.find('[data-test="total-amount"]').element as HTMLInputElement).value).toBe(
        '0'
      )
      expect((wrapper.find('[data-test="cliff"]').element as HTMLInputElement).value).toBe('0')
    })
    it('does not show error toast when errorAddVesting is falsy', async () => {
      const { addErrorToast } = useToastStore()
      mockWriteContract.error.value = null
      expect(addErrorToast).not.toHaveBeenCalled()
    })

    it('does not show error toast when getAllowance is falsy', async () => {
      const { addErrorToast } = useToastStore()
      mockAllowanceError.value = null
      expect(addErrorToast).not.toHaveBeenCalled()
    })

    it('prevents submission when form is invalid', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.find('[data-test="total-amount"]').setValue(0)
      await wrapper.vm.$nextTick()
      // Submit form
      const submitBtn = wrapper.find('[data-test="submit-btn"]')
      await submitBtn.trigger('click')
      await wrapper.vm.$nextTick()
      // Click confirm in summary
      // Trigger approval
      const summary = wrapper.findComponent({ name: 'VestingSummary' })
      expect(summary.exists()).toBe(false)
      // Verify contract write was not called due to invalid form
      expect(mockWriteContract.writeContract).not.toHaveBeenCalled()
    })

    it('shows error toast when adding vesting fails', async () => {
      const { addErrorToast } = useToastStore()
      // Set up form values
      await wrapper.vm.$nextTick()
      // Simulate error when adding vesting
      mockWriteContract.error.value = new Error('Add vesting failed')
      // Submit form
      const submitBtn = wrapper.find('[data-test="submit-btn"]')

      await submitBtn.trigger('click')

      await wrapper.vm.$nextTick()

      // Click confirm in summary
      const confirmBtn = wrapper.find('[data-test="confirm-btn"]')
      await confirmBtn.trigger('click')
      // Verify error toast was shown
      expect(addErrorToast).toHaveBeenCalledWith('Add vesting failed')
    })

    it('shows error toast when member already has active vesting', async () => {
      const { addErrorToast } = useToastStore()
      // Set member address that matches existing vesting
      const selectMemberInput = wrapper.findComponent(SelectMemberInput)
      await selectMemberInput.vm.$emit('selectMember', {
        name: 'Test User',
        address: memberAddress
      })
      await wrapper.vm.$nextTick()
      // Submit form
      mockWriteContract.error.value = new Error('Add vesting failed')
      // Submit form
      const submitBtn = wrapper.find('[data-test="submit-btn"]')

      await submitBtn.trigger('click')

      await wrapper.vm.$nextTick()

      // Click confirm in summary
      const confirmBtn = wrapper.find('[data-test="confirm-btn"]')
      await confirmBtn.trigger('click')
      // Verify duplicate check prevented submission and showed error
      expect(addErrorToast).toHaveBeenCalledWith(
        'The member address already has an active vesting.'
      )
      expect(mockWriteContract.writeContract).not.toHaveBeenCalled()
    })

    it('skips balance check when tokenBalance is undefined', async () => {
      const { addErrorToast } = useToastStore()
      // Force token balance to be undefined
      mockBalance.value = undefined
      // Fill out the form with valid data

      const selectMemberInput = wrapper.findComponent(SelectMemberInput)
      await selectMemberInput.setValue({
        name: 'Test User',
        address: '0x120000000000000000000000000000000000dead'
      })
      await wrapper.vm.$nextTick()
      // Submit the form
      await wrapper.find('[data-test="submit-btn"]').trigger('click')
      await wrapper.vm.$nextTick()
      wrapper.find('[data-test="confirm-btn"]').trigger('click')
      await wrapper.vm.$nextTick()
      // This would mean the balance check branch was skipped
      expect(addErrorToast).not.toHaveBeenCalledWith('Insufficient token balance')
      // The next step (e.g. allowance check or vesting call) happens
      expect(mockWriteContract.writeContract).toHaveBeenCalled()
    })
  })
})
