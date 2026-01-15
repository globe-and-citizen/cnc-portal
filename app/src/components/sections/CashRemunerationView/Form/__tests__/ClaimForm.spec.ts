import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest'
import ClaimForm from '@/components/sections/CashRemunerationView/Form/ClaimForm.vue'
import { createTestingPinia } from '@pinia/testing'

const VueDatePickerStub = {
  template: `
    <input
      data-test="date-input"
      :value="modelValue"
      :disabled="disabled"
      @input="$emit('update:modelValue', $event.target.value)"
    />
  `,
  props: ['modelValue', 'disabled', 'format', 'disabledDates']
}

const errorToastMock = vi.fn()

const { mockUseToastStore } = vi.hoisted(() => ({
  mockUseToastStore: vi.fn(() => ({
    addErrorToast: errorToastMock,
    addSuccessToast: vi.fn()
  }))
}))

vi.mock('@/stores', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useToastStore: mockUseToastStore
  }
})

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
        VueDatePicker: VueDatePickerStub,
        UploadFileDB: true,
        FilePreviewGallery: true
      }
    }
  })

describe('ClaimForm.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

  it('shows memo length validation error and prevents submit when memo is too long', async () => {
    const wrapper = createWrapper()
    const longMemo = 'a'.repeat(3001)

    await wrapper.find('input[data-test="hours-worked-input"]').setValue('3')
    await wrapper.find('textarea[data-test="memo-input"]').setValue(longMemo)
    await wrapper.find('[data-test="date-input"]').setValue('2024-01-10T00:00:00.000Z')

    await wrapper.find('[data-test="submit-claim-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('submit')).toBeFalsy()
    // memo errors are rendered in a generic red text block (we check for any red text)
    expect(wrapper.findAll('.text-red-500').length).toBeGreaterThan(0)
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

      await wrapper.find('[data-test="update-claim-button"]').trigger('click')
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

      await wrapper.find('[data-test="update-claim-button"]').trigger('click')
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

  it.skip('allows Monday..today on a Friday (week min wins)', async () => {
    // Use fake timers and set system date to Friday, 2024-01-12 UTC
    vi.useFakeTimers()
    vi.setSystemTime(new Date(Date.UTC(2024, 0, 12, 0, 0, 0)))

    const wrapper = createWrapper()
    const datePicker = wrapper.findComponent(VueDatePickerStub)
    const disabledFn = datePicker.props('disabledDates') as (
      d: Date | string | null | undefined
    ) => boolean

    // Dates that should be allowed (not disabled)
    const allowed = [
      new Date(Date.UTC(2024, 0, 8)), // Monday
      new Date(Date.UTC(2024, 0, 9)),
      new Date(Date.UTC(2024, 0, 10)),
      new Date(Date.UTC(2024, 0, 11)),
      new Date(Date.UTC(2024, 0, 12)) // Today (Friday)
    ]

    for (const d of allowed) {
      expect(disabledFn(d)).toBe(false)
    }

    // Before Monday should be disabled
    expect(disabledFn(new Date(Date.UTC(2024, 0, 7)))).toBe(true)
    // After today should be disabled
    expect(disabledFn(new Date(Date.UTC(2024, 0, 13)))).toBe(true)
  })
})
