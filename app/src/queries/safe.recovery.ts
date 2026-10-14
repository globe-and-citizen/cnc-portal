import { AxiosHeaders, isAxiosError } from 'axios'
import { isSafeNotIndexedError } from '@/utils/safe/model'

/**
 * Gaps between attempts while Safe services index a newly deployed Safe, about 3.5 minutes in all.
 * After two quick checks, every gap outlasts the Gateway's cached not-found answer (30 s ± 10 %),
 * so each later attempt reaches the indexer again.
 */
const SAFE_INDEXING_RETRY_DELAYS = [5000, 10_000, 20_000, 35_000, 35_000, 35_000, 35_000, 35_000]

/** Bounded recovery for transient provider failures. */
export function retrySafeRead(failureCount: number, error: Error): boolean {
  if (failureCount >= 3 || !isAxiosError<{ detail?: string }>(error)) return false
  if (error.code === 'ERR_CANCELED') return false
  const status = error.response?.status ?? error.status
  if (status === 429 && error.response?.data?.detail === 'Monthly quota exceeded.') return false
  if (status === undefined) return true
  return [404, 408, 425, 429].includes(status) || (status >= 500 && status < 600)
}

/** Fixed interval between attempts, extended when the provider asks us to wait. */
export function safeReadRetryDelay(_attempt: number, error: Error): number {
  const failure = isAxiosError(error) ? error : undefined
  const status = failure?.response?.status ?? failure?.status
  const interval = status === 429 ? 30_000 : 5000
  const headers = failure?.response?.headers
  const header =
    headers instanceof AxiosHeaders
      ? headers.get('Retry-After')
      : (headers?.['retry-after'] ?? headers?.['Retry-After'])
  if (typeof header !== 'string' && typeof header !== 'number') return interval
  const value = String(header).trim()
  const wait = /^\d+(\.\d+)?$/.test(value) ? Number(value) * 1000 : Date.parse(value) - Date.now()
  return Number.isFinite(wait) ? Math.max(interval, wait) : interval
}

/** Safe information and balances keep waiting for a new Safe to be indexed; other failures stay bounded. */
export function retrySafeIndexingRead(failureCount: number, error: Error): boolean {
  if (!isSafeNotIndexedError(error)) return retrySafeRead(failureCount, error)
  return failureCount < SAFE_INDEXING_RETRY_DELAYS.length
}

/** Indexing gaps for a Safe that is not indexed yet; other failures keep their usual interval. */
export function safeIndexingRetryDelay(failureCount: number, error: Error): number {
  if (!isSafeNotIndexedError(error)) return safeReadRetryDelay(failureCount, error)
  return SAFE_INDEXING_RETRY_DELAYS[failureCount] ?? 35_000
}
