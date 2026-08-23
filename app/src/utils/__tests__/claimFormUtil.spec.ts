import { describe, expect, it, vi } from 'vitest'
import {
  DAILY_CLAIM_MEMO_MAX_LENGTH,
  buildClaimFormSchema,
  createDefaultClaimFormData,
  formatClaimDayUTC,
  getClaimDayFromCalendarValue,
  getClaimFilePreviews,
  isClaimDateDisabled
} from '@/utils/claimFormUtil'
import { DEFAULT_MAXIMUM_HOURS_PER_DAY } from '@/utils/wageUtil'

const formFields = {
  hoursWorked: '1',
  minutesWorked: '0',
  dayWorked: '2024-01-10T00:00:00.000Z'
}

describe('claimFormUtil', () => {
  it('creates form data from defaults and supplied values', () => {
    const data = createDefaultClaimFormData({
      minutesWorked: '40',
      memo: 'Updated',
      dayWorked: '2024-01-15T00:00:00.000Z'
    })

    expect(data).toMatchObject({
      hoursWorked: '0',
      minutesWorked: '40',
      memo: 'Updated',
      dayWorked: '2024-01-15T00:00:00.000Z'
    })
  })

  it('enforces memo bounds after trimming', () => {
    const schema = buildClaimFormSchema()

    for (const length of [1, DAILY_CLAIM_MEMO_MAX_LENGTH]) {
      const memo = ' ' + 'm'.repeat(length) + ' '
      const result = schema.safeParse({ ...formFields, memo })

      expect(result.success).toBe(true)
      if (result.success) expect(result.data.memo).toBe(memo.trim())
    }

    expect(schema.safeParse({ ...formFields, memo: '' }).success).toBe(false)
    expect(schema.safeParse({ ...formFields, memo: '   ' }).success).toBe(false)
    expect(
      schema.safeParse({
        ...formFields,
        memo: 'm'.repeat(DAILY_CLAIM_MEMO_MAX_LENGTH + 1)
      }).success
    ).toBe(false)
  })

  it('applies the supplied or default daily cap', () => {
    const cappedSchema = buildClaimFormSchema(6)

    expect(
      cappedSchema.safeParse({
        ...formFields,
        hoursWorked: '5',
        minutesWorked: '30',
        memo: 'Within the cap'
      }).success
    ).toBe(true)
    expect(
      cappedSchema.safeParse({
        ...formFields,
        hoursWorked: '6',
        minutesWorked: '10',
        memo: 'Over the cap'
      }).success
    ).toBe(false)

    const defaultSchema = buildClaimFormSchema()
    expect(
      defaultSchema.safeParse({
        ...formFields,
        hoursWorked: String(DEFAULT_MAXIMUM_HOURS_PER_DAY),
        memo: 'Full day'
      }).success
    ).toBe(true)
    expect(
      defaultSchema.safeParse({
        ...formFields,
        hoursWorked: String(DEFAULT_MAXIMUM_HOURS_PER_DAY),
        minutesWorked: '10',
        memo: 'Over the default cap'
      }).success
    ).toBe(false)
  })

  it('counts existing work on the same day against the daily cap', () => {
    const schema = buildClaimFormSchema(8, [
      { minutesWorked: 420, dayWorked: '2024-01-10T00:00:00.000Z' }
    ])

    const overLimit = schema.safeParse({
      ...formFields,
      hoursWorked: '2',
      memo: 'Over remaining time'
    })
    const otherDay = schema.safeParse({
      ...formFields,
      hoursWorked: '2',
      memo: 'Different day',
      dayWorked: '2024-01-11T00:00:00.000Z'
    })

    expect(overLimit.success).toBe(false)
    expect(
      overLimit.error?.issues.find((issue) => issue.path.includes('hoursWorked'))?.message
    ).toContain('Already claimed: 7h')
    expect(otherDay.success).toBe(true)
  })

  it('maps existing files and validates calendar selections', () => {
    const previews = getClaimFilePreviews([
      {
        fileType: 'image/png',
        fileSize: 1024,
        fileKey: 'claims/1/proof.png',
        fileUrl: 'https://example.com/proof.png'
      },
      { fileType: 'application/pdf', fileUrl: 'https://example.com/incomplete.pdf' }
    ])

    expect(previews).toEqual([expect.objectContaining({ fileName: 'proof.png', isImage: true })])
    expect(getClaimDayFromCalendarValue({ start: undefined, end: undefined })).toBeUndefined()
    expect(getClaimDayFromCalendarValue({ year: 2024, month: 1, day: 11 })).toBe(
      '2024-01-11T00:00:00.000Z'
    )
  })

  it('formats UTC dates and applies calendar restrictions', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(Date.UTC(2024, 0, 12, 0, 0, 0)))

    expect(formatClaimDayUTC(null)).toBe('')
    expect(formatClaimDayUTC(new Date(Date.UTC(2024, 0, 20, 5, 30, 0)))).toBe('2024-01-20 UTC')
    expect(formatClaimDayUTC('2024-02-15T12:00:00.000Z')).toBe('2024-02-15 UTC')
    expect(
      isClaimDateDisabled(
        { year: 2024, month: 1, day: 8 },
        { disabledWeekStarts: ['2024-01-08T00:00:00.000Z'] }
      )
    ).toBe(true)
    expect(isClaimDateDisabled({ year: 2024, month: 1, day: 13 }, {})).toBe(true)
    expect(isClaimDateDisabled({ year: 2024, month: 1, day: 1 }, { restrictSubmit: false })).toBe(
      false
    )

    vi.useRealTimers()
  })
})
