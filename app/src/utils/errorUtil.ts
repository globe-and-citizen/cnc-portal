import { type Abi, BaseError, ContractFunctionRevertedError } from 'viem'

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
    } else if (abi && error instanceof BaseError) {
      const revertError = error.walk((err) => err instanceof ContractFunctionRevertedError)

      if (revertError instanceof ContractFunctionRevertedError) {
        const errorName =
          revertError.data?.errorName === 'Error'
            ? revertError.data.args?.[0]
            : revertError.data?.errorName || 'Contract reverted'
        return `${errorName}`
      }
      return 'Contract reverted'
    } else {
      message = error.message
    }
  } else {
    message = 'App Error: Looks like something went wrong.'
  }

  return message
}

/**
 * @description Parses an Error object to extract the name and first sentence of the message
 * @param error
 * @returns Error Name + First sentence of Error Message
 */
export const parseErrorV2 = (error: Error) => {
  const message = error.message || 'Unknown error'
  const firstSentence = message.includes('.') ? message.split('.')[0] : message
  return `${error.name}: ${firstSentence}`
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

  return A[1]?.trim() ?? info.error.message.trim()
}
