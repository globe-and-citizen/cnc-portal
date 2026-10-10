/** Transaction Service reads share admission and throttling; writes are never queued or replayed here. */
import type { AxiosError } from 'axios'
import externalApiClient from '@/lib/external.axios'
import { retryAfterDelay } from '@/utils/tokens/coingecko'
import { queryClient } from './queryClient'
import { queryPresets } from './queryFactory'

const requestWindowKey = ['safe-service', 'request-window'] as const
queryClient.setQueryDefaults(requestWindowKey, { ...queryPresets.once, gcTime: Infinity })
let pending: Promise<unknown> = Promise.resolve()
interface RequestWindow {
  nextStartAt: number
  retryAt: number
}

class SafeReadPausedError extends Error {
  readonly status = 429
  constructor() {
    super('Safe transaction service is temporarily limiting requests')
  }
}

async function waitForAdmission(signal?: AbortSignal): Promise<void> {
  signal?.throwIfAborted()
  const window = queryClient.getQueryData<RequestWindow>(requestWindowKey)
  if ((window?.retryAt ?? 0) > Date.now()) throw new SafeReadPausedError()
  const delay = Math.max(0, (window?.nextStartAt ?? 0) - Date.now())
  if (delay)
    await new Promise<void>((resolve, reject) => {
      const abort = () => {
        clearTimeout(timer)
        reject(signal?.reason)
      }
      const timer = setTimeout(() => {
        signal?.removeEventListener('abort', abort)
        resolve()
      }, delay)
      signal?.addEventListener('abort', abort, { once: true })
    })
  signal?.throwIfAborted()
  queryClient.setQueryData<RequestWindow>(requestWindowKey, {
    nextStartAt: Date.now() + 1000,
    retryAt: window?.retryAt ?? 0
  })
}

/** Return the provider body and attach the configured key only to the official Transaction Service. */
export function getSafeServiceResponse<T>(url: string, signal?: AbortSignal): Promise<T> {
  const operation = pending.then(async () => {
    await waitForAdmission(signal)
    const target = new URL(url)
    const key = import.meta.env.VITE_APP_SAFE_API_KEY?.trim()
    const headers =
      key &&
      target.origin === 'https://api.safe.global' &&
      target.pathname.startsWith('/tx-service/')
        ? { Authorization: `Bearer ${key}` }
        : undefined
    try {
      const { data } = await externalApiClient.get<T>(url, {
        signal,
        ...(headers ? { headers } : {})
      })
      return data
    } catch (error) {
      const failure = error as AxiosError
      // Consumers may log the failure; retain HTTP diagnostics without its API credential.
      if (failure.config?.headers) {
        delete failure.config.headers.Authorization
        delete failure.config.headers.authorization
      }
      if ((failure.response?.status ?? failure.status) === 429) {
        const retryAt =
          Date.now() + retryAfterDelay(failure.response?.headers?.['retry-after'], Date.now())
        queryClient.setQueryData<RequestWindow>(requestWindowKey, (window) => ({
          nextStartAt: window?.nextStartAt ?? 0,
          retryAt: Math.max(window?.retryAt ?? 0, retryAt)
        }))
      }
      throw error
    }
  })
  pending = operation.catch(() => undefined)
  return operation
}
