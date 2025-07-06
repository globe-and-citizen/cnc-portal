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

describe('CreateVesting.vue', () => {
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
      // Check for member selection
      expect(wrapper.find('[data-test="member"]').exists()).toBe(true)

      // Check for date range picker
      expect(wrapper.find('[data-test="date-range"]').exists()).toBe(true)

      // Check for duration inputs
      expect(wrapper.find('[data-test="duration-years"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="duration-month"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="duration-days"]').exists()).toBe(true)

      // Check for amount and cliff inputs
      expect(wrapper.find('[data-test="total-amount"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="cliff"]').exists()).toBe(true)

      // Check for submit button
      expect(wrapper.find('[data-test="submit-btn"]').exists()).toBe(true)
    })
    it('shows error on invalid member address', async () => {
      // Find the SelectMemberInput component and trigger input event
      const selectMemberInput = wrapper.findComponent(SelectMemberInput)
      selectMemberInput.vm.$emit('update:modelValue', {
        name: 'Invalid',
        address: 'notanaddress'
      })

      // Simulate member selection
      selectMemberInput.vm.$emit('selectMember', {
        name: 'Invalid',
        address: 'notanaddress'
      })

      await wrapper.vm.$nextTick()

      // Check for error message
      expect(wrapper.text()).toContain('Please enter a valid Ethereum address.')
    })
  })
  describe('Allowance Approval', () => {
    it('calls approveAllowance when submitting with valid amount', async () => {
      // Fill required fields
      const selectMemberInput = wrapper.findComponent(SelectMemberInput)
      selectMemberInput.vm.$emit('selectMember', {
        name: 'Test User',
        address: '0x120000000000000000000000000000000000dead'
      })

      // Set amount
      await wrapper.find('[data-test="total-amount"]').setValue(10)

      // Set date range (required for valid form)
      const datePicker = wrapper.findComponent(Datepicker)
      datePicker.vm.$emit('update:modelValue', [new Date(), new Date()])

      // Click submit to show summary
      const submitBtn = wrapper.find('[data-test="submit-btn"]')
      expect(submitBtn.attributes('disabled')).toBeUndefined()
      await submitBtn.trigger('click')

      await wrapper.vm.$nextTick()

      // Now in summary view, confirm vesting creation
      const confirmBtn = wrapper.find('[data-test="confirm-btn"]')
      await confirmBtn.trigger('click')

      // Verify approve token was called with correct arguments
      expect(mockWriteContract.writeContract).toHaveBeenCalledWith({
        address: '0x000000000000000000000000000000000000beef', // tokenAddress from props
        abi: INVESTOR_ABI,
        functionName: 'approve',
        args: [
          VESTING_ADDRESS,
          parseEther('10') // amount we set
        ]
      })
    })

    it('shows error when attempting to approve with zero amount', async () => {
      const { addErrorToast } = useToastStore()

      // Fill all required fields
      const selectMemberInput = wrapper.findComponent(SelectMemberInput)
      selectMemberInput.vm.$emit('selectMember', {
        name: 'Test User',
        address: '0x120000000000000000000000000000000000dead'
      })

      // Set valid duration
      await wrapper.find('[data-test="duration-years"]').setValue(1)

      // Set date range
      const datePicker = wrapper.findComponent(Datepicker)
      datePicker.vm.$emit('update:modelValue', [new Date(), new Date()])

      // Set cliff
      await wrapper.find('[data-test="cliff"]').setValue(0)

      // Set amount to 0
      await wrapper.find('[data-test="total-amount"]').setValue(0)

      await wrapper.vm.$nextTick()

      // Check that submit button is disabled
      const submitBtn = wrapper.find('[data-test="submit-btn"]')

      expect(submitBtn.attributes('class')).toContain('btn-disabled')

      // Try to submit anyway
      await submitBtn.trigger('click')

      // Verify no actions were taken
      expect(addErrorToast).not.toHaveBeenCalled()
      expect(mockWriteContract.writeContract).not.toHaveBeenCalled()
    })
  })
})
