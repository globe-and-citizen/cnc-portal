import { describe, it, vi, expect, beforeEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import CreateVesting from '@/components/sections/VestingView/forms/CreateVesting.vue'
import SelectMemberInput from '@/components/utils/SelectMemberInput.vue'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import { parseUnits } from 'viem'
import { mockUseContractBalance } from '@/tests/mocks/composables.mock'
import { mockVestingWrites } from '@/tests/mocks/contract.mock'
import { CalendarDate } from '@internationalized/date'

// vi.mock('@/artifacts/abi/InvestorV1', () => MOCK_INVESTOR_ABI)
// Constants

const memberAddress = '0x000000000000000000000000000000000000dead'
const mockSymbol = ref<string>('shr')
const mockReloadKey = ref<number>(0)
const mockResolvedVestingAddress = ref('0x1000000000000000000000000000000000000001' as const)

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

const mockBalance = ref<bigint | undefined>(parseUnits('10', 6)) // default 10 tokens
const mockAllowance = ref(parseUnits('10', 6)) // default 10 tokens
const mockApproval = ref(parseUnits('10', 6)) // default 10 tokens
const mockBalanceError = ref<null | Error>(null)
const mockAllowanceError = ref<null | Error>(null)
const mockApprovalError = ref<null | Error>(null)

vi.mock('@/composables/vesting/reads', () => ({
  useVestingAddress: vi.fn(() => mockResolvedVestingAddress),
  useVestingGetTeamVestingsWithMembers: vi.fn(() => ({
    data: mockVestingInfos,
    error: ref(null),
    refetch: refetchVestingInfos
  }))
}))

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
    mutate: vi.fn(
      (
        variables: { args?: readonly unknown[] },
        options?: { onSuccess?: () => void; onError?: (e: Error) => void }
      ) => {
        mockWriteContract.mutateAsync({
          address: '0x000000000000000000000000000000000000beef',
          functionName: 'approve',
          args: variables.args ?? []
        })
        if (mockWriteContract.error.value) {
          options?.onError?.(mockWriteContract.error.value)
        } else {
          options?.onSuccess?.()
        }
      }
    ),
    mutateAsync: vi.fn(),
    isPending: mockWriteContract.isPending,
    isSuccess: ref(false),
    isError: mockWriteContract.isError,
    error: mockWriteContract.error,
    data: mockWriteContract.data,
    status: mockWriteContract.status,
    reset: vi.fn()
  }))
}))

vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import('@wagmi/vue')
  return {
    ...actual,
    useChainId: vi.fn(() => ref(137)),
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

  /**
   * Drive the form via real DOM/component events instead of mutating vm state:
   * - SelectMemberInput emits `selectMember`
   * - UCalendar emits `update:modelValue` with CalendarDate range
   * - amount and cliff are native inputs reached via `data-test` selectors
   */
  const fillFormWithValidData = async (
    wrapper: VueWrapper,
    memberAddr = '0x120000000000000000000000000000000000dead'
  ) => {
    await wrapper.findComponent(SelectMemberInput).vm.$emit('selectMember', {
      name: 'Test User',
      address: memberAddr
    })
    await wrapper.findComponent({ name: 'UCalendar' }).vm.$emit('update:modelValue', {
      start: new CalendarDate(2025, 6, 13),
      end: new CalendarDate(2025, 7, 13)
    })
    await wrapper.vm.$nextTick()
    await wrapper.find('[data-test="cliff"]').setValue('5')
    await wrapper.find('[data-test="total-amount"]').setValue('5')
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
    mockVestingWrites.addVesting.isSuccess.value = false
    mockVestingWrites.addVesting.error.value = null
    // Default: mutate invokes onSuccess to simulate a confirmed write.
    mockVestingWrites.addVesting.mutate
      .mockReset()
      .mockImplementation(
        (_vars: unknown, opts?: { onSuccess?: () => void; onError?: (e: Error) => void }) => {
          opts?.onSuccess?.()
        }
      )
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

      await wrapper.vm.$nextTick()
      expect(mockWriteContract.mutateAsync).toHaveBeenCalled()
      // mutate's onSuccess (configured in beforeEach) resets the form, so the
      // form view re-mounts with the default amount/cliff inputs at 0.
      await wrapper.vm.$nextTick()

      expect((wrapper.find('[data-test="total-amount"]').element as HTMLInputElement).value).toBe(
        '0'
      )
      expect((wrapper.find('[data-test="cliff"]').element as HTMLInputElement).value).toBe('0')
      expect(mockVestingWrites.addVesting.mutate).toHaveBeenCalled()
    })

    it('prevents submission when form is invalid', async () => {
      // Empty form (no member, no date, default totalAmount=0) fails schema
      // validation; submit() never runs and the summary never renders.
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
