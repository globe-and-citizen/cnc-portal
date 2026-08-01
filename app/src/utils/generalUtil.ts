import { formatAddress } from './format/address'

const isDevelopment = import.meta.env.MODE === 'development'
// const isVerbose = true

const getTimestamp = (): string => {
  const now = new Date()
  return `${now.toLocaleString()}`
}

export const log = {
  info: (message: string, ...args: unknown[]): void => {
    if (isDevelopment) {
      console.log(`[${getTimestamp()}] INFO: ${message}`, ...args)
      // if (isVerbose) console.trace('Trace:' )
    }
  },
  warn: (message: string, ...args: unknown[]): void => {
    if (isDevelopment) {
      console.warn(`[${getTimestamp()}] WARN: ${message}`, ...args)
    }
  },
  error: (message: string, ...args: unknown[]): void => {
    if (isDevelopment) {
      console.error(`[${getTimestamp()}] ERROR: ${message}`, ...args)
    }
  },
  debug: (message: string, ...args: unknown[]): void => {
    if (isDevelopment) {
      console.debug(`[${getTimestamp()}] DEBUG: ${message}`, ...args)
    }
  }
}

/**
 * Condenses an Error into a single log-friendly line: its name plus the first
 * sentence of its message. Lives beside `log` because that is its only use —
 * for anything a user reads, reach for `classifyError` instead.
 *
 * @returns Error Name + First sentence of Error Message
 */
export const parseErrorV2 = (error: Error) => {
  const message = error.message || 'Unknown error'
  const firstSentence = message.includes('.') ? message.split('.')[0] : message
  return `${error.name}: ${firstSentence}`
}

/**
 * @deprecated Import `formatAddress` from `@/utils/format` instead — this is
 * the same helper under an older name, kept while call sites migrate.
 */
export const shortenAddress = (address: string | undefined) => formatAddress(address)
