import { computed, ref, watch, type Ref } from 'vue'
import { parseDate } from '@internationalized/date'
import type { CalendarDate, DateValue } from '@internationalized/date'
import { z } from 'zod'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import type { ClaimFormData } from '@/types'

dayjs.extend(utc)

export interface ClaimFormFileData {
  fileName?: string
  fileType: string
  fileSize: number
  fileKey: string
  fileUrl: string
}

interface UseClaimFormToast {
  add: (payload: { title: string; color: 'error' | 'success' | 'warning' | 'info' | 'primary' }) => void
}

interface UseClaimFormOptions {
  initialData: Ref<Partial<ClaimFormData> | undefined>
  existingFiles: Ref<Partial<ClaimFormFileData>[] | null | undefined>
  disabledWeekStarts: Ref<string[] | null | undefined>
  restrictSubmit: Ref<boolean>
  toast: UseClaimFormToast
  maxFiles?: number
}

export type CalendarSelectionValue =
  | DateValue
  | { start: DateValue | undefined; end: DateValue | undefined }
  | DateValue[]
  | null
  | undefined

export interface ClaimFormSubmitPayload {
  hoursWorked: number
  memo: string
  dayWorked: string
  files?: File[]
}

const DEFAULT_MAX_FILES = 10

const createDefaultFormData = (overrides?: Partial<ClaimFormData>): ClaimFormData => ({
  hoursWorked: overrides?.hoursWorked ?? '0',
  minutesWorked: overrides?.minutesWorked ?? '0',
  memo: overrides?.memo ?? '',
  dayWorked: overrides?.dayWorked ?? dayjs().utc().startOf('day').toISOString()
})

const isSingleDateValue = (value: unknown): value is DateValue => {
  if (!value || Array.isArray(value) || typeof value !== 'object') return false
  return 'year' in value && 'month' in value && 'day' in value
}

export const formatUTC = (value: Date | string | null | undefined): string => {
  if (!value) return ''
  if (value instanceof Date) {
    const year = value.getFullYear()
    const month = value.getMonth()
    const day = value.getDate()
    return dayjs.utc(Date.UTC(year, month, day)).format('YYYY-MM-DD [UTC]')
  }
  return dayjs.utc(value).format('YYYY-MM-DD [UTC]')
}

const claimSchema = z
  .object({
    hoursWorked: z
      .union([z.string(), z.number()])
      .refine((val) => String(val).trim() !== '', { message: 'Hours is required' })
      .refine((val) => !isNaN(Number(val)), { message: 'Must be a valid number' })
      .refine((val) => Number(val) >= 0, { message: 'Hours cannot be negative' })
      .refine((val) => Number(val) <= 24, { message: 'Cannot exceed 24 hours' })
      .refine((val) => Number.isInteger(Number(val)), { message: 'Hours must be a whole number' }),
    minutesWorked: z
      .union([z.string(), z.number()])
      .refine((val) => !isNaN(Number(val)), { message: 'Must be a valid number' }),
    memo: z.string().min(1, 'Memo is required').max(3000, 'Memo must not exceed 3000 characters'),
    dayWorked: z.string().min(1, 'Date is required')
  })
  .refine((data) => [0, 10, 20, 30, 40, 50].includes(Number(data.minutesWorked)), {
    message: 'Minutes must be 0, 10, 20, 30, 40, or 50',
    path: ['hoursWorked']
  })
  .refine((data) => Number(data.hoursWorked) * 60 + Number(data.minutesWorked) > 0, {
    message: 'Duration must be greater than 0',
    path: ['hoursWorked']
  })

export function useClaimForm(options: UseClaimFormOptions) {
  const maxFiles = options.maxFiles ?? DEFAULT_MAX_FILES
  const uploadedFiles = ref<File[]>([])
  const datePickerOpen = ref(false)
  const minutesOptions = ['0', '10', '20', '30', '40', '50']

  const formData = ref<ClaimFormData>(createDefaultFormData(options.initialData.value))

  watch(
    () => options.initialData.value,
    (newInitialData) => {
      formData.value = createDefaultFormData(newInitialData)
    },
    { deep: true }
  )

  const existingFilePreviews = computed(() => {
    return (options.existingFiles.value ?? [])
      .filter((file) => file && file.fileUrl && file.fileType && file.fileKey)
      .map((file) => {
        const fileUrl = file.fileUrl!
        const fileType = file.fileType!
        const fileSize = file.fileSize || 0
        const fileKey = file.fileKey!
        const fileName = file.fileName || fileKey.split('/').pop() || 'file'
        return {
          previewUrl: fileUrl,
          fileName,
          fileSize,
          fileType,
          isImage: fileType.startsWith('image/')
        }
      })
  })

  const calendarDisplayDate = computed(() => {
    if (!formData.value.dayWorked) return 'Select a date'
    return formatUTC(formData.value.dayWorked)
  })

  const calendarValue = computed<CalendarDate | undefined>(() => {
    if (!formData.value.dayWorked) return undefined
    try {
      const [isoDatePart] = formData.value.dayWorked.split('T')
      if (!isoDatePart) return undefined
      return parseDate(isoDatePart) as CalendarDate
    } catch {
      return undefined
    }
  })

  const isDateDisabledFn = computed(() => {
    return (date: DateValue): boolean => {
      const { year, month, day } = date
      const d = dayjs
        .utc(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
        .startOf('day')
      const today = dayjs.utc().startOf('day')

      const disabledWeekKeys = (options.disabledWeekStarts.value ?? []).map((w) =>
        dayjs.utc(w).startOf('isoWeek').format('YYYY-MM-DD')
      )
      const dateWeekKey = d.startOf('isoWeek').format('YYYY-MM-DD')

      if (disabledWeekKeys.includes(dateWeekKey)) return true

      if (options.restrictSubmit.value) {
        const currentWeekStart = today.startOf('isoWeek')
        const currentWeekEnd = today.endOf('isoWeek')
        if (d.isBefore(currentWeekStart, 'day') || d.isAfter(currentWeekEnd, 'day')) return true
        const daysDiff = today.diff(d, 'day')
        return daysDiff < 0 || daysDiff > 4
      }

      return false
    }
  })

  const onFilesUpdate = (files: File[]): void => {
    uploadedFiles.value = files
  }

  const onDateSelect = (value: CalendarSelectionValue) => {
    if (!isSingleDateValue(value)) return
    const { year, month, day } = value
    formData.value.dayWorked = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00.000Z`
    datePickerOpen.value = false
  }

  const buildSubmitPayload = (): ClaimFormSubmitPayload | null => {
    const totalFiles = (options.existingFiles.value?.length ?? 0) + uploadedFiles.value.length
    if (totalFiles > maxFiles) {
      options.toast.add({
        title: `Maximum ${maxFiles} files allowed. Currently you have ${totalFiles} files. Please remove ${totalFiles - maxFiles} file(s).`,
        color: 'error'
      })
      return null
    }

    return {
      hoursWorked: Number(formData.value.hoursWorked) * 60 + Number(formData.value.minutesWorked),
      memo: formData.value.memo,
      dayWorked: formData.value.dayWorked,
      files: uploadedFiles.value.length ? uploadedFiles.value : undefined
    }
  }

  const resetUploadedFiles = () => {
    uploadedFiles.value = []
  }

  return {
    claimSchema,
    formData,
    uploadedFiles,
    datePickerOpen,
    minutesOptions,
    existingFilePreviews,
    calendarDisplayDate,
    calendarValue,
    isDateDisabledFn,
    onFilesUpdate,
    onDateSelect,
    buildSubmitPayload,
    resetUploadedFiles,
    formatUTC
  }
}