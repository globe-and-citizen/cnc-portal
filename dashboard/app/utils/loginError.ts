import {
  BaseError,
  ChainMismatchError,
  HttpRequestError,
  SwitchChainError,
  TimeoutError,
  UserRejectedRequestError
} from 'viem'
import type { FetchError } from 'ofetch'

export type LoginErrorCategory
  = | 'user_rejected'
    | 'chain'
    | 'backend'
    | 'network'
    | 'unknown'

export interface ParsedLoginError {
  category: LoginErrorCategory
  message: string
}

const NETWORK_MESSAGE = 'Network error. Check your connection and try again.'

/**
 * Translate any error thrown during the SIWE login flow into a single
 * user-facing message plus a semantic category.
 *
 * The flow can fail at four different layers — wallet connection, network
 * switch, message signature, or the backend auth call — each throwing its own
 * error shape (viem `BaseError`, an EIP-1193 `{ code: 4001 }`, or an ofetch
 * `FetchError`). Callers branch on `category` (e.g. to decide whether to retry
 * or stay quiet) and show `message` in a `UAlert` / toast. Never surface the
 * raw error to the user: it leaks RPC noise and stack traces.
 */
export function parseLoginError(error: unknown): ParsedLoginError {
  // Order matters: the user-rejection and chain checks must run before the
  // generic fall-throughs, since wallets wrap rejections inside other types.
  if (isUserRejection(error)) {
    return {
      category: 'user_rejected',
      message: 'Request cancelled. You declined the wallet prompt — approve it to continue.'
    }
  }

  if (isChainError(error)) {
    return {
      category: 'chain',
      message: 'Wrong network. Switch your wallet to the required network and try again.'
    }
  }

  if (isFetchError(error)) {
    return parseBackendError(error)
  }

  if (isViemNetworkError(error)) {
    return { category: 'network', message: NETWORK_MESSAGE }
  }

  return { category: 'unknown', message: extractMessage(error) }
}

function isUserRejection(error: unknown): boolean {
  if (error instanceof BaseError && error.walk(e => e instanceof UserRejectedRequestError)) {
    return true
  }
  // Some injected wallets throw a raw EIP-1193 rejection that viem never wraps.
  if (getErrorCode(error) === 4001) return true
  return getErrorName(error) === 'UserRejectedRequestError'
}

function isChainError(error: unknown): boolean {
  if (
    error instanceof BaseError
    && error.walk(e => e instanceof SwitchChainError || e instanceof ChainMismatchError)
  ) {
    return true
  }
  const name = getErrorName(error)
  return name === 'SwitchChainError' || name === 'ChainMismatchError'
}

function isViemNetworkError(error: unknown): boolean {
  return (
    error instanceof BaseError
    && !!error.walk(e => e instanceof HttpRequestError || e instanceof TimeoutError)
  )
}

function isFetchError(error: unknown): error is FetchError {
  return getErrorName(error) === 'FetchError'
}

function parseBackendError(error: FetchError): ParsedLoginError {
  const status = error.statusCode ?? error.response?.status
  const data = error.data as { message?: string, error?: string } | undefined
  const backendMessage = data?.message || data?.error

  // No status means the request never reached the server (DNS, CORS, offline).
  if (status === undefined) {
    return { category: 'network', message: NETWORK_MESSAGE }
  }
  if (status >= 500) {
    return { category: 'backend', message: 'Server error. Please try again in a moment.' }
  }
  if (status === 401) {
    return {
      category: 'backend',
      message: backendMessage
        ? `Authentication failed: ${backendMessage}.`
        : 'Authentication failed. Please sign in again.'
    }
  }
  return {
    category: 'backend',
    message: backendMessage || `Request failed (status ${status}). Please try again.`
  }
}

function extractMessage(error: unknown): string {
  if (error instanceof BaseError) return error.shortMessage || error.message
  if (error instanceof Error && error.message) return error.message
  return 'An unexpected error occurred. Please try again.'
}

function getErrorName(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'name' in error) {
    return String((error as { name?: unknown }).name)
  }
  return undefined
}

function getErrorCode(error: unknown): number | undefined {
  let current: unknown = error
  // Walk a short cause chain — injected wallets nest the EIP-1193 code.
  for (let depth = 0; depth < 5 && current && typeof current === 'object'; depth++) {
    const code = (current as { code?: unknown }).code
    if (typeof code === 'number') return code
    current = (current as { cause?: unknown }).cause
  }
  return undefined
}
