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
import { mockUseContractBalance } from '@/tests/mocks/composables.mock'

// vi.mock('@/artifacts/abi/InvestorV1', () => MOCK_INVESTOR_ABI)
// Constants

const memberAddress = '0x000000000000000000000000000000000000dead'
const mockSymbol = ref<string>('shr')
const mockReloadKey = ref<number>(0)
// const mockCurrentTeam = ref({
//   id: 1,
//   ownerAddress: memberAddress,
//   teamContracts: [
//     {
//       type: 'InvestorV1',
//       address: '0x000000000000000000000000000000000000beef'
//     }
//   ]
// })

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
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })

  const fillFormWithValidData = async (
    wrapper: VueWrapper,
    memberAddr = '0x120000000000000000000000000000000000dead'
  ) => {
    const selectMemberInput = wrapper.findComponent(SelectMemberInput)
    await selectMemberInput.setValue({
      name: 'Test User',
      address: memberAddr
    })

    const datePicker = wrapper.findComponent(Datepicker)
    const startDate = new Date('2025-06-13')
    const endDate = new Date('2025-07-13')
    await datePicker.setValue([startDate, endDate])

    await wrapper.find('[data-test="cliff"]').setValue(5)
    await wrapper.find('[data-test="total-amount"]').setValue(5)
    await wrapper.vm.$nextTick()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockBalance.value = parseUnits('1000', 6)
    mockAllowance.value = parseUnits('1000', 6)
    mockAllowanceError.value = null
    mockBalanceError.value = null
    mockApprovalError.value = null
    mockWriteContract.error.value = null
    mockWaitForReceipt.isLoading.value = false
    mockWaitForReceipt.isSuccess.value = false
    wrapper = mountComponent()
  })

  describe('Create Vesting Submission', () => {
    it('shows error toast when allowance check fails', async () => {
      const { addErrorToast } = useToastStore()
      mockAllowanceError.value = new Error('Allowance check failed')
      await wrapper.vm.$nextTick()

      // The error watcher should trigger and show the toast
      expect(addErrorToast).toHaveBeenCalledWith('error on get Allowance')
    })

    it('shows error toast when token approval fails', async () => {
      const { addErrorToast } = useToastStore()

      await fillFormWithValidData(wrapper)
      await wrapper.find('[data-test="submit-btn"]').trigger('click')
      await wrapper.vm.$nextTick()

      const summary = wrapper.findComponent({ name: 'VestingSummary' })
      summary.vm.$emit('confirm')
      await wrapper.vm.$nextTick()

      mockWriteContract.error.value = new Error('Approval failed')
      await wrapper.vm.$nextTick()

      expect(addErrorToast).toHaveBeenCalledWith('Approval failed')
    })

    it('calls writeContract on valid form and tokenApproved=true', async () => {
      await fillFormWithValidData(wrapper, '0x120000000000000000000000000000000000dead')

      const submitBtn = wrapper.find('[data-test="submit-btn"]')
      expect(submitBtn.attributes('disabled')).toBeUndefined()
      await submitBtn.trigger('click')
      await wrapper.vm.$nextTick()

      const confirmBtn = wrapper.find('[data-test="confirm-btn"]')
      await confirmBtn.trigger('click')

      expect(mockWriteContract.writeContract).toHaveBeenCalledWith({
        address: '0x000000000000000000000000000000000000beef',
        abi: INVESTOR_ABI,
        functionName: 'approve',
        args: [VESTING_ADDRESS, parseEther('5')]
      })

      mockWaitForReceipt.isLoading.value = true
      await wrapper.vm.$nextTick()
      mockWaitForReceipt.isSuccess.value = true
      mockWaitForReceipt.isLoading.value = false
      await wrapper.vm.$nextTick()

      expect(mockWriteContract.writeContract).toHaveBeenCalled()

      mockWaitForReceipt.isLoading.value = true
      await wrapper.vm.$nextTick()
      mockWaitForReceipt.isSuccess.value = true
      mockWaitForReceipt.isLoading.value = false
      await wrapper.vm.$nextTick()

      expect((wrapper.find('[data-test="total-amount"]').element as HTMLInputElement).value).toBe(
        '0'
      )
      expect((wrapper.find('[data-test="cliff"]').element as HTMLInputElement).value).toBe('0')
    })
    it('prevents submission when form is invalid', async () => {
      await wrapper.find('[data-test="total-amount"]').setValue(0)
      await wrapper.vm.$nextTick()

      const submitBtn = wrapper.find('[data-test="submit-btn"]')
      await submitBtn.trigger('click')
      await wrapper.vm.$nextTick()

      const summary = wrapper.findComponent({ name: 'VestingSummary' })
      expect(summary.exists()).toBe(false)
      expect(mockWriteContract.writeContract).not.toHaveBeenCalled()
    })

    it('shows error toast when adding vesting fails', async () => {
      const { addErrorToast } = useToastStore()

      await fillFormWithValidData(wrapper)
      mockWriteContract.error.value = new Error('Add vesting failed')

      const submitBtn = wrapper.find('[data-test="submit-btn"]')
      await submitBtn.trigger('click')
      await wrapper.vm.$nextTick()

      const confirmBtn = wrapper.find('[data-test="confirm-btn"]')
      await confirmBtn.trigger('click')

      expect(addErrorToast).toHaveBeenCalledWith('Add vesting failed')
    })

    it('shows error toast when member already has active vesting', async () => {
      const { addErrorToast } = useToastStore()

      await fillFormWithValidData(wrapper, memberAddress)
      mockWriteContract.error.value = new Error('Add vesting failed')

      const submitBtn = wrapper.find('[data-test="submit-btn"]')
      await submitBtn.trigger('click')
      await wrapper.vm.$nextTick()

      const confirmBtn = wrapper.find('[data-test="confirm-btn"]')
      await confirmBtn.trigger('click')

      expect(addErrorToast).toHaveBeenCalledWith(
        'The member address already has an active vesting.'
      )
      expect(mockWriteContract.writeContract).not.toHaveBeenCalled()
    })

    it('skips balance check when tokenBalance is undefined', async () => {
      const { addErrorToast } = useToastStore()
      mockBalance.value = undefined

      await fillFormWithValidData(wrapper, '0x120000000000000000000000000000000000dead')

      await wrapper.find('[data-test="submit-btn"]').trigger('click')
      await wrapper.vm.$nextTick()

      await wrapper.find('[data-test="confirm-btn"]').trigger('click')
      await wrapper.vm.$nextTick()

      expect(addErrorToast).not.toHaveBeenCalledWith('Insufficient token balance')
      expect(mockWriteContract.writeContract).toHaveBeenCalled()
    })
  })
})
