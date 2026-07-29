/**
 * Canonical date formatting.
 *
 * `dayjs` is the single date library in the monorepo, and this module is the
 * only place in `app/` allowed to call `.format()` for display — every other
 * file asks for a *named* style instead of re-inventing a pattern string.
 * ESLint enforces the ban on `toLocaleString` / `Intl.DateTimeFormat`. See
 * `.github/copilot-instructions/formatting-standards.md`.
 */

import dayjs, { type Dayjs } from 'dayjs'
import utc from 'dayjs/plugin/utc'

import { EMPTY_VALUE } from './shared'

dayjs.extend(utc)

/**
 * Anything a date formatter accepts.
 *
 * A bare `number` is **milliseconds** (the JavaScript convention). On-chain
 * timestamps are seconds — run them through {@link fromUnix} rather than
 * sprinkling `* 1000` at call sites, which is where the off-by-1000 bugs that
 * render `Jan 1, 1970` come from.
 */
export type DateInput = Date | string | number | Dayjs

function toDayjs(value: DateInput | null | undefined): Dayjs | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed : null
}

/** Unix **seconds** (block timestamps, contract structs) → a `Dayjs` the formatters accept. */
export function fromUnix(seconds: number | string | bigint): Dayjs {
  return dayjs(Number(seconds) * 1000)
}

/** `Jan 8, 2026` — the default for any date shown on its own. */
export function formatDate(value: DateInput | null | undefined): string {
  return toDayjs(value)?.format('MMM D, YYYY') ?? EMPTY_VALUE
}

/**
 * `Jan 8, 2026, 14:05:32` — a date **with time of day**.
 *
 * Use it wherever rows are ordered chronologically: two ledger entries from the
 * same day must stay distinguishable, or the table reads as arbitrarily sorted.
 */
export function formatDateTime(value: DateInput | null | undefined): string {
  return toDayjs(value)?.format('MMM D, YYYY, HH:mm:ss') ?? EMPTY_VALUE
}

/** `Jan 8` — for chart axes and dense tables where the year is already established. */
export function formatDateShort(value: DateInput | null | undefined): string {
  return toDayjs(value)?.format('MMM D') ?? EMPTY_VALUE
}

/** `January 2026` — period headers. */
export function formatMonthYear(value: DateInput | null | undefined): string {
  return toDayjs(value)?.format('MMMM YYYY') ?? EMPTY_VALUE
}

/**
 * `2026-01-08` — sortable, locale-free.
 *
 * For export filenames, CSV columns and API payloads, never for UI copy: a
 * human reading a screen wants `Jan 8, 2026`.
 */
export function formatDateIso(value: DateInput | null | undefined): string {
  return toDayjs(value)?.format('YYYY-MM-DD') ?? EMPTY_VALUE
}

/**
 * `2026-01-08 14:05 UTC` — an unambiguous instant.
 *
 * Use it for anything a user may have to line up against a block explorer or a
 * contract deadline, where "which timezone?" is a costly question.
 */
export function formatDateUtc(value: DateInput | null | undefined): string {
  return toDayjs(value)?.utc().format('YYYY-MM-DD HH:mm [UTC]') ?? EMPTY_VALUE
}

/**
 * `just now`, `3 min ago`, `5 h ago`, `2 d ago`, then falls back to
 * {@link formatDate} past a week — beyond which "37 d ago" stops being easier
 * to read than the date itself.
 *
 * Relative labels are for freshness cues (last sync, latest activity). A value
 * the user has to act on gets an absolute date.
 */
export function formatDateRelative(value: DateInput | null | undefined): string {
  const date = toDayjs(value)
  if (!date) return EMPTY_VALUE

  const seconds = Math.floor((Date.now() - date.valueOf()) / 1000)
  if (seconds < 0) return formatDate(date)

  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  if (hours < 24) return `${hours} h ago`
  if (days < 7) return `${days} d ago`
  return formatDate(date)
}

/**
 * `2 h 30 min`, `45 min`, `3 d 4 h` — an elapsed **duration**, from minutes.
 *
 * Durations are not clock times: `90` minutes is `1 h 30 min`, never `01:30`,
 * which reads as half past one in the morning.
 */
export function formatDuration(totalMinutes: number | null | undefined): string {
  if (totalMinutes === null || totalMinutes === undefined || !Number.isFinite(totalMinutes)) {
    return EMPTY_VALUE
  }

  const sign = totalMinutes < 0 ? '-' : ''
  const absolute = Math.round(Math.abs(totalMinutes))
  const days = Math.floor(absolute / (60 * 24))
  const hours = Math.floor((absolute % (60 * 24)) / 60)
  const minutes = absolute % 60

  const parts: string[] = []
  if (days) parts.push(`${days} d`)
  if (hours) parts.push(`${hours} h`)
  if (minutes || parts.length === 0) parts.push(`${minutes} min`)

  return sign + parts.join(' ')
}
