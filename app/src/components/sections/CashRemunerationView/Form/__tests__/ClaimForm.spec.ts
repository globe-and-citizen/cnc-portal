import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { renderWithProviders } from '@/tests/mocks'
import ClaimForm from '@/components/sections/CashRemunerationView/Form/ClaimForm.vue'

const UploadFileDBStub = defineComponent({
  name: 'UploadFileDB',
  props: { disabled: Boolean, existingFileCount: Number },
  emits: ['update:files'],
  template: '<div data-test="upload-file-db-stub" />'
})

const FilePreviewGalleryStub = defineComponent({
  name: 'FilePreviewGallery',
  props: { previews: Array },
  emits: ['remove'],
  template:
    '<div data-test="file-preview-gallery">{{ JSON.stringify(previews) }}<button data-test="remove-preview" @click="$emit(\'remove\', 1)" /></div>'
})

const createWrapper = (props = {}) =>
  renderWithProviders(ClaimForm, {
    props,
    global: {
      stubs: {
        UploadFileDB: UploadFileDBStub,
        FilePreviewGallery: FilePreviewGalleryStub
      }
    }
  })

const makeExistingFile = (index: number) => ({
  fileName: 'file' + index + '.png',
  fileKey: 'claims/1/' + index + '.png',
  fileUrl: 'https://example.com/claims/1/' + index + '.png',
  fileType: 'image/png',
  fileSize: 1024
})

const setValidFormFields = async (
  wrapper: ReturnType<typeof createWrapper>,
  memo = 'Test memo'
) => {
  await wrapper.find('input[data-test="hours-worked-input"]').setValue('4')
  await wrapper.find('textarea[data-test="memo-input"]').setValue(memo)
}

describe('ClaimForm.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders and clears the provided error', async () => {
    const wrapper = createWrapper({
      error: { message: 'Server unavailable', title: 'Failed to submit claim' }
    })

    const alert = wrapper.find('[data-test="claim-error-alert"]')
    expect(alert.text()).toContain('Server unavailable')
    expect(alert.text()).toContain('Failed to submit claim')

    await wrapper.setProps({ error: { message: '' } })
    expect(wrapper.find('[data-test="claim-error-alert"]').exists()).toBe(false)
  })

  it('supports edit actions and replaces the form when initial data changes', async () => {
    const wrapper = createWrapper({
      mode: 'edit',
      initialData: {
        hoursWorked: '3',
        minutesWorked: '20',
        memo: 'Initial',
        dayWorked: '2024-01-01T00:00:00.000Z'
      }
    })

    await wrapper.find('[data-test="cancel-button"]').trigger('click')
    expect(wrapper.emitted('cancel')).toBeTruthy()

    await wrapper.setProps({
      initialData: {
        hoursWorked: '6',
        minutesWorked: '40',
        memo: 'Updated memo',
        dayWorked: '2024-01-15T00:00:00.000Z'
      }
    })
    await flushPromises()

    expect(
      (wrapper.find('input[data-test="hours-worked-input"]').element as HTMLInputElement).value
    ).toBe('6')
    expect(
      (wrapper.find('textarea[data-test="memo-input"]').element as HTMLTextAreaElement).value
    ).toBe('Updated memo')
    expect(wrapper.findComponent({ name: 'USelectMenu' }).props('modelValue')).toBe('40')
    expect(wrapper.find('[data-test="date-input"]').text()).toBe('2024-01-15 UTC')
  })

  it('updates the selected date through the calendar', async () => {
    const wrapper = createWrapper({
      initialData: { hoursWorked: '2', memo: 'memo', dayWorked: '' }
    })
    const calendar = () => wrapper.findComponent({ name: 'UCalendar' })
    const popover = () => wrapper.findComponent({ name: 'UPopover' })

    expect(wrapper.find('[data-test="date-input"]').text()).toBe('Select a date')
    expect(calendar().props('modelValue')).toBeUndefined()

    await wrapper.find('[data-test="date-input"]').trigger('click')
    expect(popover().props('open')).toBe(true)

    calendar().vm.$emit('update:modelValue', { start: undefined, end: undefined })
    await flushPromises()
    expect(wrapper.find('[data-test="date-input"]').text()).toBe('Select a date')

    calendar().vm.$emit('update:modelValue', { year: 2024, month: 1, day: 10 })
    await flushPromises()
    expect(wrapper.find('[data-test="date-input"]').text()).toBe('2024-01-10 UTC')
    expect(popover().props('open')).toBe(false)
  })

  it('blocks submit when total files exceed the limit', async () => {
    const wrapper = createWrapper({
      mode: 'edit',
      existingFiles: Array.from({ length: 8 }, (_, index) => makeExistingFile(index + 1))
    })
    wrapper
      .findComponent({ name: 'UploadFileDB' })
      .vm.$emit('update:files', [
        new File(['a'], 'new1.png', { type: 'image/png' }),
        new File(['b'], 'new2.png', { type: 'image/png' }),
        new File(['c'], 'new3.png', { type: 'image/png' })
      ])

    await flushPromises()
    await setValidFormFields(wrapper)
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.emitted('submit')).toBeFalsy()
  })

  it('submits selected files with the completed form', async () => {
    const wrapper = createWrapper()
    wrapper
      .findComponent({ name: 'UploadFileDB' })
      .vm.$emit('update:files', [new File(['content'], 'receipt.png')])

    await flushPromises()
    await setValidFormFields(wrapper)
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.emitted('submit')?.[0]?.[0]).toEqual(
      expect.objectContaining({
        minutesWorked: 240,
        memo: 'Test memo',
        files: [expect.any(File)]
      })
    )
  })

  it('maps previews, removes an existing file, and accepts null file inputs', async () => {
    const wrapper = createWrapper({
      mode: 'edit',
      existingFiles: [
        {
          fileKey: 'claims/1/report.png',
          fileUrl: 'https://example.com/claims/1/report.png',
          fileType: 'image/png',
          fileSize: 2048
        },
        {
          fileName: 'notes.pdf',
          fileKey: 'claims/1/notes.pdf',
          fileUrl: 'https://example.com/claims/1/notes.pdf',
          fileType: 'application/pdf',
          fileSize: 1024
        },
        {
          fileKey: 'claims/1/',
          fileUrl: 'https://example.com/claims/1/no-name',
          fileType: 'application/pdf'
        },
        { fileUrl: 'https://example.com/claims/1/invalid.pdf', fileType: 'application/pdf' }
      ]
    })

    const gallery = wrapper.find('[data-test="file-preview-gallery"]').text()
    expect(gallery).toContain('report.png')
    expect(gallery).toContain('notes.pdf')
    expect(gallery).toContain('"fileName":"file"')
    expect(gallery).not.toContain('invalid.pdf')

    await wrapper.find('[data-test="remove-preview"]').trigger('click')
    expect(wrapper.emitted('delete-file')?.[0]).toEqual([1])

    const nullishWrapper = createWrapper({
      mode: 'edit',
      existingFiles: null,
      submissionRules: { disabledWeekStarts: null }
    })
    expect(nullishWrapper.find('[data-test="attached-files-section"]').exists()).toBe(false)
  })
})
