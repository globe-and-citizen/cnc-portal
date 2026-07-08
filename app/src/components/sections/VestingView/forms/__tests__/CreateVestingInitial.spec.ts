import { describe, it, vi, expect, beforeEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import CreateVesting from '@/components/sections/VestingView/forms/CreateVesting.vue'
import SelectMemberInput from '@/components/utils/SelectMemberInput.vue'
import { createTestingPinia } from '@pinia/testing'
import { parseUnits } from 'viem'
import { mockVestingWrites } from '@/tests/mocks/contract.mock'
import { CalendarDate } from '@internationalized/date'

describe('CreateVesting.vue', () => {
  let wrapper: VueWrapper
  const submitForm = async () => {
    await wrapper.find('[data-test="submit-btn"]').trigger('click')
    await wrapper.vm.$nextTick()
  }
  const mountComponent = () =>
    mount(CreateVesting, {
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
  })
})
