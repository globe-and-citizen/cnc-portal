import { describe, it, vi, expect, beforeEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import { CalendarDate } from '@internationalized/date'
import CreateVesting from '@/components/sections/VestingView/forms/CreateVesting.vue'
import SelectMemberInput from '@/components/utils/SelectMemberInput.vue'
import { mockERC20Reads, mockERC20Writes } from '@/tests/mocks/erc20.mock'
import { mockVestingWrites } from '@/tests/mocks/contract.mock'

const mockReloadKey = ref<number>(0)
const mockResolvedVestingAddress = ref('0x1000000000000000000000000000000000000001' as const)

type VestingInfosType = [string[], object[]] | [string[]] | [] | null | undefined
const mockVestingInfos = ref<VestingInfosType>([[], []])

vi.mock('@/composables/vesting/reads', () => ({
  useVestingAddress: vi.fn(() => mockResolvedVestingAddress),
  useVestingGetTeamVestingsWithMembers: vi.fn(() => ({
    data: mockVestingInfos,
    error: ref(null),
    refetch: vi.fn()
  }))
}))

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

type ApproveOpts = { onSuccess?: () => void; onError?: (e: Error) => void }

describe('CreateVesting.vue — submission error branches', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    vi.clearAllMocks()
    mockVestingInfos.value = [[], []]
    mockResolvedVestingAddress.value = '0x1000000000000000000000000000000000000001'
    mockERC20Reads.balanceOf.data.value = 1000n * 10n ** 18n
    mockERC20Reads.allowance.data.value = 1000000n * 10n ** 18n
    // Default: approve.mutate succeeds so flows that reach submit() actually do.
    mockERC20Writes.approve.mutate.mockImplementation((_args: unknown, options?: ApproveOpts) =>
      options?.onSuccess?.()
    )
    // Default: addVesting.mutate succeeds so post-submit code paths run.
    mockVestingWrites.addVesting.mutate.mockImplementation(
      (_args: unknown, options?: ApproveOpts) => options?.onSuccess?.()
    )
  })

  /**
   * Drive the form through real DOM interactions: member selection,
   * date range pick on the UCalendar, amount input. Then click submit
   * to land on the summary view and confirm — which triggers
   * approveAllowance() → (on success) submit().
   */
  const driveUi = async (opts: {
    vestingAddress?: `0x${string}`
    balance?: bigint
    allowance?: bigint
    approveOnError?: Error
    addVestingOnError?: Error
    member: { name: string; address: string }
    totalAmount: number
  }) => {
    if (opts.vestingAddress) mockResolvedVestingAddress.value = opts.vestingAddress
    if (opts.balance !== undefined) mockERC20Reads.balanceOf.data.value = opts.balance
    if (opts.allowance !== undefined) mockERC20Reads.allowance.data.value = opts.allowance
    if (opts.approveOnError) {
      mockERC20Writes.approve.mutate.mockImplementationOnce(
        (_args: unknown, options?: ApproveOpts) => options?.onError?.(opts.approveOnError!)
      )
    }
    if (opts.addVestingOnError) {
      mockVestingWrites.addVesting.mutate.mockImplementationOnce(
        (_args: unknown, options?: ApproveOpts) => options?.onError?.(opts.addVestingOnError!)
      )
    }
    wrapper = mountComponent()

    // 1. Select member via SelectMemberInput
    await wrapper.findComponent(SelectMemberInput).vm.$emit('selectMember', opts.member)

    // 2. Pick a date range via UCalendar
    await wrapper.findComponent({ name: 'UCalendar' }).vm.$emit('update:modelValue', {
      start: new CalendarDate(2025, 6, 1),
      end: new CalendarDate(2025, 6, 30)
    })

    // 3. Set total amount via the input
    await wrapper.find('[data-test="total-amount"]').setValue(String(opts.totalAmount))
    await wrapper.vm.$nextTick()

    // 4. Submit form -> shows summary
    await wrapper.find('[data-test="submit-btn"]').trigger('click')
    await wrapper.vm.$nextTick()

    // 5. Confirm in summary -> approveAllowance() -> (on approve success) submit()
    await wrapper.find('[data-test="confirm-btn"]').trigger('click')
    await wrapper.vm.$nextTick()

    return wrapper.find('[data-test="summary-error-alert"]').text()
  }

  it.each([
    {
      label: 'invalid vesting spender address',
      vestingAddress: 'not-an-address' as unknown as `0x${string}`,
      member: { name: 'Dave', address: '0x1111111111111111111111111111111111111111' },
      totalAmount: 5,
      expected: 'Invalid vesting contract address'
    },
    {
      label: 'approve mutation onError',
      approveOnError: new Error('approve boom'),
      member: { name: 'Greta', address: '0x4444444444444444444444444444444444444444' },
      totalAmount: 5,
      expected: 'Approval failed'
    },
    {
      label: 'insufficient allowance in submit()',
      allowance: 1n,
      member: { name: 'Frank', address: '0x3333333333333333333333333333333333333333' },
      totalAmount: 5,
      expected: 'Allowance is less than the total amount'
    },
    {
      label: 'addVesting mutation onError',
      addVestingOnError: new Error('addVesting boom'),
      member: { name: 'Hank', address: '0x5555555555555555555555555555555555555555' },
      totalAmount: 5,
      expected: 'Add vesting failed'
    }
  ])('renders summary error alert for $label', async ({ expected, ...scenario }) => {
    const message = await driveUi(scenario)
    expect(message).toContain(expected)
  })

  // The submit()-level "Insufficient token balance" branch is defense-in-depth:
  // the Zod schema already rejects `totalAmount > connectedUserTokenBalance` and
  // the schema/bigint paths read the same underlying source, so any UI input that
  // would reach submit() with a low balance is filtered before the summary loads.
  // The branch is therefore unreachable via the form UI. We exercise it by
  // calling submit() directly to retain coverage of the guard.
  it('sets errorMessage when submit() runs with insufficient bigint balance', async () => {
    mockERC20Reads.balanceOf.data.value = 1n
    wrapper = mountComponent()

    // Pre-populate the reactive fields the guard reads (member, totalAmount) so
    // submit() reaches the balance check. We can't drive this via the form
    // because the schema would reject it first.
    /* eslint-disable-next-line no-restricted-syntax -- defense-in-depth branch
       unreachable via UI; see comment above. */
    const vm = wrapper.vm as unknown as {
      member: { name: string; address: string }
      totalAmount: number
      errorMessage: string
      submit: () => Promise<void>
    }
    vm.member = { name: 'Eve', address: '0x2222222222222222222222222222222222222222' }
    vm.totalAmount = 5
    await wrapper.vm.$nextTick()

    await vm.submit()
    await wrapper.vm.$nextTick()

    expect(vm.errorMessage).toBe('Insufficient token balance')
  })
})
