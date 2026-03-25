import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest'
import { defineComponent } from 'vue'
import ClaimForm from '@/components/sections/CashRemunerationView/Form/ClaimForm.vue'
import { createTestingPinia } from '@pinia/testing'

// Stubs that preserve native element attrs for queries and v-model support
const UInputStub = {
  template:
    '<input v-bind="$attrs" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  inheritAttrs: false
}

const UTextareaStub = {
  template:
    '<textarea v-bind="$attrs" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)"></textarea>',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  inheritAttrs: false
}

// Renders the trigger slot so data-test="date-input" on the inner UButton is accessible
const UPopoverStub = {
  template: '<div><slot /><slot name="content" /></div>'
}

const UCalendarStub = defineComponent({
  name: 'UCalendar',
  props: {
    modelValue: { type: Object, required: false },
    isDateDisabled: { type: Function, required: false }
  },
  emits: ['update:model-value'],
  template:
    '<div data-test="calendar-stub"><button data-test="calendar-select" @click="$emit(\'update:model-value\', { year: 2024, month: 1, day: 10 })" /></div>'
})

const resetUploadMock = vi.fn()
const UploadFileDBStub = defineComponent({
  name: 'UploadFileDB',
  props: {
    disabled: { type: Boolean, required: false },
    existingFileCount: { type: Number, required: false }
  },
  emits: ['update:files'],
  setup(_, { expose }) {
    expose({ resetUpload: resetUploadMock })
    return {}
  },
  template: '<div data-test="upload-file-db-stub" />'
})

const FilePreviewGalleryStub = defineComponent({
  name: 'FilePreviewGallery',
  props: {
    previews: { type: Array, required: false }
  },
  emits: ['remove'],
  template:
    '<div data-test="file-preview-gallery">{{ JSON.stringify(previews) }}<button data-test="remove-preview" @click="$emit(\'remove\', 1)" /></div>'
})

// Renders a plain button passing all attrs through for data-test, type, disabled etc.
const UButtonStub = {
  template:
    '<button v-bind="$attrs" :disabled="disabled || loading" :type="type || \'button\'"><slot /></button>',
  props: ['disabled', 'loading', 'type', 'color', 'variant', 'leadingIcon', 'size'],
  inheritAttrs: false
}

import { useToastStore } from '@/stores'

const errorToastMock = vi.fn()

const defaultProps = {
  isEdit: false,
  isLoading: false
}

const createWrapper = (props = {}) =>
  mount(ClaimForm, {
    props: { ...defaultProps, ...props },
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })],
      stubs: {
        UInput: UInputStub,
        UTextarea: UTextareaStub,
        UButton: UButtonStub,
        UCalendar: UCalendarStub,
        UPopover: UPopoverStub,
        UploadFileDB: UploadFileDBStub,
        FilePreviewGallery: FilePreviewGalleryStub
      }
    }
  })

describe('ClaimForm.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetUploadMock.mockClear()
    vi.mocked(useToastStore).mockReturnValue({
      addErrorToast: errorToastMock,
      addSuccessToast: vi.fn()
    } as ReturnType<typeof useToastStore>)
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

    expect(hoursInput.value).toBe('6')
    expect(memoInput.value).toBe('Updated memo')
    // Date is shown as formatted text on the picker button
    expect(wrapper.find('[data-test="date-input"]').text()).toBe('2024-01-15 UTC')
  })

  it('shows "Select a date" when dayWorked is empty and handles valid/invalid calendar selections', async () => {
    const wrapper = createWrapper({
      initialData: {
        hoursWorked: '2',
        memo: 'memo',
        dayWorked: ''
      }
    })

    expect(wrapper.find('[data-test="date-input"]').text()).toBe('Select a date')

    const vm = wrapper.vm as unknown as {
      onDateSelect: (value: unknown) => void
    }

    vm.onDateSelect(null)
    await flushPromises()
    expect(wrapper.find('[data-test="date-input"]').text()).toBe('Select a date')

    vm.onDateSelect([{ year: 2024, month: 1, day: 9 }])
    await flushPromises()
    expect(wrapper.find('[data-test="date-input"]').text()).toBe('Select a date')

    vm.onDateSelect({ start: undefined, end: undefined })
    await flushPromises()
    expect(wrapper.find('[data-test="date-input"]').text()).toBe('Select a date')

    vm.onDateSelect({ year: 2024, month: 1, day: 9 })
    await flushPromises()
    expect(wrapper.find('[data-test="date-input"]').text()).toBe('2024-01-09 UTC')
  })

  it('reacts to date button click and calendar update event through template bindings', async () => {
    const wrapper = createWrapper({ isEdit: false })

    const vm = wrapper.vm as unknown as {
      datePickerOpen: boolean
      onDateSelect: (value: unknown) => void
    }

    expect(vm.datePickerOpen).toBe(false)
    await wrapper.find('[data-test="date-input"]').trigger('click')
    expect(vm.datePickerOpen).toBe(true)

    vm.onDateSelect({ year: 2024, month: 1, day: 10 })
    await flushPromises()
    expect(wrapper.find('[data-test="date-input"]').text()).toBe('2024-01-10 UTC')
    expect(vm.datePickerOpen).toBe(false)
  })

  it('handles calendarValue guard branches for empty and invalid dayWorked values', async () => {
    const emptyDateWrapper = createWrapper({
      initialData: {
        hoursWorked: '1',
        memo: 'memo',
        dayWorked: ''
      }
    })

    const vmEmpty = emptyDateWrapper.vm as unknown as {
      calendarValue: unknown
    }
    expect(vmEmpty.calendarValue).toBeUndefined()

    const invalidDateWrapper = createWrapper({
      initialData: {
        hoursWorked: '1',
        memo: 'memo',
        dayWorked: 'not-a-date'
      }
    })

    const vmInvalid = invalidDateWrapper.vm as unknown as {
      calendarValue: unknown
    }
    expect(vmInvalid.calendarValue).toBeUndefined()

    const malformedIsoWrapper = createWrapper({
      initialData: {
        hoursWorked: '1',
        memo: 'memo',
        dayWorked: 'T00:00:00.000Z'
      }
    })

    const vmMalformedIso = malformedIsoWrapper.vm as unknown as {
      calendarValue: unknown
    }
    expect(vmMalformedIso.calendarValue).toBeUndefined()
  })

  it('exposes disabled-date matcher and covers approved week and restriction branches', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(Date.UTC(2024, 0, 12, 0, 0, 0)))

    const wrapper = createWrapper({
      disabledWeekStarts: ['2024-01-08T00:00:00.000Z'],
      restrictSubmit: true
    })

    const vm = wrapper.vm as unknown as {
      isDateDisabledFn: (d: { year: number; month: number; day: number }) => boolean
    }

    const isDateDisabled = vm.isDateDisabledFn as (d: {
      year: number
      month: number
      day: number
    }) => boolean

    expect(isDateDisabled({ year: 2024, month: 1, day: 8 })).toBe(true)

    const restrictedWrapper = createWrapper({ restrictSubmit: true })
    const restrictedVm = restrictedWrapper.vm as unknown as {
      isDateDisabledFn: (d: { year: number; month: number; day: number }) => boolean
    }
    const isRestrictedDateDisabled = restrictedVm.isDateDisabledFn as (d: {
      year: number
      month: number
      day: number
    }) => boolean

    expect(isRestrictedDateDisabled({ year: 2024, month: 1, day: 7 })).toBe(true)
    expect(isRestrictedDateDisabled({ year: 2024, month: 1, day: 13 })).toBe(true)
    expect(isRestrictedDateDisabled({ year: 2024, month: 1, day: 8 })).toBe(true)

    const unrestrictedWrapper = createWrapper({ restrictSubmit: false })
    const unrestrictedVm = unrestrictedWrapper.vm as unknown as {
      isDateDisabledFn: (d: { year: number; month: number; day: number }) => boolean
    }
    const isUnrestrictedDateDisabled = unrestrictedVm.isDateDisabledFn as (d: {
      year: number
      month: number
      day: number
    }) => boolean

    expect(isUnrestrictedDateDisabled({ year: 2024, month: 1, day: 1 })).toBe(false)
    vi.useRealTimers()
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

  describe('File Upload Integration', () => {
    it('should not emit submit when total files exceed 10', async () => {
      const wrapper = createWrapper({
        isEdit: true,
        existingFiles: [
          {
            fileName: 'file1.png',
            fileKey: 'claims/1/abc.png',
            fileUrl: 'https://storage.railway.app/test/claims/1/abc.png',
            fileType: 'image/png',
            fileSize: 1024
          },
          {
            fileName: 'file2.png',
            fileKey: 'claims/1/abc.png',
            fileUrl: 'https://storage.railway.app/test/claims/1/abc.png',
            fileType: 'image/png',
            fileSize: 1024
          },
          {
            fileName: 'file3.png',
            fileKey: 'claims/1/abc.png',
            fileUrl: 'https://storage.railway.app/test/claims/1/abc.png',
            fileType: 'image/png',
            fileSize: 1024
          },
          {
            fileName: 'file4.png',
            fileKey: 'claims/1/abc.png',
            fileUrl: 'https://storage.railway.app/test/claims/1/abc.png',
            fileType: 'image/png',
            fileSize: 1024
          },
          {
            fileName: 'file5.png',
            fileKey: 'claims/1/abc.png',
            fileUrl: 'https://storage.railway.app/test/claims/1/abc.png',
            fileType: 'image/png',
            fileSize: 1024
          },
          {
            fileName: 'file6.png',
            fileKey: 'claims/1/abc.png',
            fileUrl: 'https://storage.railway.app/test/claims/1/abc.png',
            fileType: 'image/png',
            fileSize: 1024
          },
          {
            fileName: 'file7.png',
            fileKey: 'claims/1/abc.png',
            fileUrl: 'https://storage.railway.app/test/claims/1/abc.png',
            fileType: 'image/png',
            fileSize: 1024
          },
          {
            fileName: 'file8.png',
            fileKey: 'claims/1/abc.png',
            fileUrl: 'https://storage.railway.app/test/claims/1/abc.png',
            fileType: 'image/png',
            fileSize: 1024
          }
        ]
      })

      // Mock uploaded files (8 existing + 3 new = 11 total)
      const newFiles = [
        new File(['content1'], 'new1.png', { type: 'image/png' }),
        new File(['content2'], 'new2.png', { type: 'image/png' }),
        new File(['content3'], 'new3.png', { type: 'image/png' })
      ]

      // Simulate file upload via UploadFileDB component
      const uploadComponent = wrapper.findComponent({ name: 'UploadFileDB' })
      uploadComponent.vm.$emit('update:files', newFiles)
      await flushPromises()

      await wrapper.find('input[data-test="hours-worked-input"]').setValue('4')
      await wrapper.find('textarea[data-test="memo-input"]').setValue('Test memo')

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(wrapper.emitted('submit')).toBeFalsy()
      expect(errorToastMock).toHaveBeenCalledWith(
        'Maximum 10 files allowed. Currently you have 11 files. Please remove 1 file(s).'
      )
    })

    it('maps existing file previews, derives file name, and emits delete-file from gallery', async () => {
      const wrapper = createWrapper({
        isEdit: true,
        existingFiles: [
          {
            fileKey: 'claims/1/report.png',
            fileUrl: 'https://storage.railway.app/claims/1/report.png',
            fileType: 'image/png',
            fileSize: 2048
          },
          {
            fileName: 'notes.pdf',
            fileKey: 'claims/1/notes.pdf',
            fileUrl: 'https://storage.railway.app/claims/1/notes.pdf',
            fileType: 'application/pdf',
            fileSize: 1024
          },
          {
            fileKey: 'claims/1/',
            fileUrl: 'https://storage.railway.app/claims/1/no-name',
            fileType: 'application/pdf'
          },
          {
            fileUrl: 'https://storage.railway.app/claims/1/invalid.pdf',
            fileType: 'application/pdf'
          }
        ]
      })

      const gallery = wrapper.find('[data-test="file-preview-gallery"]').text()
      expect(gallery).toContain('report.png')
      expect(gallery).toContain('notes.pdf')
      expect(gallery).toContain('"fileName":"file"')
      expect(gallery).toContain('"isImage":true')
      expect(gallery).toContain('"isImage":false')
      expect(gallery).not.toContain('invalid.pdf')

      await wrapper.find('[data-test="remove-preview"]').trigger('click')
      expect(wrapper.emitted('delete-file')?.[0]).toEqual([1])
    })

    it('exposed resetForm clears uploaded files and calls UploadFileDB.resetUpload', async () => {
      const wrapper = createWrapper({
        initialData: {
          hoursWorked: '4',
          memo: 'Reset flow',
          dayWorked: '2024-01-15T00:00:00.000Z'
        }
      })

      const uploadComponent = wrapper.findComponent({ name: 'UploadFileDB' })
      uploadComponent.vm.$emit('update:files', [new File(['content'], 'receipt.png')])
      await flushPromises()

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(wrapper.emitted('submit')?.[0]?.[0]?.files).toHaveLength(1)
      ;(wrapper.vm as unknown as { resetForm: () => void }).resetForm()
      expect(resetUploadMock).toHaveBeenCalledTimes(1)

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(wrapper.emitted('submit')?.[1]?.[0]?.files).toBeUndefined()
    })
  })
})
