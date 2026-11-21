import dayjs from 'dayjs'

/** Subtract calendar months and days before clock hours and minutes. */
export function subtractDate(date: Date, duration: { months?: number, days?: number, hours?: number, minutes?: number }): Date {
  return dayjs(date)
    .subtract(duration.months ?? 0, 'month')
    .subtract(duration.days ?? 0, 'day')
    .subtract(duration.hours ?? 0, 'hour')
    .subtract(duration.minutes ?? 0, 'minute')
    .toDate()
}
