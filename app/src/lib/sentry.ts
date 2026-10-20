import axios from 'axios'
import * as Sentry from '@sentry/vue'
import { BaseError } from 'viem'
import { classifyError } from '@/utils/errors/classifyContractError'

export type AxiosErrorSource = 'api' | 'external'

export interface Web3ErrorContext {
  operation: string
  /** Use only at a known Web3 boundary that can throw a plain Error. */
  force?: boolean
  contractAddress?: string
  functionName?: string
  chainId?: number
  queryName?: string
}

/** TanStack mutation metadata key used to give specialized Web3 boundaries capture priority. */
export const SENTRY_WEB3_BOUNDARY_META_KEY = 'sentryWeb3Boundary' as const

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

const EXPECTED_WEB3_ERROR_NAMES = new Set([
  'ConnectorAccountNotFoundError',
  'ProviderNotFoundError'
])

const WEB3_ERROR_NAMES = new Set([
  ...EXPECTED_WEB3_ERROR_NAMES,
  'ChainDisconnectedError',
  'ChainMismatchError',
  'ConnectorChainMismatchError',
  'SwitchChainError',
  'TransactionExecutionError',
  'TransactionNotFoundError',
  'TransactionReceiptNotFoundError',
  'WaitForTransactionReceiptTimeoutError',
  'HttpRequestError',
  'RpcRequestError',
  'TimeoutError',
  'UserRejectedRequestError'
])

const capturedWeb3Errors = new WeakSet<object>()

/** Capture actionable Wagmi/viem failures while ignoring expected wallet UX. */
export function captureWeb3Error(error: unknown, context: Web3ErrorContext): void {
  const classification = classifyError(error)
  const isExpected =
    classification.category === 'user_rejected' ||
    classification.category === 'chain_mismatch' ||
    hasErrorName(error, EXPECTED_WEB3_ERROR_NAMES)
  if (isExpected || (!context.force && !shouldCaptureWeb3Error(error))) return

  if (typeof error === 'object' && error !== null) {
    if (capturedWeb3Errors.has(error)) return
    capturedWeb3Errors.add(error)
  }

  Sentry.withScope((scope) => {
    scope.setTag('runtime', 'frontend')
    scope.setTag('error.source', 'wagmi')
    scope.setTag('error.operation', context.operation)
    scope.setTag('web3.error_category', classification.category)

    if (context.contractAddress) scope.setTag('web3.contract_address', context.contractAddress)
    if (context.functionName) scope.setTag('web3.function_name', context.functionName)
    if (context.chainId !== undefined) scope.setTag('web3.chain_id', String(context.chainId))
    if (context.queryName) scope.setTag('web3.query_name', context.queryName)

    Sentry.captureException(error)
  })
}

export function shouldCaptureWeb3Error(error: unknown): boolean {
  if (!isWeb3Error(error)) return false

  const classification = classifyError(error)
  if (classification.category === 'user_rejected' || classification.category === 'chain_mismatch') {
    return false
  }

  return !hasErrorName(error, EXPECTED_WEB3_ERROR_NAMES)
}

function isWeb3Error(error: unknown): boolean {
  return error instanceof BaseError || hasErrorName(error, WEB3_ERROR_NAMES)
}

function hasErrorName(error: unknown, names: Set<string>): boolean {
  let current: unknown = error

  while (current instanceof Error) {
    if (names.has(current.name)) return true
    current = (current as Error & { cause?: unknown }).cause
  }

  return false
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
