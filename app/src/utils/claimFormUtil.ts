import type { DateValue } from '@internationalized/date'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import utc from 'dayjs/plugin/utc'
import { z } from 'zod'
import type { Claim, ClaimFormData, FileAttachment } from '@/types'
import type { FilePreviewItem } from '@/types/file-preview'
import { DEFAULT_MAXIMUM_HOURS_PER_DAY } from '@/utils/wageUtil'
import { formatDateIso } from '@/utils/format'

dayjs.extend(utc)
dayjs.extend(isoWeek)

export interface ClaimFormFileData extends FileAttachment {
  fileName?: string
}

export interface ClaimSubmissionRules {
  disabledWeekStarts?: string[] | null
  restrictSubmit?: boolean
  maximumHoursPerDay?: number
  existingClaims?: Pick<Claim, 'minutesWorked' | 'dayWorked'>[]
}

export type CalendarSelectionValue =
  | DateValue
  | { start: DateValue | undefined; end: DateValue | undefined }
  | DateValue[]
  | null
  | undefined

export const DAILY_CLAIM_MEMO_MAX_LENGTH = 3_000

const dailyClaimMemoSchema = z
  .string()
  .trim()
  .min(1, 'Memo is required')
  .max(
    DAILY_CLAIM_MEMO_MAX_LENGTH,
    'Memo must not exceed ' + DAILY_CLAIM_MEMO_MAX_LENGTH + ' characters'
  )

export const createDefaultClaimFormData = (overrides?: Partial<ClaimFormData>): ClaimFormData => ({
  hoursWorked: overrides?.hoursWorked ?? '0',
  minutesWorked: overrides?.minutesWorked ?? '0',
  memo: overrides?.memo ?? '',
  dayWorked: overrides?.dayWorked ?? dayjs().utc().startOf('day').toISOString()
})

export const formatClaimDayUTC = (value: Date | string | null | undefined): string => {
  if (!value) return ''

  if (value instanceof Date) {
    const year = value.getFullYear()
    const month = value.getMonth()
    const day = value.getDate()
    return formatDateIso(dayjs.utc(Date.UTC(year, month, day))) + ' UTC'
  }

  return formatDateIso(dayjs.utc(value)) + ' UTC'
}

export const getClaimFilePreviews = (
  files: Partial<ClaimFormFileData>[] | null | undefined
): FilePreviewItem[] =>
  (files ?? [])
    .filter((file) => file && file.fileUrl && file.fileType && file.fileKey)
    .map((file) => {
      const fileKey = file.fileKey!

      return {
        previewUrl: file.fileUrl!,
        fileName: file.fileName || fileKey.split('/').pop() || 'file',
        fileSize: file.fileSize || 0,
        fileType: file.fileType!,
        isImage: file.fileType!.startsWith('image/')
      }
    })

const isSingleDateValue = (value: unknown): value is DateValue => {
  if (!value || Array.isArray(value) || typeof value !== 'object') return false
  return 'year' in value && 'month' in value && 'day' in value
}

export const getClaimDayFromCalendarValue = (value: CalendarSelectionValue): string | undefined => {
  if (!isSingleDateValue(value)) return undefined

  const { year, month, day } = value
  return (
    String(year) +
    '-' +
    String(month).padStart(2, '0') +
    '-' +
    String(day).padStart(2, '0') +
    'T00:00:00.000Z'
  )
}

export const isClaimDateDisabled = (
  date: DateValue,
  { disabledWeekStarts, restrictSubmit = true }: ClaimSubmissionRules
): boolean => {
  const { year, month, day } = date
  const selectedDay = dayjs
    .utc(String(year) + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0'))
    .startOf('day')
  const today = dayjs.utc().startOf('day')
  const disabledWeekKeys = (disabledWeekStarts ?? []).map((weekStart) =>
    formatDateIso(dayjs.utc(weekStart).startOf('isoWeek'))
  )
  const selectedWeekKey = formatDateIso(selectedDay.startOf('isoWeek'))

  if (disabledWeekKeys.includes(selectedWeekKey)) return true
  if (!restrictSubmit) return false

  const currentWeekStart = today.startOf('isoWeek')
  const currentWeekEnd = today.endOf('isoWeek')
  if (selectedDay.isBefore(currentWeekStart, 'day') || selectedDay.isAfter(currentWeekEnd, 'day')) {
    return true
  }

  const daysDiff = today.diff(selectedDay, 'day')
  return daysDiff < 0 || daysDiff > 4
}

const alreadyClaimedForDay = (
  claims: Pick<Claim, 'minutesWorked' | 'dayWorked'>[],
  dayWorked: string
): number =>
  claims
    .filter((claim) => claim.dayWorked === dayWorked)
    .reduce((sum, claim) => sum + claim.minutesWorked, 0)

const formatMinutes = (minutes: number): string => {
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder > 0 ? String(hours) + 'h' + String(remainder) + 'min' : String(hours) + 'h'
}

export const buildClaimFormSchema = (
  maximumHoursPerDay?: number,
  existingClaims?: Pick<Claim, 'minutesWorked' | 'dayWorked'>[]
) => {
  const hasCap = typeof maximumHoursPerDay === 'number' && maximumHoursPerDay > 0
  const effectiveCap = hasCap ? maximumHoursPerDay : DEFAULT_MAXIMUM_HOURS_PER_DAY
  const maxMinutes = effectiveCap * 60

  return z
    .object({
      hoursWorked: z
        .union([z.string(), z.number()])
        .refine((value) => String(value).trim() !== '', { message: 'Hours is required' })
        .refine((value) => !isNaN(Number(value)), { message: 'Must be a valid number' })
        .refine((value) => Number(value) >= 0, { message: 'Hours cannot be negative' })
        .refine((value) => Number(value) <= effectiveCap, {
          message: 'Cannot exceed ' + effectiveCap + ' hours'
        })
        .refine((value) => Number.isInteger(Number(value)), {
          message: 'Hours must be a whole number'
        }),
      minutesWorked: z
        .union([z.string(), z.number()])
        .refine((value) => !isNaN(Number(value)), { message: 'Must be a valid number' }),
      memo: dailyClaimMemoSchema,
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
    .refine((data) => Number(data.hoursWorked) * 60 + Number(data.minutesWorked) <= maxMinutes, {
      message: 'Cannot exceed daily cap of ' + effectiveCap + ' hours',
      path: ['hoursWorked']
    })
    .superRefine((data, ctx) => {
      if (!existingClaims?.length) return

      const inputMinutes = Number(data.hoursWorked) * 60 + Number(data.minutesWorked)
      const claimed = alreadyClaimedForDay(existingClaims, data.dayWorked)
      if (inputMinutes + claimed <= maxMinutes) return

      const remaining = Math.max(0, maxMinutes - claimed)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Daily limit would be exceeded. ' +
          'Allowance: ' +
          formatMinutes(maxMinutes) +
          '. Already claimed: ' +
          formatMinutes(claimed) +
          '. Remaining: ' +
          formatMinutes(remaining) +
          '.',
        path: ['hoursWorked']
      })
    })
}
