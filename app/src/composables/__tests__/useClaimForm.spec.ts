import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { useClaimForm, formatUTC } from '@/composables/useClaimForm'

const createOptions = () => {
  const toast = { add: vi.fn() }

  return {
    initialData: ref({
      hoursWorked: '2',
      minutesWorked: '10',
      memo: 'Initial memo',
      dayWorked: '2024-01-10T00:00:00.000Z'
    }),
    existingFiles: ref([
      {
        fileType: 'image/png',
        fileSize: 1024,
        fileKey: 'claims/1/proof.png',
        fileUrl: 'https://example.com/proof.png'
      }
    ]),
    disabledWeekStarts: ref<string[] | null>(['2024-01-08T00:00:00.000Z']),
    restrictSubmit: ref(true),
    toast
  }
}

describe('useClaimForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates form state when initialData changes', async () => {
    const options = createOptions()
    const { formData } = useClaimForm(options)

    options.initialData.value = {
      hoursWorked: '5',
      minutesWorked: '40',
      memo: 'Updated',
      dayWorked: '2024-01-15T00:00:00.000Z'
    }
    await nextTick()

    expect(formData.value.hoursWorked).toBe('5')
    expect(formData.value.minutesWorked).toBe('40')
    expect(formData.value.memo).toBe('Updated')
    expect(formData.value.dayWorked).toBe('2024-01-15T00:00:00.000Z')
  })

  it('maps existing files and handles date selection', () => {
    const options = createOptions()
    const { existingFilePreviews, onDateSelect, formData, datePickerOpen } = useClaimForm(options)

    expect(existingFilePreviews.value).toHaveLength(1)
    expect(existingFilePreviews.value[0]?.fileName).toBe('proof.png')
    expect(existingFilePreviews.value[0]?.isImage).toBe(true)

    onDateSelect({ start: undefined, end: undefined })
    expect(formData.value.dayWorked).toBe('2024-01-10T00:00:00.000Z')

    datePickerOpen.value = true
    onDateSelect({ year: 2024, month: 1, day: 11 })
    expect(formData.value.dayWorked).toBe('2024-01-11T00:00:00.000Z')
    expect(datePickerOpen.value).toBe(false)
  })

  it('builds payload and blocks submit over max files', () => {
    const options = createOptions()
    const { onFilesUpdate, buildSubmitPayload } = useClaimForm(options)

    onFilesUpdate([new File(['1'], 'a.png'), new File(['2'], 'b.png')])
    const payload = buildSubmitPayload()
    expect(payload?.minutesWorked).toBe(130)
    expect(payload?.memo).toBe('Initial memo')
    expect(payload?.files).toHaveLength(2)

    options.existingFiles.value = Array.from({ length: 10 }, (_, i) => ({
      fileType: 'image/png',
      fileSize: 100,
      fileKey: `claims/1/${i}.png`,
      fileUrl: `https://example.com/${i}.png`
    }))
    onFilesUpdate([new File(['3'], 'c.png')])
    const blockedPayload = buildSubmitPayload()

    expect(blockedPayload).toBeNull()
    expect(options.toast.add).toHaveBeenCalledTimes(1)
  })

  it('applies date disabling rules for approved weeks and restrictions', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(Date.UTC(2024, 0, 12, 0, 0, 0)))

    const options = createOptions()
    const { isDateDisabledFn } = useClaimForm(options)

    expect(isDateDisabledFn.value({ year: 2024, month: 1, day: 8 })).toBe(true)
    expect(isDateDisabledFn.value({ year: 2024, month: 1, day: 13 })).toBe(true)

    options.restrictSubmit.value = false
    expect(isDateDisabledFn.value({ year: 2024, month: 1, day: 1 })).toBe(false)

    vi.useRealTimers()
  })

  it('formats UTC dates consistently', () => {
    expect(formatUTC(null)).toBe('')
    expect(formatUTC(undefined)).toBe('')
    expect(formatUTC(new Date(Date.UTC(2024, 0, 20, 5, 30, 0)))).toBe('2024-01-20 UTC')
    expect(formatUTC('2024-02-15T12:00:00.000Z')).toBe('2024-02-15 UTC')
  })
})
