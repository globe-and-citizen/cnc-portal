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
export const parseError = (error: any) => {
  let message: string

  if (error instanceof Error) {
    if ('info' in error && isMetaMaskErrorInfo(error.info)) {
      message = `Metamask Error: ${parseErrorInfo(error.info as MetaMaskErrorInfo)}`
    } else {
      message = error.message
    }
  } else {
    message = 'App Error: Looks like something went wrong.'
  }

  return message
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
const isMetaMaskErrorInfo = (info: any): info is MetaMaskErrorInfo => {
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
    info.payload.params.every((param: any) => typeof param === 'string') &&
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

export function getFetchErrorMessage(status: number) {
  if (!status) return 'An unknown error occurred'

  if (status >= 100 && status < 200) {
    return 'Informational response received.'
  } else if (status >= 200 && status < 300) {
    return 'Success.'
  } else if (status >= 300 && status < 400) {
    return 'Redirection message received.'
  } else if (status >= 400 && status < 500) {
    switch (status) {
      case 400:
        return 'Bad Request.'
      case 401:
        return 'Unauthorized.'
      case 403:
        return 'Forbidden.'
      case 404:
        return 'Resource Not Found.'
      default:
        return 'Client error occurred.'
    }
  } else if (status >= 500 && status < 600) {
    switch (status) {
      case 500:
        return 'Internal Server Error.'
      case 502:
        return 'Bad Gateway.'
      case 503:
        return 'Service Unavailable.'
      default:
        return 'Server error occurred.'
    }
  } else {
    return 'Unexpected error occurred.'
  }
}
