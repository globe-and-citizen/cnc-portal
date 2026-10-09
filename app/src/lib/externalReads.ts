import externalApiClient from './external.axios'

export class ExternalReadError extends Error {
  constructor(
    public readonly status: number,
    public readonly retryAfter?: string | null
  ) {
    super(`External read failed (${status})`)
  }
}

export function failureDetails(error: unknown): { status?: number; retryAfter?: string | null } {
  const visited = new Set<unknown>()
  while (error && typeof error === 'object' && !visited.has(error)) {
    visited.add(error)
    if (error instanceof ExternalReadError) return error
    const failure = error as {
      status?: number
      response?: { status?: number; headers?: Record<string, string> }
      cause?: unknown
    }
    const status = failure.response?.status ?? failure.status
    if (typeof status === 'number')
      return { status, retryAfter: failure.response?.headers?.['retry-after'] }
    error = failure.cause
  }
  return {}
}

function pauseDuration(retryAfter?: string | null): number {
  if (!retryAfter) return 60_000
  const seconds = Number(retryAfter)
  const duration = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retryAfter) - Date.now()
  return Number.isFinite(duration) ? Math.max(30_000, duration) : 60_000
}

function waitForRead(duration: number, signal?: AbortSignal): Promise<void> {
  signal?.throwIfAborted()
  if (duration <= 0) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer)
      reject(signal?.reason)
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort)
      resolve()
    }, duration)
    signal?.addEventListener('abort', abort, { once: true })
  })
}

/** Pace reads within this browser session; a 429 pauses the whole provider queue. */
export function createExternalReadQueue(spacing: number) {
  let tail: Promise<unknown> = Promise.resolve()
  let nextStart = 0
  let blockedUntil = 0

  return <T>(request: () => Promise<T>, signal?: AbortSignal): Promise<T> => {
    const result = tail.then(async () => {
      signal?.throwIfAborted()
      if (Date.now() < blockedUntil)
        throw new ExternalReadError(429, String((blockedUntil - Date.now()) / 1000))
      await waitForRead(nextStart - Date.now(), signal)
      signal?.throwIfAborted()
      nextStart = Date.now() + spacing
      try {
        return await request()
      } catch (error) {
        const failure = failureDetails(error)
        if (failure.status === 429) blockedUntil = Date.now() + pauseDuration(failure.retryAfter)
        throw error
      }
    })
    tail = result.catch(() => undefined)
    return result
  }
}

const safeReads = createExternalReadQueue(250)
const marketReads = createExternalReadQueue(2100)

export function getSafeRead<T>(url: string, signal?: AbortSignal) {
  return safeReads(() => externalApiClient.get<T>(url, { signal }), signal)
}

export function getMarketRead<T>(url: string, signal?: AbortSignal) {
  return marketReads(() => externalApiClient.get<T>(url, { signal }), signal)
}
