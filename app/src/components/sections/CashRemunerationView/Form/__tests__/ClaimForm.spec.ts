import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest'
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
        UCalendar: true,
        UPopover: UPopoverStub,
        UploadFileDB: true,
        FilePreviewGallery: true
      }
    }
  })

describe('ClaimForm.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useToastStore).mockReturnValue({
      addErrorToast: errorToastMock,
      addSuccessToast: vi.fn()
    } as ReturnType<typeof useToastStore>)
  })

  it('shows validation errors when required fields are missing', async () => {
    const wrapper = createWrapper()

    // Trigger via native form submit (UForm validates with Zod on submit)
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    // Zod validation should block the submit event from being emitted
    expect(wrapper.emitted('submit')).toBeFalsy()
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

  it('shows memo length validation error and prevents submit when memo is too long', async () => {
    const wrapper = createWrapper()
    const longMemo = 'a'.repeat(3001)

    await wrapper.find('input[data-test="hours-worked-input"]').setValue('3')
    await wrapper.find('textarea[data-test="memo-input"]').setValue(longMemo)
    // Date is pre-filled with today's UTC date by default — no need to set it

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    // Zod schema max(3000) should block submission
    expect(wrapper.emitted('submit')).toBeFalsy()
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

    it('should emit submit when total files are exactly 10', async () => {
      const wrapper = createWrapper({
        isEdit: true,
        existingFiles: [
          { fileName: 'file1.png', fileData: 'base64', fileType: 'image/png', fileSize: 1024 },
          { fileName: 'file2.png', fileData: 'base64', fileType: 'image/png', fileSize: 1024 },
          { fileName: 'file3.png', fileData: 'base64', fileType: 'image/png', fileSize: 1024 },
          { fileName: 'file4.png', fileData: 'base64', fileType: 'image/png', fileSize: 1024 },
          { fileName: 'file5.png', fileData: 'base64', fileType: 'image/png', fileSize: 1024 },
          { fileName: 'file6.png', fileData: 'base64', fileType: 'image/png', fileSize: 1024 },
          { fileName: 'file7.png', fileData: 'base64', fileType: 'image/png', fileSize: 1024 }
        ]
      })

      // Mock uploaded files (7 existing + 3 new = 10 total)
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

      expect(wrapper.emitted('submit')).toBeTruthy()
      expect(errorToastMock).not.toHaveBeenCalled()
    })

    it('should show "Attached Files" section only in edit mode with files', () => {
      // Not in edit mode - should not show
      let wrapper = createWrapper({
        isEdit: false,
        existingFiles: [
          { fileName: 'file1.png', fileData: 'base64', fileType: 'image/png', fileSize: 1024 }
        ]
      })
      expect(wrapper.find('[data-test="attached-files-section"]').exists()).toBe(false)

      // In edit mode but no files - should not show
      wrapper = createWrapper({
        isEdit: true,
        existingFiles: []
      })
      expect(wrapper.find('[data-test="attached-files-section"]').exists()).toBe(false)

      // In edit mode with files - should show
      wrapper = createWrapper({
        isEdit: true,
        existingFiles: [
          { fileName: 'file1.png', fileData: 'base64', fileType: 'image/png', fileSize: 1024 }
        ]
      })
      expect(wrapper.find('[data-test="attached-files-section"]').exists()).toBe(true)
    })
  })
})

describe('disabledDates logic', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  // TODO: rewrite using isDateDisabledFn (UCalendar Matcher) after migration to Nuxt UI Calendar
  it.skip('allows Monday..today on a Friday (week min wins)', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(Date.UTC(2024, 0, 12, 0, 0, 0)))

    const wrapper = createWrapper()
    const { isDateDisabledFn } = wrapper.vm as unknown as {
      isDateDisabledFn: (d: { year: number; month: number; day: number }) => boolean
    }

    // Dates that should be allowed (not disabled)
    const allowed = [
      { year: 2024, month: 1, day: 8 }, // Monday
      { year: 2024, month: 1, day: 9 },
      { year: 2024, month: 1, day: 10 },
      { year: 2024, month: 1, day: 11 },
      { year: 2024, month: 1, day: 12 } // Today (Friday)
    ]

    for (const d of allowed) {
      expect(isDateDisabledFn(d)).toBe(false)
    }

    expect(isDateDisabledFn({ year: 2024, month: 1, day: 7 })).toBe(true) // Before Monday
    expect(isDateDisabledFn({ year: 2024, month: 1, day: 13 })).toBe(true) // After today
  })
})
