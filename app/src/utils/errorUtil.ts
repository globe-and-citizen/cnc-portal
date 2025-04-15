import { decodeErrorResult, type Abi } from 'viem'
import { log } from './generalUtil'

type MetaMaskErrorInfo = {
  error: { code: number; message: string }
  payload: { method: string; params: string[]; jsonrpc: string }
}

/**
 * Parses an error object to extract a meaningful error message.
 *
 * This function takes an error object, checks if it is an instance of the
 * `Error` class, and then further inspects if it is a MetaMask error.
 *
 * Depending on the structure and type of the error object, it returns a
 * relevant error message. If the type of the error object cannot be
 * determined it returns a generic error.
 *
 * @param error - The error object to be parsed. It can be of any type.
 * @returns A string containing the error message.
 */
export const parseError = (error: unknown, abi: Abi | undefined = undefined) => {
  let message: string

  if (error instanceof Error) {
    if ('info' in error && isMetaMaskErrorInfo(error.info as MetaMaskErrorInfo)) {
      message = `Metamask Error: ${parseErrorInfo(error.info as MetaMaskErrorInfo)}`
    } else if (abi && 'shortMessage' in error) {
      return safeParse(error.shortMessage as string, abi) //parseCustomError(getCustomErrorCallData(error.shortMessage as string), abi)
    } else {
      message = error.message
    }
  } else {
    message = 'App Error: Looks like something went wrong.'
  }

  return message
}

const parseCustomError = (callData: `0x${string}` | null, abi: Abi | undefined) => {
  if (!callData || !abi) {
    return 'Contract reverted'
  }
  try {
    const parsedError = decodeErrorResult({
      abi,
      data: callData
    })
    return `${parsedError.errorName}: Contract reverted`
  } catch (e) {
    log.error('decodeErrorResult error: ', e)
    return 'Contract reverted'
  }
}

/**
 * Parses a raw error string to extract custom error call data.
 *
 * This function checks if the raw error string contains "custom error",
 * and if so, it splits the string by spaces, cleans up the last two
 * elements, and concatenates them into a single string.
 *
 * @param rawError - The raw error string to be parsed.
 * @returns A string containing the custom error call data or null if not found.
 */
function getCustomErrorCallData(rawError: string | null): `0x${string}` | null {
  if (!rawError) {
    return null
  }
  // 1. Check if string contains "custom error"
  if (!rawError.includes('custom error')) {
    return null
  }

  // 2. Split the string by space
  const parts = rawError.split(' ')

  // Ensure we have enough parts
  if (parts.length < 2) {
    return null
  }

  // Get last 2 elements
  const lastTwo = parts.slice(-2)

  // 3. Remove colon from first element and period from second
  const cleaned = lastTwo.map((part, index) => {
    if (index === 0) {
      return part.replace(':', '') // Remove colon
    } else {
      return part.replace('.', '') // Remove period
    }
  })

  // 4. Concatenate the last 2 cleaned elements
  return cleaned.join('') as `0x${string}`
}

function parseRevertReason(errorString: string): `0x${string}` | string {
  const parts = errorString.split(':').map((part) => part.trim())

  // Custom error handling
  if (parts.some((part) => part.includes('custom error'))) {
    const errorData = errorString.split('custom error')[1].trim()
    const [selector, args] = errorData.split(' ').map((part) => part.replace(/[:.]/g, ''))
    const combined = `${selector}${args}` as `0x${string}`
    if (!isHexPrefixedString(combined)) {
      throw new Error('Invalid custom error format')
    }
    return combined
  }

  // Revert message handling
  if (parts.some((part) => part.includes('revert'))) {
    const message = errorString.split('revert:')[1].trim().replace(/\.$/, '')
    return message
  }

  // Fallback
  return errorString
}

// Usage with type validation
function safeParse(errorString: string, abi: Abi | undefined) {
  const result = parseRevertReason(errorString)
  const validated = validateReturnType(result)

  switch (validated.type) {
    case 'hex':
      console.log('Custom error:', validated.data)
      return parseCustomError(validated.data, abi)
      break
    case 'string':
      console.log('Revert message:', validated.data)
      return validated.data
      break
    default:
      return 'Contract reverted'
  }

  // return validated
}

// Type guard for 0x-prefixed strings
function isHexPrefixedString(value: unknown): value is `0x${string}` {
  return typeof value === 'string' && value.startsWith('0x') && /^0x[0-9a-fA-F]+$/.test(value)
}

// Type guard for regular strings (excluding 0x-prefixed)
function isRegularString(value: unknown): value is string {
  return typeof value === 'string' && !value.startsWith('0x')
}

// Combined type checker
function validateReturnType(
  value: unknown
): { type: 'hex'; data: `0x${string}` } | { type: 'string'; data: string } | { type: 'invalid' } {
  if (isHexPrefixedString(value)) {
    return { type: 'hex', data: value }
  } else if (isRegularString(value)) {
    return { type: 'string', data: value }
  }
  return { type: 'invalid' }
}

/**
 * A type-guard function for `MetaMaskErrorInfo`.
 *
 * It checks whether an object has a structure consistent with the `info`
 * field of a MetaMask error.
 *
 * @param info - An `info` object to check. It can be of type any
 * @returns A `boolean` indicating whether the supplied object implements
 * the MetaMaskErrorInfo interface
 */
const isMetaMaskErrorInfo = (info: {
  error: { code: number; message: string }
  payload: { method: string; params: string[]; jsonrpc: string }
}): info is MetaMaskErrorInfo => {
  return (
    typeof info === 'object' &&
    info !== null &&
    'error' in info &&
    typeof info.error === 'object' &&
    typeof info.error.code === 'number' &&
    typeof info.error.message === 'string' &&
    'payload' in info &&
    typeof info.payload === 'object' &&
    typeof info.payload.method === 'string' &&
    Array.isArray(info.payload.params) &&
    info.payload.params.every((param: unknown) => typeof param === 'string') &&
    typeof info.payload.jsonrpc === 'string'
  )
}

/**
 * Parses an error info object to extract the `message` property excluding other
 * meta-data
 *
 * @param info - An info object to be parsed. Should be of MetaMaskErrorInfo
 * @returns A string containing only the message and no extra meta-data
 */
const parseErrorInfo = (info: MetaMaskErrorInfo) => {
  const A: string[] = info.error.message.split(':')

  return A[1].trim()
}
