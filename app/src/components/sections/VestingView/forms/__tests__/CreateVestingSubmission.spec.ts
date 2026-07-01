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
    it('calls addVesting with the share-token amount when confirming a valid form', async () => {
      await fillFormWithValidData(wrapper, '0x120000000000000000000000000000000000dead')

      const submitBtn = wrapper.find('[data-test="submit-btn"]')
      expect(submitBtn.attributes('disabled')).toBeUndefined()
      await submitForm()

      const confirmBtn = wrapper.find('[data-test="confirm-btn"]')
      await confirmBtn.trigger('click')
      await wrapper.vm.$nextTick()

      expect(mockVestingWrites.addVesting.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.arrayContaining([parseUnits('5', 6)])
        }),
        expect.any(Object)
      )

      // mutate's onSuccess (configured in beforeEach) resets the form, so the
      // form view re-mounts with the default amount/cliff inputs at 0.
      await wrapper.vm.$nextTick()
      expect((wrapper.find('[data-test="total-amount"]').element as HTMLInputElement).value).toBe(
        '0'
      )
      expect((wrapper.find('[data-test="cliff"]').element as HTMLInputElement).value).toBe('0')
    })

    it('prevents submission when form is invalid', async () => {
      // Empty form (no member, no date, default totalAmount=0) fails schema
      // validation; submit() never runs and the summary never renders.
      await submitForm()

      const summary = wrapper.findComponent({ name: 'VestingSummary' })
      expect(summary.exists()).toBe(false)
      expect(mockVestingWrites.addVesting.mutate).not.toHaveBeenCalled()
    })
  })
})
