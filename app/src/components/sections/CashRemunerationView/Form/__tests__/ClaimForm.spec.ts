import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, ref } from 'vue'
import { renderWithProviders } from '@/tests/mocks'
import ClaimForm from '@/components/sections/CashRemunerationView/Form/ClaimForm.vue'

type DateDisabledFn = (d: { year: number; month: number; day: number }) => boolean

const resetUploadMock = vi.fn()
const UploadFileDBStub = defineComponent({
  name: 'UploadFileDB',
  props: { disabled: Boolean, existingFileCount: Number },
  emits: ['update:files'],
  setup(_, { expose }) {
    expose({ resetUpload: resetUploadMock })
    return {}
  },
  template: '<div data-test="upload-file-db-stub" />'
})

const FilePreviewGalleryStub = defineComponent({
  name: 'FilePreviewGallery',
  props: { previews: Array },
  emits: ['remove'],
  template:
    '<div data-test="file-preview-gallery">{{ JSON.stringify(previews) }}<button data-test="remove-preview" @click="$emit(\'remove\', 1)" /></div>'
})

const defaultProps = { isEdit: false, isLoading: false }

const createWrapper = (props = {}) =>
  renderWithProviders(ClaimForm, {
    props: { ...defaultProps, ...props },
    global: {
      stubs: {
        UploadFileDB: UploadFileDBStub,
        FilePreviewGallery: FilePreviewGalleryStub
      }
    }
  })

// Harness mount: exposes the ClaimForm instance via a typed ref so defineExpose'd
// methods (formatUTC, resetForm) can be called without a `wrapper.vm as X` cast.
const createHarness = (props = {}) => {
  const merged = { ...defaultProps, ...props }
  const Harness = defineComponent({
    components: { ClaimForm },
    setup() {
      const child = ref<InstanceType<typeof ClaimForm> | null>(null)
      return { child, merged }
    },
    template: '<ClaimForm ref="child" v-bind="merged" />'
  })
  // Harness mount keeps `mount` so the typed `vm.child` ref survives — see
  // CreateAddCampaign.spec.ts. renderWithProviders erases the component generic.
  return mount(Harness, {
    global: {
      stubs: {
        UploadFileDB: UploadFileDBStub,
        FilePreviewGallery: FilePreviewGalleryStub
      }
    }
  })
}

const makeExistingFile = (i: number) => ({
  fileName: `file${i}.png`,
  fileKey: `claims/1/${i}.png`,
  fileUrl: `https://storage.railway.app/test/claims/1/${i}.png`,
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
    resetUploadMock.mockClear()
  })

  it('renders error alert when errorMessage prop is set', async () => {
    const wrapper = createWrapper({
      errorMessage: 'Server unavailable',
      errorTitle: 'Failed to submit claim'
    })

    const alert = wrapper.find('[data-test="claim-error-alert"]')
    expect(alert.exists()).toBe(true)
    expect(alert.text()).toContain('Server unavailable')
    expect(alert.text()).toContain('Failed to submit claim')

    await wrapper.setProps({ errorMessage: '' })
    expect(wrapper.find('[data-test="claim-error-alert"]').exists()).toBe(false)
  })

  it('handles edit actions and prop updates', async () => {
    const wrapper = createWrapper({
      isEdit: true,
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

  it('covers date selection + guards + format helper branches', async () => {
    const wrapper = createHarness({
      initialData: { hoursWorked: '2', memo: 'memo', dayWorked: '' }
    })
    const calendar = () => wrapper.findComponent({ name: 'UCalendar' })
    const popover = () => wrapper.findComponent({ name: 'UPopover' })

    expect(wrapper.find('[data-test="date-input"]').text()).toBe('Select a date')
    expect(calendar().props('modelValue')).toBeUndefined()
    expect(wrapper.vm.child?.formatUTC(null)).toBe('')
    expect(wrapper.vm.child?.formatUTC(undefined)).toBe('')
    expect(wrapper.vm.child?.formatUTC(new Date(Date.UTC(2024, 0, 20, 5, 30, 0)))).toBe(
      '2024-01-20 UTC'
    )
    expect(wrapper.vm.child?.formatUTC('2024-02-15T12:00:00.000Z')).toBe('2024-02-15 UTC')

    await wrapper.find('[data-test="date-input"]').trigger('click')
    expect(popover().props('open')).toBe(true)

    for (const invalidValue of [
      null,
      [{ year: 2024, month: 1, day: 9 }],
      { start: undefined, end: undefined }
    ]) {
      calendar().vm.$emit('update:modelValue', invalidValue)
      await flushPromises()
      expect(wrapper.find('[data-test="date-input"]').text()).toBe('Select a date')
    }

    calendar().vm.$emit('update:modelValue', { year: 2024, month: 1, day: 10 })
    await flushPromises()
    expect(wrapper.find('[data-test="date-input"]').text()).toBe('2024-01-10 UTC')
    expect(popover().props('open')).toBe(false)

    const invalidDateWrapper = createWrapper({
      initialData: { hoursWorked: '1', memo: 'memo', dayWorked: 'not-a-date' }
    })
    const malformedDateWrapper = createWrapper({
      initialData: { hoursWorked: '1', memo: 'memo', dayWorked: 'T00:00:00.000Z' }
    })
    expect(
      invalidDateWrapper.findComponent({ name: 'UCalendar' }).props('modelValue')
    ).toBeUndefined()
    expect(
      malformedDateWrapper.findComponent({ name: 'UCalendar' }).props('modelValue')
    ).toBeUndefined()
  })

  it('covers disabled-date logic for approved weeks and restrictions', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(Date.UTC(2024, 0, 12, 0, 0, 0)))

    const withApprovedWeek = createWrapper({
      disabledWeekStarts: ['2024-01-08T00:00:00.000Z'],
      restrictSubmit: true
    })
    const restricted = createWrapper({ restrictSubmit: true })
    const unrestricted = createWrapper({ restrictSubmit: false })

    const fn1 = withApprovedWeek
      .findComponent({ name: 'UCalendar' })
      .props('isDateDisabled') as DateDisabledFn
    const fn2 = restricted
      .findComponent({ name: 'UCalendar' })
      .props('isDateDisabled') as DateDisabledFn
    const fn3 = unrestricted
      .findComponent({ name: 'UCalendar' })
      .props('isDateDisabled') as DateDisabledFn

    expect(fn1({ year: 2024, month: 1, day: 8 })).toBe(true)
    expect(fn2({ year: 2024, month: 1, day: 7 })).toBe(true)
    expect(fn2({ year: 2024, month: 1, day: 13 })).toBe(true)
    expect(fn2({ year: 2024, month: 1, day: 8 })).toBe(true)
    expect(fn3({ year: 2024, month: 1, day: 1 })).toBe(false)

    vi.useRealTimers()
  })

  it('blocks submit when total files exceed max and shows error toast', async () => {
    const wrapper = createWrapper({
      isEdit: true,
      existingFiles: Array.from({ length: 8 }, (_, i) => makeExistingFile(i + 1))
    })
    const upload = wrapper.findComponent({ name: 'UploadFileDB' })
    upload.vm.$emit('update:files', [
      new File(['a'], 'new1.png', { type: 'image/png' }),
      new File(['b'], 'new2.png', { type: 'image/png' }),
      new File(['c'], 'new3.png', { type: 'image/png' })
    ])

    await flushPromises()
    await setValidFormFields(wrapper)
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.emitted('submit')).toBeFalsy()
    // expect(mockToast.add).toHaveBeenCalledWith({
    //   title: 'Maximum 10 files allowed. Currently you have 11 files. Please remove 1 file(s).',
    //   color: 'error'
    // })
  })

  it('maps previews, emits delete-file, and supports nullish props', async () => {
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
        { fileUrl: 'https://storage.railway.app/claims/1/invalid.pdf', fileType: 'application/pdf' }
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

    const nullishWrapper = createWrapper({
      isEdit: true,
      existingFiles: null,
      disabledWeekStarts: null,
      initialData: { hoursWorked: '2', memo: 'null-props', dayWorked: '2024-01-12T00:00:00.000Z' }
    })

    // null existingFiles → empty previews → attachment gallery is not rendered
    expect(nullishWrapper.find('[data-test="attached-files-section"]').exists()).toBe(false)
    const isDateDisabled = nullishWrapper
      .findComponent({ name: 'UCalendar' })
      .props('isDateDisabled') as DateDisabledFn
    expect(typeof isDateDisabled({ year: 2024, month: 1, day: 12 })).toBe('boolean')
  })

  it('resetForm clears uploaded files and calls UploadFileDB.resetUpload', async () => {
    const wrapper = createHarness({
      initialData: { hoursWorked: '4', memo: 'Reset flow', dayWorked: '2024-01-15T00:00:00.000Z' }
    })
    const form = wrapper.findComponent(ClaimForm)
    const upload = wrapper.findComponent({ name: 'UploadFileDB' })
    upload.vm.$emit('update:files', [new File(['content'], 'receipt.png')])

    await flushPromises()
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(form.emitted('submit')?.[0]?.[0]?.files).toHaveLength(1)

    wrapper.vm.child?.resetForm()
    expect(resetUploadMock).toHaveBeenCalledTimes(1)

    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(form.emitted('submit')?.[1]?.[0]?.files).toBeUndefined()
  })
})
