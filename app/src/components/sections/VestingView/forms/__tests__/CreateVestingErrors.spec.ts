import { describe, it, vi, expect, beforeEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import { CalendarDate } from '@internationalized/date'
import CreateVesting from '@/components/sections/VestingView/forms/CreateVesting.vue'
import SelectMemberInput from '@/components/utils/SelectMemberInput.vue'
import { mockVestingWrites } from '@/tests/mocks/contract.mock'

const mockReloadKey = ref<number>(0)
const mockResolvedVestingAddress = ref('0x1000000000000000000000000000000000000001' as const)

type VestingInfosType = [string[], object[]] | [string[]] | [] | null | undefined
const mockVestingInfos = ref<VestingInfosType>([[], []])

vi.mock('@/composables/vesting/reads', () => ({
  useVestingAddress: vi.fn(() => mockResolvedVestingAddress),
  useVestingGetVestingsWithMembers: vi.fn(() => ({
    data: mockVestingInfos,
    error: ref(null),
    refetch: vi.fn()
  }))
}))

const mountComponent = () =>
  mount(CreateVesting, {
    props: {
      reloadKey: mockReloadKey.value
    },
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })]
    }
  })

type MutateOpts = { onSuccess?: () => void; onError?: (e: Error) => void }

describe('CreateVesting.vue — submission error branches', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    vi.clearAllMocks()
    mockVestingInfos.value = [[], []]
    mockResolvedVestingAddress.value = '0x1000000000000000000000000000000000000001'
    // Default: addVesting.mutate succeeds so post-submit code paths run.
    mockVestingWrites.addVesting.mutate.mockImplementation((_args: unknown, options?: MutateOpts) =>
      options?.onSuccess?.()
    )
  })

  /**
   * Drive the form through real DOM interactions: member selection,
   * date range pick on the UCalendar, amount input. Then click submit
   * to land on the summary view and confirm — which triggers submit().
   */
  const driveUi = async (opts: {
    addVestingOnError?: Error
    member: { name: string; address: string }
    totalAmount: number
  }) => {
    if (opts.addVestingOnError) {
      mockVestingWrites.addVesting.mutate.mockImplementationOnce(
        (_args: unknown, options?: MutateOpts) => options?.onError?.(opts.addVestingOnError!)
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

    // 5. Confirm in summary -> submit() -> addVesting write
    await wrapper.find('[data-test="confirm-btn"]').trigger('click')
    await wrapper.vm.$nextTick()

    return wrapper.find('[data-test="summary-error-alert"]').text()
  }

  it('renders the summary error alert when the addVesting write fails', async () => {
    const message = await driveUi({
      addVestingOnError: new Error('addVesting boom'),
      member: { name: 'Hank', address: '0x5555555555555555555555555555555555555555' },
      totalAmount: 5
    })
    expect(message).toContain('Add vesting failed')
  })

  it('renders the duplicate-member alert and skips the write for an active member', async () => {
    mockVestingInfos.value = [
      ['0x6666666666666666666666666666666666666666'],
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
    ]

    const message = await driveUi({
      member: { name: 'Iris', address: '0x6666666666666666666666666666666666666666' },
      totalAmount: 5
    })

    expect(message).toContain('The member address already has an active vesting.')
    expect(mockVestingWrites.addVesting.mutate).not.toHaveBeenCalled()
  })
})
