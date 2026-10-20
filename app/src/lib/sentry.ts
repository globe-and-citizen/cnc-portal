import axios from 'axios'
import * as Sentry from '@sentry/vue'

export type AxiosErrorSource = 'api' | 'external'

const CAPTURED_STATUS_CODES = new Set([408, 429])

/** Capture actionable Axios failures without reporting expected client errors. */
export function captureAxiosError(error: unknown, source: AxiosErrorSource): void {
  if (!shouldCaptureAxiosError(error)) return

  redactAuthorizationHeader(error)

  Sentry.withScope((scope) => {
    scope.setTag('runtime', 'frontend')
    scope.setTag('error.source', `axios.${source}`)
    scope.setTag('error.operation', 'http-request')

    const status = axios.isAxiosError(error) ? error.response?.status : undefined
    if (status !== undefined) scope.setTag('http.status_code', String(status))

    Sentry.captureException(error)
  })
}

export function shouldCaptureAxiosError(error: unknown): boolean {
  if (!axios.isAxiosError(error) || axios.isCancel(error)) return false

  const status = error.response?.status
  return status === undefined || status >= 500 || CAPTURED_STATUS_CODES.has(status)
}

function redactAuthorizationHeader(error: unknown): void {
  if (!axios.isAxiosError(error) || !error.config?.headers) return

  const headers = error.config.headers
  if (typeof headers.delete === 'function') {
    headers.delete('Authorization')
    headers.delete('authorization')
    return
  }

  delete headers.Authorization
  delete headers.authorization
}
