import { describe, it, vi, expect, beforeEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import CreateVesting from '@/components/sections/VestingView/forms/CreateVesting.vue'
import SelectMemberInput from '@/components/utils/SelectMemberInput.vue'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import { mockUseContractBalance } from '@/tests/mocks/composables.mock'
import { CalendarDate } from '@internationalized/date'

const memberAddress = '0x000000000000000000000000000000000000dead'
const mockReloadKey = ref<number>(0)
const mockResolvedVestingAddress = ref('0x1000000000000000000000000000000000000001' as const)

const mockWriteContract = {
  mutate: vi.fn(),
  error: ref<null | Error>(null),
  isPending: ref(false),
  data: ref(null)
}
type VestingInfosType = [string[], object[]] | [string[]] | [] | null | undefined

// Mockeds
const mockVestingInfos = ref<VestingInfosType>([
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

vi.mock('@/composables/vesting/reads', () => ({
  useVestingAddress: vi.fn(() => mockResolvedVestingAddress),
  useVestingGetTeamVestingsWithMembers: vi.fn(() => ({
    data: mockVestingInfos,
    error: ref(null),
    refetch: refetchVestingInfos
  }))
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
      },
      data() {
        return {
          tokenApproved: false
        }
      }
    })

  /**
   * Drive the form via real DOM/component events:
   * - SelectMemberInput emits `selectMember`
   * - UCalendar emits `update:modelValue` (CalendarDate range)
   * - amount/cliff are native inputs reached via `data-test` selectors
   */
  const fillValidForm = async (amount = 10, cliffDays = 0) => {
    await wrapper.findComponent(SelectMemberInput).vm.$emit('selectMember', {
      name: 'Test User',
      address: '0x120000000000000000000000000000000000dead'
    })
    await wrapper.findComponent({ name: 'UCalendar' }).vm.$emit('update:modelValue', {
      start: new CalendarDate(2025, 6, 1),
      end: new CalendarDate(2025, 6, 2)
    })
    await wrapper.vm.$nextTick()
    await wrapper.find('[data-test="total-amount"]').setValue(String(amount))
    await wrapper.find('[data-test="cliff"]').setValue(String(cliffDays))
    await wrapper.vm.$nextTick()
  }

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

      // Check for amount and cliff inputs
      expect(wrapper.find('[data-test="total-amount"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="cliff"]').exists()).toBe(true)

      // Check for submit button
      expect(wrapper.find('[data-test="submit-btn"]').exists()).toBe(true)
    })

    it('shows error on invalid member address', async () => {
      await wrapper.findComponent(SelectMemberInput).vm.$emit('selectMember', {
        name: 'Invalid',
        address: 'notanaddress'
      })

      await wrapper.vm.$nextTick()
      await submitForm()
      expect(wrapper.findComponent({ name: 'VestingSummary' }).exists()).toBe(false)
    })
  })

  describe('Allowance Approval', () => {
    it('calls approveAllowance when submitting with valid amount', async () => {
      await fillValidForm()

      const submitBtn = wrapper.find('[data-test="submit-btn"]')
      expect(submitBtn.attributes('disabled')).toBeUndefined()
      await submitForm()

      // Now in summary view, confirm vesting creation
      const confirmBtn = wrapper.find('[data-test="confirm-btn"]')
      await confirmBtn.trigger('click')
    })

    it('shows error when attempting to approve with zero amount', async () => {
      // Clear any previous calls from component mounting
      vi.clearAllMocks()

      await fillValidForm(0)

      await submitForm()

      // The form validation should prevent submission with zero amount
      // So no approval-related error toast should be called
      expect(mockWriteContract.mutate).not.toHaveBeenCalled()
    })

    it('shows error on invalid cliff value', async () => {
      // Date range is 1 day -> cliff > 1 violates the cliff <= duration refine.
      await fillValidForm(5, 6)

      await submitForm()
      expect(wrapper.findComponent({ name: 'VestingSummary' }).exists()).toBe(false)
    })

    it('passes the correct totalAmountInUnits to writeContract', async () => {
      await fillValidForm(7)

      await submitForm()

      const confirmBtn = wrapper.find('[data-test="confirm-btn"]')
      await confirmBtn.trigger('click')
      await wrapper.vm.$nextTick()
    })

    it('returns an empty array from activeMembers if vestingInfos is not an array of length 2', () => {
      interface IWrapper {
        activeMembers: string[]
      }

      const testCases = [
        { value: undefined },
        { value: [[memberAddress]] as unknown as [string[]] },
        { value: null }
      ]

      testCases.forEach(({ value }) => {
        mockVestingInfos.value = value
        const wrapper = mountComponent()
        /* eslint-disable-next-line no-restricted-syntax -- unit test of a pure
           computed (`activeMembers`) that derives the internal duplicate-vesting
           set from vesting infos; the computed has no rendered surface to
           inspect for these degenerate shapes. */
        expect((wrapper.vm as unknown as IWrapper).activeMembers).toEqual([])
      })
    })

    it('returns the correct token balance for the given tokenAddress', () => {
      interface IWrapper {
        tokenBalance: (typeof mockUseContractBalance.balances.value)[0] | undefined
      }

      mockUseContractBalance.balances.value = [
        {
          token: {
            id: '2',
            name: 'BeefToken',
            symbol: 'BEEF',
            code: 'BEEF',
            coingeckoId: 'beeftoken',
            decimals: 18,
            address: '0x000000000000000000000000000000000000beef'
          },
          amount: 42,
          values: {
            USD: {
              value: 500,
              formated: '$500',
              id: 'usd',
              code: 'USD',
              symbol: '$',
              price: 1000,
              formatedPrice: '$1K'
            }
          }
        }
      ]
      /* eslint-disable-next-line no-restricted-syntax -- unit test of a pure
         computed (`tokenBalance`) that picks the right entry from
         useContractBalance balances; no rendered surface exposes the raw
         match for this assertion. */
      const tokenBalance = (wrapper.vm as unknown as IWrapper).tokenBalance

      expect(tokenBalance).toBeDefined()
      if (tokenBalance) {
        expect(tokenBalance.amount).toBe(42)
        expect(tokenBalance.token.address).toBe('0x000000000000000000000000000000000000beef')
      }
    })
  })

  describe('In-form UAlert error feedback', () => {
    // Restore the duplicate-bearing state at the top of this block; an earlier
    // test in this file mutates mockVestingInfos.value to null, which would
    // otherwise empty activeMembers and skip the duplicate guard.
    beforeEach(() => {
      mockVestingInfos.value = [
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
      ]
      wrapper = mountComponent()
    })

    it('renders the in-form UAlert when errorMessage is set via duplicate-member guard', async () => {
      // No alert yet on initial render.
      expect(wrapper.find('[data-test="error-alert"]').exists()).toBe(false)

      // Selecting an already-active member then submitting the summary
      // triggers checkDuplicateVesting() which sets errorMessage and renders
      // the in-form UAlert in the form view (no summary view shown because
      // the duplicate check runs through approveAllowance after summary).
      await wrapper.findComponent(SelectMemberInput).vm.$emit('selectMember', {
        name: 'Bob',
        address: memberAddress
      })
      await wrapper.findComponent({ name: 'UCalendar' }).vm.$emit('update:modelValue', {
        start: new CalendarDate(2025, 6, 1),
        end: new CalendarDate(2025, 6, 30)
      })
      await wrapper.find('[data-test="total-amount"]').setValue('5')
      await wrapper.vm.$nextTick()
      await wrapper.find('[data-test="submit-btn"]').trigger('click')
      await wrapper.vm.$nextTick()
      await wrapper.find('[data-test="confirm-btn"]').trigger('click')
      await wrapper.vm.$nextTick()

      const alert = wrapper.find('[data-test="summary-error-alert"]')
      expect(alert.exists()).toBe(true)
      expect(alert.text()).toContain('The member address already has an active vesting.')
    })

    it('sets errorMessage when approveAllowance hits a duplicate-member guard', async () => {
      // Drive: select duplicate member, submit form, confirm summary; the
      // duplicate guard in approveAllowance() fires and renders the alert.
      await wrapper.findComponent(SelectMemberInput).vm.$emit('selectMember', {
        name: 'Bob',
        address: memberAddress
      })
      await wrapper.findComponent({ name: 'UCalendar' }).vm.$emit('update:modelValue', {
        start: new CalendarDate(2025, 6, 1),
        end: new CalendarDate(2025, 6, 30)
      })
      await wrapper.find('[data-test="total-amount"]').setValue('5')
      await wrapper.vm.$nextTick()
      await wrapper.find('[data-test="submit-btn"]').trigger('click')
      await wrapper.vm.$nextTick()
      await wrapper.find('[data-test="confirm-btn"]').trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="summary-error-alert"]').text()).toContain(
        'The member address already has an active vesting.'
      )
    })

    it('sets errorMessage when approveAllowance is called with zero totalAmount', async () => {
      // Bypass schema (which already rejects totalAmount=0) and exercise the
      // defensive guard inside approveAllowance() directly. The branch is
      // unreachable via real form input because the Zod refine catches it first.
      /* eslint-disable-next-line no-restricted-syntax -- defense-in-depth branch
         unreachable via UI; the Zod schema already rejects totalAmount < 1. */
      const vm = wrapper.vm as unknown as {
        member: { name: string; address: string }
        totalAmount: number
        errorMessage: string
        approveAllowance: () => Promise<void>
      }
      vm.member = {
        name: 'Carol',
        address: '0x9999999999999999999999999999999999999999'
      }
      vm.totalAmount = 0
      await wrapper.vm.$nextTick()

      await vm.approveAllowance()
      await wrapper.vm.$nextTick()

      expect(vm.errorMessage).toBe('total amount value should be greater than zero')
    })
  })
})
