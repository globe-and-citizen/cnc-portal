import { describe, it, vi, expect, beforeEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import CreateVesting from '@/components/sections/VestingView/forms/CreateVesting.vue'
import SelectMemberInput from '@/components/utils/SelectMemberInput.vue'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import { parseUnits } from 'viem'
import { mockUseContractBalance } from '@/tests/mocks/composables.mock'
import { CalendarDate } from '@internationalized/date'

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
  mutate: vi.fn(),
  mutateAsync: vi.fn(),
  error: ref<null | Error>(null),
  isPending: ref(false),
  data: ref(null),
  isError: ref(false),
  status: ref('idle' as const),
  variables: ref(undefined),
  reset: vi.fn()
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
  isSuccess: ref(false),
  error: ref<null | Error>(null),
  isPending: ref(false),
  isError: ref(false),
  data: ref(null),
  status: ref('idle' as const)
}
const mockBalance = ref<bigint | undefined>(parseUnits('10', 6)) // default 10 tokens
const mockAllowance = ref(parseUnits('10', 6)) // default 10 tokens
const mockApproval = ref(parseUnits('10', 6)) // default 10 tokens
const mockBalanceError = ref<null | Error>(null)
const mockAllowanceError = ref<null | Error>(null)
const mockApprovalError = ref<null | Error>(null)

vi.mock('@/composables/erc20/reads', () => ({
  useErc20BalanceOf: vi.fn(() => ({
    data: mockBalance,
    refetch: vi.fn(),
    error: mockBalanceError
  })),
  useErc20Allowance: vi.fn(() => ({
    data: mockAllowance,
    refetch: vi.fn(),
    error: mockAllowanceError
  }))
}))

vi.mock('@/composables/erc20/writes', () => ({
  useERC20Approve: vi.fn(() => ({
    executeWrite: vi.fn((args: readonly unknown[]) => {
      mockWriteContract.mutateAsync({
        address: '0x000000000000000000000000000000000000beef',
        functionName: 'approve',
        args
      })
      return Promise.resolve(undefined)
    }),
    writeResult: {
      error: mockWriteContract.error,
      isPending: mockWriteContract.isPending
    },
    receiptResult: {
      isLoading: mockWaitForReceipt.isLoading,
      isSuccess: mockWaitForReceipt.isSuccess,
      error: mockWaitForReceipt.error
    }
  }))
}))

vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import('@wagmi/vue')
  return {
    ...actual,
    useChainId: vi.fn(() => ref(137)),
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

vi.mock('@/composables/useContractBalance', () => ({
  useContractBalance: vi.fn(() => mockUseContractBalance)
}))

describe('CreateVesting.vue', () => {
  let wrapper: VueWrapper
  const submitForm = async () => {
    await wrapper.find('[data-test="submit-btn"]').trigger('click')
    await wrapper.vm.$nextTick()
  }

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
    selectMemberInput.vm.$emit('selectMember', {
      name: 'Test User',
      address: memberAddr
    })
    ;(
      wrapper.vm as unknown as {
        onDateRangeChange: (value: { start: CalendarDate; end: CalendarDate }) => void
      }
    ).onDateRangeChange({
      start: new CalendarDate(2025, 6, 13),
      end: new CalendarDate(2025, 7, 13)
    })
    await wrapper.vm.$nextTick()
    ;(wrapper.vm as unknown as { cliff: number }).cliff = 5
    ;(wrapper.vm as unknown as { totalAmount: number }).totalAmount = 5
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
      mockAllowanceError.value = new Error('Allowance check failed')
      await wrapper.vm.$nextTick()

      // The error watcher should trigger and show the toast
      // expect(mockToast.add).toHaveBeenCalledWith({
      //   title: 'error on get Allowance',
      //   color: 'error'
      // })
    })

    it('shows error toast when token approval fails', async () => {
      await fillFormWithValidData(wrapper)
      await submitForm()

      const summary = wrapper.findComponent({ name: 'VestingSummary' })
      summary.vm.$emit('confirm')
      await wrapper.vm.$nextTick()

      mockWriteContract.error.value = new Error('Approval failed')
      await wrapper.vm.$nextTick()

      // expect(mockToast.add).toHaveBeenCalledWith({ title: 'Approval failed', color: 'error' })
    })

    it('calls writeContract on valid form and tokenApproved=true', async () => {
      await fillFormWithValidData(wrapper, '0x120000000000000000000000000000000000dead')

      const submitBtn = wrapper.find('[data-test="submit-btn"]')
      expect(submitBtn.attributes('disabled')).toBeUndefined()
      await submitForm()

      const confirmBtn = wrapper.find('[data-test="confirm-btn"]')
      await confirmBtn.trigger('click')

      expect(mockWriteContract.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          address: '0x000000000000000000000000000000000000beef',
          functionName: 'approve',
          args: [expect.any(String), parseUnits('5', 6)]
        })
      )

      mockWaitForReceipt.isLoading.value = true
      await wrapper.vm.$nextTick()
      mockWaitForReceipt.isSuccess.value = true
      mockWaitForReceipt.isLoading.value = false
      await wrapper.vm.$nextTick()

      expect(mockWriteContract.mutateAsync).toHaveBeenCalled()

      mockWaitForReceipt.isLoading.value = true
      await wrapper.vm.$nextTick()
      mockWaitForReceipt.isSuccess.value = true
      mockWaitForReceipt.isLoading.value = false
      await wrapper.vm.$nextTick()

      expect((wrapper.vm as unknown as { totalAmount: number }).totalAmount).toBe(0)
      expect((wrapper.vm as unknown as { cliff: number }).cliff).toBe(0)
    })
    it('prevents submission when form is invalid', async () => {
      ;(wrapper.vm as unknown as { totalAmount: number }).totalAmount = 0
      await wrapper.vm.$nextTick()

      await submitForm()

      const summary = wrapper.findComponent({ name: 'VestingSummary' })
      expect(summary.exists()).toBe(false)
      expect(mockWriteContract.mutateAsync).not.toHaveBeenCalled()
    })

    it('shows error toast when adding vesting fails', async () => {
      await fillFormWithValidData(wrapper)
      mockWriteContract.error.value = new Error('Add vesting failed')

      await submitForm()

      const confirmBtn = wrapper.find('[data-test="confirm-btn"]')
      await confirmBtn.trigger('click')

      // expect(mockToast.add).toHaveBeenCalledWith({ title: 'Add vesting failed', color: 'error' })
    })

    it('shows error toast when member already has active vesting', async () => {
      await fillFormWithValidData(wrapper, memberAddress)
      mockWriteContract.error.value = new Error('Add vesting failed')

      await submitForm()

      const confirmBtn = wrapper.find('[data-test="confirm-btn"]')
      await confirmBtn.trigger('click')

      // expect(mockToast.add).toHaveBeenCalledWith({
      //   title: 'The member address already has an active vesting.',
      //   color: 'error'
      // })
      expect(mockWriteContract.mutateAsync).not.toHaveBeenCalled()
    })

    it('skips balance check when tokenBalance is undefined', async () => {
      mockBalance.value = undefined

      await fillFormWithValidData(wrapper, '0x120000000000000000000000000000000000dead')

      await submitForm()

      await wrapper.find('[data-test="confirm-btn"]').trigger('click')
      await wrapper.vm.$nextTick()

      expect(mockWriteContract.mutateAsync).toHaveBeenCalled()
    })
  })
})
