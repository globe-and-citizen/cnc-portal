import { computed, ref, shallowRef, watch } from 'vue'
import type { DateRange } from 'reka-ui'
import { differenceInCalendarDays, differenceInMonths, differenceInYears } from '@/utils/dayUtils'

interface CalendarDateLike {
  year: number
  month: number
  day: number
}

const isCalendarDateLike = (value: unknown): value is CalendarDateLike => {
  if (!value || typeof value !== 'object') return false

  const parsed = value as Record<string, unknown>
  return (
    typeof parsed.year === 'number' &&
    typeof parsed.month === 'number' &&
    typeof parsed.day === 'number'
  )
}

const calendarDateToDate = (value: CalendarDateLike): Date =>
  new Date(value.year, value.month - 1, value.day)

const formatDate = (value: Date): string => value.toLocaleDateString('en-GB')

export interface VestingDuration {
  years: number
  months: number
  days: number
}

/**
 * Owns the vesting "Period" selection: the calendar range binding and the
 * derived duration (years/months/days + total days) kept in sync with it.
 */
export function useVestingDateRange() {
  const dateRange = ref<[Date, Date] | null>(null)
  // Keep calendar values in a shallow ref to preserve DateValue nominal types.
  const calendarRange = shallowRef<DateRange | null>(null)
  const isDatePickerOpen = ref(false)
  const duration = ref<VestingDuration>({ years: 0, months: 0, days: 0 })
  const durationInDays = ref(0)

  const dateRangeLabel = computed(() => {
    if (!dateRange.value) return 'Select range'
    return `${formatDate(dateRange.value[0])} - ${formatDate(dateRange.value[1])}`
  })

  const onDateRangeChange = (value: DateRange | null) => {
    calendarRange.value = value

    if (
      !value?.start ||
      !value?.end ||
      !isCalendarDateLike(value.start) ||
      !isCalendarDateLike(value.end)
    ) {
      dateRange.value = null
      return
    }

    dateRange.value = [calendarDateToDate(value.start), calendarDateToDate(value.end)]
    isDatePickerOpen.value = false
  }

  watch(dateRange, (val) => {
    if (!val || val.length !== 2) {
      calendarRange.value = null
      durationInDays.value = 0
      duration.value = { years: 0, months: 0, days: 0 }
      return
    }

    const [start, end] = val

    const days = differenceInCalendarDays(end, start)
    if (days < 0) {
      durationInDays.value = 0
      duration.value = { years: 0, months: 0, days: 0 }
      return
    }

    const years = differenceInYears(end, start)
    const months = differenceInMonths(end, start) % 12
    const leftoverDays = days - years * 365 - months * 30
    durationInDays.value = days
    duration.value = { years, months, days: leftoverDays }
  })

  return {
    dateRange,
    calendarRange,
    isDatePickerOpen,
    duration,
    durationInDays,
    dateRangeLabel,
    onDateRangeChange
  }
}
