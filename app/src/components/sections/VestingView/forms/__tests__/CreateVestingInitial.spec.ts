import { describe, it, vi, expect, beforeEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import CreateVesting from '@/components/sections/VestingView/forms/CreateVesting.vue'
import SelectMemberInput from '@/components/utils/SelectMemberInput.vue'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import { parseUnits } from 'viem'
import { mockVestingWrites } from '@/tests/mocks/contract.mock'
import { CalendarDate } from '@internationalized/date'

const memberAddress = '0x000000000000000000000000000000000000dead'
const mockReloadKey = ref<number>(0)
const mockResolvedVestingAddress = ref('0x1000000000000000000000000000000000000001' as const)

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
  useVestingGetVestingsWithMembers: vi.fn(() => ({
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
        reloadKey: mockReloadKey.value
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
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
    // Default: addVesting.mutate invokes onSuccess to simulate a confirmed write.
    mockVestingWrites.addVesting.mutate
      .mockReset()
      .mockImplementation(
        (_vars: unknown, opts?: { onSuccess?: () => void; onError?: (e: Error) => void }) => {
          opts?.onSuccess?.()
        }
      )
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

  describe('Submission', () => {
    it('calls addVesting when confirming the summary with a valid amount', async () => {
      await fillValidForm()

      const submitBtn = wrapper.find('[data-test="submit-btn"]')
      expect(submitBtn.attributes('disabled')).toBeUndefined()
      await submitForm()

      // Now in summary view, confirm vesting creation
      const confirmBtn = wrapper.find('[data-test="confirm-btn"]')
      await confirmBtn.trigger('click')

      expect(mockVestingWrites.addVesting.mutate).toHaveBeenCalled()
    })

    it('does not submit with a zero amount', async () => {
      await fillValidForm(0)

      await submitForm()

      // The form validation prevents reaching the summary / addVesting write.
      expect(wrapper.findComponent({ name: 'VestingSummary' }).exists()).toBe(false)
      expect(mockVestingWrites.addVesting.mutate).not.toHaveBeenCalled()
    })

    it('shows error on invalid cliff value', async () => {
      // Date range is 1 day -> cliff > 1 violates the cliff <= duration refine.
      await fillValidForm(5, 6)

      await submitForm()
      expect(wrapper.findComponent({ name: 'VestingSummary' }).exists()).toBe(false)
    })

    it('passes the totalAmount as share-token units (6 decimals) to addVesting', async () => {
      await fillValidForm(7)

      await submitForm()

      const confirmBtn = wrapper.find('[data-test="confirm-btn"]')
      await confirmBtn.trigger('click')
      await wrapper.vm.$nextTick()

      expect(mockVestingWrites.addVesting.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.arrayContaining([parseUnits('7', 6)])
        }),
        expect.any(Object)
      )
    })

    it('returns an empty array from activeMembers if vestingInfos is not an array of length 2', () => {
      const testCases = [
        { value: undefined },
        { value: [[memberAddress]] as unknown as [string[]] },
        { value: null }
      ]

      testCases.forEach(({ value }) => {
        mockVestingInfos.value = value
        const w = mountComponent()
        expect(w.findComponent(CreateVesting).vm.activeMembers).toEqual([])
      })
    })
  })

  describe('In-form UAlert error feedback', () => {
    it('renders the in-form UAlert when errorMessage is set via duplicate-member guard', async () => {
      // No alert yet on initial render.
      expect(wrapper.find('[data-test="error-alert"]').exists()).toBe(false)

      // Selecting an already-active member then confirming triggers
      // checkDuplicateVesting() inside submit(), which sets errorMessage and
      // renders the in-form UAlert.
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

      // The duplicate guard short-circuits before the write.
      expect(mockVestingWrites.addVesting.mutate).not.toHaveBeenCalled()
    })
  })
})
