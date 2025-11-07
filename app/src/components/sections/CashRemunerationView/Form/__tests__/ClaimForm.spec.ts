import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ClaimForm from '@/components/sections/CashRemunerationView/Form/ClaimForm.vue'

const VueDatePickerStub = {
  template:
    '<input data-test="date-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  props: ['modelValue']
}

const defaultProps = {
  isEdit: false,
  isLoading: false
}

const createWrapper = (props = {}) =>
  mount(ClaimForm, {
    props: { ...defaultProps, ...props },
    global: {
      stubs: {
        VueDatePicker: VueDatePickerStub
      }
    }
  })

describe('ClaimForm.vue', () => {
  it('renders cancel button when in edit mode', () => {
    const wrapper = createWrapper({ isEdit: true })
    expect(wrapper.find('[data-test="cancel-button"]').exists()).toBe(true)
  })

  it('emits submit event with normalized payload when form is valid', async () => {
    const wrapper = createWrapper()

    await wrapper.find('input[data-test="hours-worked-input"]').setValue('8')
    await wrapper.find('textarea[data-test="memo-input"]').setValue('Worked on feature X')
    await wrapper.find('[data-test="date-input"]').setValue('2024-01-10T00:00:00.000Z')

    await wrapper.find('[data-test="submit-claim-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('submit')).toBeTruthy()
    expect(wrapper.emitted('submit')![0][0]).toEqual({
      hoursWorked: 8,
      memo: 'Worked on feature X',
      dayWorked: '2024-01-10T00:00:00.000Z'
    })
  })

  it('shows validation errors when required fields are missing', async () => {
    const wrapper = createWrapper()

    await wrapper.find('[data-test="submit-claim-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('[data-test="hours-worked-error"]').length).toBeGreaterThan(0)
    expect(wrapper.findAll('.text-red-500').length).toBeGreaterThan(0)
  })

  it('emits cancel event when cancel button is clicked in edit mode', async () => {
    const wrapper = createWrapper({ isEdit: true })

    await wrapper.find('[data-test="cancel-button"]').trigger('click')
    expect(wrapper.emitted('cancel')).toBeTruthy()
  })

  it('updates form inputs when initialData prop changes', async () => {
    const wrapper = createWrapper({
      initialData: {
        hoursWorked: '3',
        memo: 'Initial memo',
        dayWorked: '2024-01-01T00:00:00.000Z'
      }
    })

    await wrapper.setProps({
      initialData: {
        hoursWorked: '6',
        memo: 'Updated memo',
        dayWorked: '2024-01-15T00:00:00.000Z'
      }
    })
    await flushPromises()

    const hoursInput = wrapper.find('input[data-test="hours-worked-input"]')
      .element as HTMLInputElement
    const memoInput = wrapper.find('textarea[data-test="memo-input"]')
      .element as HTMLTextAreaElement
    const dateInput = wrapper.find('[data-test="date-input"]').element as HTMLInputElement

    expect(hoursInput.value).toBe('6')
    expect(memoInput.value).toBe('Updated memo')
    expect(dateInput.value).toBe('2024-01-15T00:00:00.000Z')
  })

  describe('formatUTC helper', () => {
    it('returns empty string when value is nullish', () => {
      const wrapper = createWrapper()
      const { formatUTC } = wrapper.vm as unknown as {
        formatUTC: (value: Date | string | null | undefined) => string
      }

      expect(formatUTC(null)).toBe('')
      expect(formatUTC(undefined)).toBe('')
    })

    it('formats Date instances and ISO strings into UTC labels', () => {
      const wrapper = createWrapper()
      const { formatUTC } = wrapper.vm as unknown as {
        formatUTC: (value: Date | string | null | undefined) => string
      }

      const sampleDate = new Date(Date.UTC(2024, 0, 20, 5, 30, 0))
      expect(formatUTC(sampleDate)).toBe('2024-01-20 UTC')
      expect(formatUTC('2024-02-15T12:00:00.000Z')).toBe('2024-02-15 UTC')
    })
  })
})
